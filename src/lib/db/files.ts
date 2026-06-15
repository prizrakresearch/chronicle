"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";
import { buildFileKey, buildLogoKey, getUploadUrl, getDownloadUrl, deleteObject } from "@/lib/s3/client";
import { revalidatePath } from "next/cache";
import type { LinkType } from "@/lib/supabase/types";

// ── Logo upload ───────────────────────────────────────────────────────────────

/**
 * Step 1: get a presigned PUT URL for uploading a project logo directly to S3.
 */
export async function requestLogoUploadUrl(
  projectId: string,
  filename: string,
  mimeType: string,
): Promise<{ uploadUrl: string; s3Key: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");

  const key  = buildLogoKey(userId, projectId, filename);
  const url  = await getUploadUrl(key, mimeType);
  return { uploadUrl: url, s3Key: key };
}

/**
 * Step 2: save the S3 key after the upload completes.
 * Returns a fresh 1-hour presigned GET URL for immediate display.
 */
export async function saveProjectLogoKey(
  projectId: string,
  s3Key: string,
): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");

  const { error } = await db
    .from("projects")
    .update({ logo_s3_key: s3Key, logo_url: null })
    .eq("id", projectId);
  if (error) throw error;

  revalidatePath(`/projects/${projectId}`);
  return getDownloadUrl(s3Key, 3600);
}

async function requireOwner() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");
  return userId;
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function getFolders(projectId: string) {
  const { data, error } = await db
    .from("folders")
    .select("*")
    .eq("project_id", projectId);
  if (error) throw error;
  return data ?? [];
}

export async function createFolder(projectId: string, name: string) {
  await requireOwner();
  const { data, error } = await db
    .from("folders")
    .insert({ project_id: projectId, name })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  return data;
}

export async function renameFolder(id: string, projectId: string, name: string) {
  await requireOwner();
  const { error } = await db.from("folders").update({ name }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteFolder(id: string, projectId: string) {
  await requireOwner();
  // Files/links inside become folder_id = null (ON DELETE SET NULL)
  const { error } = await db.from("folders").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ── Links ─────────────────────────────────────────────────────────────────────

export async function getLinks(projectId: string) {
  const { data, error } = await db
    .from("project_links")
    .select("*")
    .eq("project_id", projectId);
  if (error) throw error;
  return data ?? [];
}

export async function addLink(input: {
  id?: string;
  project_id: string;
  title: string;
  url: string;
  type: LinkType;
  folder_id?: string | null;
  tags?: string[];
}) {
  await requireOwner();
  const { data, error } = await db
    .from("project_links")
    .insert({ tags: [], folder_id: null, ...input })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${input.project_id}`);
  return data;
}

export async function updateLink(
  id: string,
  projectId: string,
  updates: Partial<{ title: string; url: string; type: LinkType; folder_id: string | null; tags: string[] }>
) {
  await requireOwner();
  const { error } = await db.from("project_links").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteLink(id: string, projectId: string) {
  await requireOwner();
  const { error } = await db.from("project_links").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ── Files ─────────────────────────────────────────────────────────────────────

export async function getProjectFiles(projectId: string) {
  const { data, error } = await db
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Step 1 of a file upload: generate a presigned S3 PUT URL.
 * The client receives this URL and uploads the bytes directly to S3,
 * then calls saveProjectFile() with the resulting s3Key.
 */
export async function requestUploadUrl(input: {
  project_id: string;
  filename: string;
  mime_type: string;
}) {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");

  const key = buildFileKey(userId, input.project_id, input.filename);
  const url = await getUploadUrl(key, input.mime_type);
  return { uploadUrl: url, s3Key: key };
}

/**
 * Fetch all project files for a list of project IDs and attach
 * a short-lived (1-hour) presigned GET URL to each one.
 * Used by the client context to populate the files panel on page load.
 */
export async function getProjectFilesWithUrls(projectIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  if (projectIds.length === 0) return [];

  const { data, error } = await db
    .from("project_files")
    .select("*")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Generate presigned GET URLs in parallel — getSignedUrl is CPU-only, no S3 network call
  return Promise.all(
    (data ?? []).map(async (f) => ({
      ...f,
      presigned_url: await getDownloadUrl(f.storage_path),
    }))
  );
}

/**
 * Step 2 of a file upload: save metadata to Supabase after S3 upload succeeds.
 */
export async function saveProjectFile(input: {
  project_id: string;
  name: string;
  mime_type: string;
  size: number;
  s3_key: string;
  folder_id?: string | null;
  tags?: string[];
}) {
  await requireOwner();
  const { data, error } = await db
    .from("project_files")
    .insert({
      project_id:   input.project_id,
      name:         input.name,
      mime_type:    input.mime_type,
      size:         input.size,
      storage_path: input.s3_key,
      folder_id:    input.folder_id ?? null,
      tags:         input.tags ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${input.project_id}`);
  return data;
}

/**
 * Get a short-lived presigned GET URL for a file (1 hour).
 * Call this whenever you need to render/download a file.
 */
export async function getFileUrl(s3Key: string): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  return getDownloadUrl(s3Key);
}

export async function updateProjectFile(
  id: string,
  projectId: string,
  updates: Partial<{ folder_id: string | null; tags: string[]; name: string }>
) {
  await requireOwner();
  const { error } = await db.from("project_files").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectFile(id: string, projectId: string, s3Key: string) {
  await requireOwner();
  // Delete bytes from S3 first, then remove the metadata row from Supabase
  await deleteObject(s3Key);
  const { error } = await db.from("project_files").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ── Calendar events ───────────────────────────────────────────────────────────

export async function getCalendarEvents(projectId: string) {
  const { data, error } = await db
    .from("calendar_events")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addCalendarEvent(input: {
  id?: string;
  project_id: string;
  date: string;
  title: string;
}) {
  await requireOwner();
  const { data, error } = await db
    .from("calendar_events")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${input.project_id}`);
  return data;
}

export async function toggleCalendarEvent(id: string, projectId: string, completed: boolean) {
  await requireOwner();
  const { error } = await db.from("calendar_events").update({ completed }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteCalendarEvent(id: string, projectId: string) {
  await requireOwner();
  const { error } = await db.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}
