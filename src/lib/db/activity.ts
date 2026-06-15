"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActivityAction =
  | "file_uploaded"
  | "file_new_version"
  | "file_trashed"
  | "file_restored"
  | "file_deleted_forever"
  | "link_added"
  | "link_trashed"
  | "link_restored";

export type ActivityEntry = {
  id: string;
  project_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: ActivityAction;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  created_at: string;
};

// ── Internal helper ────────────────────────────────────────────────────────────

async function resolveActor(): Promise<{ userId: string; name: string; role: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };

  let name = "";
  try {
    const u = await currentUser();
    if (u) {
      name =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.emailAddresses?.[0]?.emailAddress ||
        userId;
    }
  } catch {
    name = userId;
  }

  return { userId, name, role: meta.role ?? "guest" };
}

// ── Public actions ─────────────────────────────────────────────────────────────

/**
 * Fire-and-forget: call from other server actions after mutations.
 * Never throws — always swallows errors so it never blocks the main operation.
 */
export async function logActivity(
  projectId: string,
  action: ActivityAction,
  entity?: { type: "file" | "link"; id: string; name: string },
): Promise<void> {
  try {
    const actor = await resolveActor();

    // Guests must have explicit project access to log activity.
    // Prevents direct server action calls from injecting fake entries.
    if (actor.role !== "owner") {
      const { data: share } = await db
        .from("project_shares")
        .select("project_id")
        .eq("project_id", projectId)
        .eq("clerk_user_id", actor.userId)
        .maybeSingle();
      if (!share) return; // silently drop — never throw from fire-and-forget
    }

    await db
      .from("project_activity")
      .insert({
        project_id:  projectId,
        actor_id:    actor.userId,
        actor_name:  actor.name,
        actor_role:  actor.role,
        action,
        entity_type: entity?.type ?? null,
        entity_id:   entity?.id ?? null,
        entity_name: entity?.name ?? null,
      } as never);
  } catch {
    // Intentionally swallowed — activity log must never break mutations
  }
}

export async function getProjectActivity(
  projectId: string,
  limit = 60,
): Promise<ActivityEntry[]> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string; expiresAt?: string };
  if (!meta.role) throw new Error("Forbidden");
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) throw new Error("Forbidden");

  // Guests may only view activity for projects they've been explicitly shared on.
  if (meta.role !== "owner") {
    const { data: share } = await db
      .from("project_shares")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (!share) throw new Error("Forbidden");
  }

  const { data, error } = await db
    .from("project_activity")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ActivityEntry[];
}
