"use server";

import { auth } from "@clerk/nextjs/server";

/**
 * Returns CREDENTIAL_SECRET to the authenticated owner so the client can
 * derive AES keys for credential encryption/decryption.
 *
 * The secret is a server-only env var (no NEXT_PUBLIC_ prefix) so it never
 * appears in the JS bundle. This action is the only authorised channel for
 * the owner to receive it — guests are blocked at the role check.
 */
export async function getCredentialSecret(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");
  const secret = process.env.CREDENTIAL_SECRET;
  if (!secret) throw new Error("CREDENTIAL_SECRET not configured");
  return secret;
}
