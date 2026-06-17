"use server";

import { db } from "@/lib/supabase/server";
import { getDownloadUrl, deleteObject } from "@/lib/s3/client";
import { revalidatePath } from "next/cache";
import type { ProjectStatus } from "@/lib/supabase/types";
import { requireOwner, requireAuth } from "./auth";

/** Replace logo_url with a fresh presigned URL for any row that has logo_s3_key. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveLogoUrls<T extends { logo_s3_key?: string | null; logo_url?: string | null }>(rows: T[]): Promise<T[]> {
  return Promise.all(rows.map(async (row) => {
    if (!row.logo_s3_key) return row;
    try {
      const url = await getDownloadUrl(row.logo_s3_key, 3600);
      return { ...row, logo_url: url };
    } catch {
      return row;
    }
  }));
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch all projects the current user is allowed to see.
 *   Owner  → all projects
 *   Guest  → only projects in project_shares for their Clerk ID
 */
export async function getProjects() {
  const { userId, role } = await requireAuth();
  const isOwner = role === "owner";

  const FULL_SELECT = `
    *,
    github_repos (*),
    calendar_events (*),
    project_notes (*),
    markdown_notes (*),
    credentials (*, credential_pairs (*)),
    roadmap_items (*),
    timeline_events (*),
    project_links (*),
    project_relationships!project_relationships_project_id_fkey (related_id, label)
  `;

  if (isOwner) {
    const { data, error } = await db
      .from("projects")
      .select(FULL_SELECT)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return resolveLogoUrls(data ?? []);
  }

  // Guest — only shared projects
  const { data: shares, error: shareErr } = await db
    .from("project_shares")
    .select("project_id")
    .eq("clerk_user_id", userId);

  if (shareErr) throw shareErr;
  const ids = (shares ?? []).map((s) => s.project_id);
  if (ids.length === 0) return [];

  const { data, error } = await db
    .from("projects")
    .select(FULL_SELECT)
    .in("id", ids)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return resolveLogoUrls(data ?? []);
}

export async function getProject(id: string) {
  const { userId, role } = await requireAuth();

  // Guests may only fetch projects they've been explicitly shared on.
  if (role !== "owner") {
    const { data: share } = await db
      .from("project_shares")
      .select("project_id")
      .eq("project_id", id)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (!share) throw new Error("Forbidden");
  }

  const { data, error } = await db
    .from("projects")
    .select(`
      *,
      github_repos (*),
      calendar_events (*),
      project_notes (*),
      markdown_notes (*),
      credentials (*, credential_pairs (*)),
      roadmap_items (*),
      timeline_events (*),
      project_links (*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  const [resolved] = await resolveLogoUrls([data]);
  return resolved;
}

// ── Mutations (owner only) ────────────────────────────────────────────────────

export async function createProject(input: {
  id?: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  logo_url?: string | null;
  logo_s3_key?: string | null;
}) {
  const ownerId = await requireOwner();
  const { data, error } = await db
    .from("projects")
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<{
    name: string;
    brief: string | null;
    description: string | null;
    problem_statement: string | null;
    status: ProjectStatus;
    logo_url: string | null;
    pinned: boolean;
    hidden: boolean;
    is_shared: boolean;
  }>
) {
  await requireOwner();
  if ("logo_url" in updates && updates.logo_url != null) {
    const proto = updates.logo_url.trim().toLowerCase();
    if (!proto.startsWith("https://") && !proto.startsWith("http://")) {
      throw new Error("Invalid logo URL: only http and https are allowed");
    }
  }
  const { error } = await db.from("projects").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await requireOwner();

  // Collect all S3 keys before deleting the DB rows
  const [{ data: project }, { data: files }] = await Promise.all([
    db.from("projects").select("logo_s3_key").eq("id", id).single(),
    db.from("project_files").select("storage_path").eq("project_id", id),
  ]);

  // Delete all file versions' S3 objects too
  const fileIds = (files ?? []).map((f: { storage_path: string }) => f.storage_path).filter(Boolean);
  const { data: versions } = fileIds.length
    ? await db.from("file_versions").select("storage_path").in("file_id",
        // need file IDs, re-fetch them
        (await db.from("project_files").select("id").eq("project_id", id)).data?.map((f: { id: string }) => f.id) ?? []
      )
    : { data: [] };

  // Delete from DB (cascade handles child rows)
  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw error;

  // Clean up S3 — fire and forget, don't block or fail the delete
  const s3Keys = [
    (project as { logo_s3_key?: string | null } | null)?.logo_s3_key,
    ...(files ?? []).map((f: { storage_path: string }) => f.storage_path),
    ...(versions ?? []).map((v: { storage_path: string }) => v.storage_path),
  ].filter(Boolean) as string[];

  await Promise.allSettled(s3Keys.map((k) => deleteObject(k)));

  revalidatePath("/");
}

// ── Guest visibility ──────────────────────────────────────────────────────────

export async function shareProject(projectId: string, guestClerkId: string) {
  await requireOwner();
  const { error } = await db
    .from("project_shares")
    .insert({ project_id: projectId, clerk_user_id: guestClerkId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function unshareProject(projectId: string, guestClerkId: string) {
  await requireOwner();
  const { error } = await db
    .from("project_shares")
    .delete()
    .eq("project_id", projectId)
    .eq("clerk_user_id", guestClerkId);
  if (error) throw error;
}
