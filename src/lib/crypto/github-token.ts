/**
 * Server-only — AES-256-GCM helpers for GitHub PAT storage.
 * Never import from client components.
 */
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const secret = process.env.CREDENTIAL_SECRET;
  if (!secret) throw new Error("CREDENTIAL_SECRET not set");
  return createHash("sha256").update(`github-token-v1|${secret}`).digest();
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(12);
  const c   = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return `${iv.toString("hex")}:${c.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

export function decryptToken(stored: string): string {
  const key = getKey();
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid token storage format");
  const [ivHex, tagHex, encHex] = parts;
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  d.setAuthTag(Buffer.from(tagHex, "hex"));
  return d.update(Buffer.from(encHex, "hex"), undefined, "utf8") + d.final("utf8");
}
