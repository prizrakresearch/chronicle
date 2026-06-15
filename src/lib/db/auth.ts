import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";

export async function requireAuth(): Promise<{ userId: string; role: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string; expiresAt?: string };
  if (!meta.role) throw new Error("Forbidden");
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) throw new Error("Forbidden");
  return { userId, role: meta.role };
}

export async function requireOwner(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");
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
