/**
 * AWS S3 client + helpers — server-only.
 * Only import from Server Actions / Route Handlers.
 */
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION!;
const bucket = process.env.AWS_S3_BUCKET!;

if (!region || !bucket) {
  throw new Error("Missing AWS env vars: AWS_REGION and AWS_S3_BUCKET required");
}

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Build the S3 object key for a project file.
 * Pattern: {ownerId}/{projectId}/{randomId}/{filename}
 */
export function buildS3Key(ownerId: string, projectId: string, filename: string): string {
  const id = crypto.randomUUID();
  // sanitise filename — strip path separators
  const safe = filename.replace(/[/\\]/g, "_");
  return `${ownerId}/${projectId}/${id}/${safe}`;
}

/**
 * Generate a presigned PUT URL so the browser can upload directly to S3
 * without the file bytes passing through your server.
 * Expires in 5 minutes — enough for the upload to start.
 */
export async function getUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const cmd = new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: 300 });
}

/**
 * Generate a presigned GET URL for downloading / previewing a file.
 * Expires in 1 hour by default.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}

/**
 * Permanently delete an object from S3.
 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
