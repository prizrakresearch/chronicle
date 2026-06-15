/**
 * AES-256-GCM encryption for credential pair values.
 *
 * Design:
 *   - Every call to encryptValue generates a fresh 16-byte PBKDF2 salt AND a
 *     fresh 12-byte AES-GCM IV, so two encryptions of the same plaintext
 *     produce completely different ciphertexts.
 *   - The AES key is derived from (ownerClerkId + CREDENTIAL_SECRET) using
 *     that per-value salt, meaning there is no shared key across values.
 *   - CREDENTIAL_SECRET is a server-only env var returned to the owner by a
 *     server action — it never appears in the JS bundle.
 *
 * Storage format (base64 values):
 *   "v2:<salt_b64>:<iv_b64>,<cipher_b64>"
 *
 * Legacy: any stored value that does NOT start with "v2:" was never encrypted
 * (plaintext from before this was wired up). decryptValue passes it through
 * as-is so the UI keeps working; it will be re-encrypted on the next save.
 */

const ALGO       = "AES-GCM";
const ITERATIONS = 210_000; // OWASP 2024 recommendation for PBKDF2-SHA-256

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function deriveKeyWithSalt(
  ownerClerkId: string,
  serverSecret: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc    = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    "raw",
    enc.encode(ownerClerkId + "|" + serverSecret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    keyMat,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a single value. Returns "v2:<salt_b64>:<iv_b64>,<cipher_b64>".
 * Generates a fresh random salt and IV on every call.
 */
export async function encryptValue(
  plaintext:     string,
  ownerClerkId:  string,
  serverSecret:  string,
): Promise<string> {
  const salt   = crypto.getRandomValues(new Uint8Array(16));
  const iv     = crypto.getRandomValues(new Uint8Array(12));
  const key    = await deriveKeyWithSalt(ownerClerkId, serverSecret, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `v2:${bytesToB64(salt)}:${bytesToB64(iv)},${bytesToB64(new Uint8Array(cipher))}`;
}

/**
 * Decrypt a value produced by encryptValue.
 * Legacy plaintext values (no "v2:" prefix) are passed through unchanged
 * so existing unencrypted credentials keep displaying until re-saved.
 */
export async function decryptValue(
  stored:        string,
  ownerClerkId:  string,
  serverSecret:  string,
): Promise<string> {
  if (!stored.startsWith("v2:")) return stored; // legacy plaintext — pass through

  const rest    = stored.slice(3);              // strip "v2:"
  const colon   = rest.indexOf(":");
  if (colon === -1) throw new Error("Invalid encrypted format");

  const saltB64 = rest.slice(0, colon);
  const rest2   = rest.slice(colon + 1);
  const comma   = rest2.indexOf(",");
  if (comma === -1) throw new Error("Invalid encrypted format");

  const ivB64     = rest2.slice(0, comma);
  const cipherB64 = rest2.slice(comma + 1);

  const key   = await deriveKeyWithSalt(ownerClerkId, serverSecret, b64ToBytes(saltB64));
  const plain = await crypto.subtle.decrypt(
    { name: ALGO, iv: b64ToBytes(ivB64) as unknown as BufferSource },
    key,
    b64ToBytes(cipherB64) as unknown as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

/** Encrypt every value in a pairs array before sending to the server. */
export async function encryptPairs(
  pairs:         { key: string; value: string }[],
  ownerClerkId:  string,
  serverSecret:  string,
): Promise<{ key: string; value: string }[]> {
  return Promise.all(
    pairs.map(async (p) => ({
      key:   p.key,
      value: await encryptValue(p.value, ownerClerkId, serverSecret),
    })),
  );
}

/** Decrypt every value in a pairs array after receiving from the server. */
export async function decryptPairs(
  pairs:         { key: string; value: string }[],
  ownerClerkId:  string,
  serverSecret:  string,
): Promise<{ key: string; value: string }[]> {
  return Promise.all(
    pairs.map(async (p) => ({
      key:   p.key,
      value: await decryptValue(p.value, ownerClerkId, serverSecret),
    })),
  );
}
