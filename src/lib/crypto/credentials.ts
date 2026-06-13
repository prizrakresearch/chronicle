/**
 * AES-256-GCM encryption for credential values.
 *
 * Encrypt before sending to the server; decrypt after fetching.
 * The key is derived from:
 *   - ownerClerkId   — unique per user, available client-side
 *   - CREDENTIAL_SECRET — server secret in .env.local, passed to the
 *     client only during the derivation step (never exposed raw)
 *
 * Storage format (base64-encoded, comma-separated):
 *   "<iv_base64>,<ciphertext_base64>"
 */

const ALGO = "AES-GCM";
const KEY_ALGO = "AES-CBC"; // used for PBKDF2 → AES-GCM wrapping
const ITERATIONS = 100_000;

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Derive a CryptoKey from the owner ID + server secret.
 * Call this once per session and cache the result.
 */
export async function deriveKey(ownerClerkId: string, serverSecret: string): Promise<CryptoKey> {
  const enc     = new TextEncoder();
  const keyMat  = await crypto.subtle.importKey(
    "raw",
    enc.encode(ownerClerkId + "|" + serverSecret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name:       "PBKDF2",
      salt:       enc.encode("chronicle-credentials-v1"),
      iterations: ITERATIONS,
      hash:       "SHA-256",
    },
    keyMat,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt a plaintext value. Returns "<iv_b64>,<cipher_b64>". */
export async function encryptValue(plaintext: string, key: CryptoKey): Promise<string> {
  const iv     = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const enc    = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(plaintext)
  );
  return `${bytesToB64(iv)},${bytesToB64(new Uint8Array(cipher))}`;
}

/** Decrypt a value produced by encryptValue. Returns the original plaintext. */
export async function decryptValue(stored: string, key: CryptoKey): Promise<string> {
  const [ivB64, cipherB64] = stored.split(",");
  if (!ivB64 || !cipherB64) throw new Error("Invalid encrypted value format");

  const plain = await crypto.subtle.decrypt(
    { name: ALGO, iv: b64ToBytes(ivB64) as unknown as BufferSource },
    key,
    b64ToBytes(cipherB64) as unknown as BufferSource
  );
  return new TextDecoder().decode(plain);
}

/**
 * Convenience: encrypt every value in a pairs array.
 * Pass this before sending credentials to a Server Action.
 */
export async function encryptPairs(
  pairs: { key: string; value: string }[],
  key: CryptoKey
): Promise<{ key: string; value: string }[]> {
  return Promise.all(
    pairs.map(async (p) => ({ key: p.key, value: await encryptValue(p.value, key) }))
  );
}

/**
 * Convenience: decrypt every value in a pairs array.
 * Call this after fetching credentials from the server.
 */
export async function decryptPairs(
  pairs: { key: string; value: string }[],
  key: CryptoKey
): Promise<{ key: string; value: string }[]> {
  return Promise.all(
    pairs.map(async (p) => ({ key: p.key, value: await decryptValue(p.value, key) }))
  );
}
