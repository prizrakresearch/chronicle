import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";

async function getClerkPublicMeta(userId: string): Promise<{ role?: string; expiresAt?: string }> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.publicMetadata as { role?: string; expiresAt?: string };
}

export async function requireAuth(): Promise<{ userId: string; role: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string; expiresAt?: string };

  let role = meta.role;
  let expiresAt = meta.expiresAt;

  // JWT may be stale or missing the custom "metadata" claim — fall back to Clerk API
  if (!role) {
    const pub = await getClerkPublicMeta(userId);
    role = pub.role;
    expiresAt = expiresAt ?? pub.expiresAt;
  }

  if (!role) throw new Error("Forbidden");
  if (expiresAt && new Date(expiresAt) < new Date()) throw new Error("Forbidden");
  return { userId, role };
}

export async function requireOwner(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };

  let role = meta.role;

  // JWT may be stale or missing the custom "metadata" claim — fall back to Clerk API
  if (role !== "owner") {
    const pub = await getClerkPublicMeta(userId);
    role = pub.role;
  }

  if (role !== "owner") throw new Error("Forbidden");
  return userId;
}

/**
 * Owners pass immediately. Guests must have an explicit project_shares row.
 * Throws "Forbidden" if a guest tries to access a project they haven't been shared on.
 */
export async function assertProjectAccess(
  userId: string,
  role: string,
  projectId: string,
): Promise<void> {
  if (role === "owner") return;
  const { data } = await db
    .from("project_shares")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}
