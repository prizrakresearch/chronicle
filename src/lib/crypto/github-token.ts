/**
 * Server-only — AES-256-GCM helpers for GitHub PAT storage.
 * Never import from client components.
 *
 * Storage formats:
 *   v2:<saltHex>:<ivHex>:<tagHex>:<cipherHex>  — PBKDF2-SHA-256 key derivation (current)
 *   <ivHex>:<tagHex>:<cipherHex>               — SHA-256 key derivation (legacy, read-only)
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { pbkdf2 as pbkdf2Cb } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Cb);

const ITERATIONS = 210_000; // matches credential encryption (OWASP 2024)
const KEYLEN     = 32;
const DIGEST     = "sha256";

function getSecret(): string {
  const s = process.env.CREDENTIAL_SECRET;
  if (!s) throw new Error("CREDENTIAL_SECRET not set");
  return s;
}

async function deriveKey(salt: Buffer): Promise<Buffer> {
  return pbkdf2(`github-token-v2|${getSecret()}`, salt, ITERATIONS, KEYLEN, DIGEST);
}

function legacyKey(): Buffer {
  return createHash("sha256").update(`github-token-v1|${getSecret()}`).digest();
}

export async function encryptToken(plaintext: string): Promise<string> {
  const salt = randomBytes(16);
  const key  = await deriveKey(salt);
  const iv   = randomBytes(12);
  const c    = createCipheriv("aes-256-gcm", key, iv);
  const enc  = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return `v2:${salt.toString("hex")}:${iv.toString("hex")}:${c.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

export async function decryptToken(stored: string): Promise<string> {
  if (stored.startsWith("v2:")) {
    const parts = stored.slice(3).split(":");
    if (parts.length !== 4) throw new Error("Invalid v2 token format");
    const [saltHex, ivHex, tagHex, encHex] = parts;
    const key = await deriveKey(Buffer.from(saltHex, "hex"));
    const d   = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    d.setAuthTag(Buffer.from(tagHex, "hex"));
    return d.update(Buffer.from(encHex, "hex"), undefined, "utf8") + d.final("utf8");
  }

  // Legacy v1: <ivHex>:<tagHex>:<cipherHex> — SHA-256 derived key
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid token storage format");
  const [ivHex, tagHex, encHex] = parts;
  const key = legacyKey();
  const d   = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  d.setAuthTag(Buffer.from(tagHex, "hex"));
  return d.update(Buffer.from(encHex, "hex"), undefined, "utf8") + d.final("utf8");
}
