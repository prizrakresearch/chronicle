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

// ── S3 Key Schema ────────────────────────────────────────────────────────────
//
// All keys follow the pattern:  {type}/{ownerId}/...
//
//   logos/   {ownerId}/{projectId}/{uuid}/{filename}   → project logos
//   files/   {ownerId}/{projectId}/{uuid}/{filename}   → file-panel uploads
//   notes/   {ownerId}/{projectId}/{noteId}/{uuid}/{filename}  → note attachments (future)
//   exports/ {ownerId}/{projectId}/{uuid}/report.pdf   → generated exports (future)
//
// Rationale:
//   • Type-first enables per-prefix IAM policies and S3 lifecycle rules
//   • UUID before filename prevents collisions and hotspot sharding
//   • ownerId + projectId allow bulk-delete on project/user removal
// ─────────────────────────────────────────────────────────────────────────────

function safeName(filename: string): string {
  return filename.replace(/[/\\]/g, "_");
}

/** Key for a project logo.  Pattern: logos/{ownerId}/{projectId}/{uuid}/{filename} */
export function buildLogoKey(ownerId: string, projectId: string, filename: string): string {
  return `logos/${ownerId}/${projectId}/${crypto.randomUUID()}/${safeName(filename)}`;
}

/** Key for a file-panel upload.  Pattern: files/{ownerId}/{projectId}/{uuid}/{filename} */
export function buildFileKey(ownerId: string, projectId: string, filename: string): string {
  return `files/${ownerId}/${projectId}/${crypto.randomUUID()}/${safeName(filename)}`;
}

/** Key for an attachment inside a markdown note.  Pattern: notes/{ownerId}/{projectId}/{noteId}/{uuid}/{filename} */
export function buildNoteAttachmentKey(ownerId: string, projectId: string, noteId: string, filename: string): string {
  return `notes/${ownerId}/${projectId}/${noteId}/${crypto.randomUUID()}/${safeName(filename)}`;
}

/** Key for a generated export (PDF, CSV, etc.).  Pattern: exports/{ownerId}/{projectId}/{uuid}/{filename} */
export function buildExportKey(ownerId: string, projectId: string, filename: string): string {
  return `exports/${ownerId}/${projectId}/${crypto.randomUUID()}/${safeName(filename)}`;
}

/**
 * @deprecated Use buildFileKey instead.
 * Kept temporarily so any direct callers don't break during the migration.
 */
export function buildS3Key(ownerId: string, projectId: string, filename: string): string {
  return buildFileKey(ownerId, projectId, filename);
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
