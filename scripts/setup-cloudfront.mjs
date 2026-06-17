/**
 * One-time script: create a CloudFront distribution in front of the S3 bucket.
 *
 * What it does:
 *  1. Creates a CloudFront Origin Access Control (OAC) for the bucket
 *  2. Creates a CloudFront distribution (HTTPS, HTTP/2, US+Europe edge)
 *  3. Updates the S3 bucket policy so CloudFront OAC can read objects
 *  4. Prints the domain name to add to your .env.local and Vercel
 *
 * Usage:
 *   node --env-file=.env.local scripts/setup-cloudfront.mjs
 *
 * After running, wait ~10-15 minutes for the distribution to deploy globally,
 * then add CLOUDFRONT_DOMAIN to .env.local and Vercel env vars.
 */

import {
  CloudFrontClient,
  CreateOriginAccessControlCommand,
  CreateDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import {
  S3Client,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!region || !bucket) {
  console.error("Missing AWS_REGION or AWS_S3_BUCKET in environment.");
  process.exit(1);
}

const credentials = {
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

const cf  = new CloudFrontClient({ region: "us-east-1", credentials }); // CloudFront is global, must use us-east-1
const s3  = new S3Client({ region, credentials });
const sts = new STSClient({ region, credentials });

// ── Step 0: resolve account ID ───────────────────────────────────────────────

console.log("Fetching AWS account ID…");
const { Account: accountId } = await sts.send(new GetCallerIdentityCommand({}));
console.log(`  Account: ${accountId}`);

// ── Step 1: create Origin Access Control ─────────────────────────────────────

console.log("\nCreating CloudFront Origin Access Control…");
const oacRes = await cf.send(new CreateOriginAccessControlCommand({
  OriginAccessControlConfig: {
    Name:                          `chronicle-s3-oac-${bucket}`,
    Description:                   "Chronicle S3 read access via OAC",
    OriginAccessControlOriginType: "s3",
    SigningBehavior:               "always",
    SigningProtocol:               "sigv4",
  },
}));
const oacId = oacRes.OriginAccessControl?.Id;
console.log(`  OAC ID: ${oacId}`);

// ── Step 2: create distribution ──────────────────────────────────────────────

console.log("\nCreating CloudFront distribution (this takes ~10-15 min to deploy globally)…");
const distRes = await cf.send(new CreateDistributionCommand({
  DistributionConfig: {
    CallerReference: `chronicle-${Date.now()}`,
    Comment:         "Chronicle S3 CDN",
    Enabled:         true,
    HttpVersion:     "http2",
    // PriceClass_100 = US + Europe only (cheapest; ≈same latency for your use case)
    PriceClass:      "PriceClass_100",
    Origins: {
      Quantity: 1,
      Items: [{
        Id:         "S3Origin",
        // Must use the regional S3 endpoint for OAC to work
        DomainName: `${bucket}.s3.${region}.amazonaws.com`,
        OriginAccessControlId: oacId,
        S3OriginConfig: {
          // Empty string is required when using OAC (not legacy OAI)
          OriginAccessIdentity: "",
        },
      }],
    },
    DefaultCacheBehavior: {
      TargetOriginId:       "S3Origin",
      ViewerProtocolPolicy: "redirect-to-https",
      // AWS managed "CachingOptimized" policy
      CachePolicyId:        "658327ea-f89d-4fab-a63d-7e88639e58f6",
      AllowedMethods: {
        Quantity: 2,
        Items:    ["GET", "HEAD"],
        CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] },
      },
      Compress: true,
    },
    // No default root object — paths are always explicit S3 keys
    DefaultRootObject: "",
  },
}));

const distributionId     = distRes.Distribution?.Id;
const distributionDomain = distRes.Distribution?.DomainName;
console.log(`  Distribution ID:     ${distributionId}`);
console.log(`  Distribution domain: ${distributionDomain}`);

// ── Step 3: update S3 bucket policy ──────────────────────────────────────────

console.log("\nUpdating S3 bucket policy to allow CloudFront OAC reads…");

// Merge with existing policy if there is one
let existingStatements = [];
try {
  const existing = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
  const parsed = JSON.parse(existing.Policy ?? "{}");
  existingStatements = parsed.Statement ?? [];
} catch {
  // NoSuchBucketPolicy — fine, start fresh
}

const cfStatement = {
  Sid:       "AllowCloudFrontOACRead",
  Effect:    "Allow",
  Principal: { Service: "cloudfront.amazonaws.com" },
  Action:    "s3:GetObject",
  Resource:  `arn:aws:s3:::${bucket}/*`,
  Condition: {
    StringEquals: {
      "AWS:SourceArn": `arn:aws:cloudfront::${accountId}:distribution/${distributionId}`,
    },
  },
};

// Remove any existing statement with the same Sid before re-adding
const filteredStatements = existingStatements.filter((s) => s.Sid !== "AllowCloudFrontOACRead");

const policy = JSON.stringify({
  Version:   "2012-10-17",
  Statement: [...filteredStatements, cfStatement],
});

await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }));
console.log("  Bucket policy updated.");

// ── Done ──────────────────────────────────────────────────────────────────────

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CloudFront distribution created!
 Domain: ${distributionDomain}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wait ~10-15 minutes for global deployment, then:

1. Add to .env.local:
   CLOUDFRONT_DOMAIN=${distributionDomain}

2. Add to Vercel environment variables:
   CLOUDFRONT_DOMAIN=${distributionDomain}

3. Redeploy the app.

That's it — thumbnails and downloads will be served from the CDN.
`);
