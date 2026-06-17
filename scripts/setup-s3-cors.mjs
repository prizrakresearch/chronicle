/**
 * One-time script: apply CORS policy to the S3 bucket so browser
 * presigned-URL uploads work from all Chronicle deployment origins.
 *
 * Usage:
 *   node -r dotenv/config scripts/setup-s3-cors.mjs
 *   # or if dotenv isn't available globally:
 *   node --env-file=.env.local scripts/setup-s3-cors.mjs
 */

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!region || !bucket) {
  console.error("Missing AWS_REGION or AWS_S3_BUCKET in environment.");
  process.exit(1);
}

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Allow uploads from all Chronicle deployment origins:
//   - local dev
//   - Vercel preview deployments (*.vercel.app)
//   - production domain (update this if you add a custom domain)
const corsConfig = {
  CORSRules: [
    {
      AllowedOrigins: [
        "http://localhost:3000",
        "https://*.vercel.app",
      ],
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["Content-Type", "Content-Length", "x-amz-*"],
      ExposeHeaders:  ["ETag"],
      MaxAgeSeconds:  3600,
    },
  ],
};

console.log(`Applying CORS to bucket: ${bucket} (${region})`);
console.log("Policy:", JSON.stringify(corsConfig, null, 2));

try {
  await s3.send(new PutBucketCorsCommand({
    Bucket:            bucket,
    CORSConfiguration: corsConfig,
  }));
  console.log("\nCORS applied successfully.");

  // Verify
  const result = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("\nVerification — active CORS rules:");
  console.log(JSON.stringify(result.CORSRules, null, 2));
} catch (err) {
  console.error("Failed to apply CORS:", err.message);
  process.exit(1);
}
