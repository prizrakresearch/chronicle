"use server";

import { db } from "@/lib/supabase/server";
import { requireAuth, requireOwner, assertProjectAccess } from "./auth";
import { buildFileKey, buildLogoKey, getUploadUrl, getDownloadUrl, deleteObject } from "@/lib/s3/client";
import { revalidatePath } from "next/cache";
import type { LinkType } from "@/lib/supabase/types";
import { logActivity } from "./activity";

// ── Logo upload ───────────────────────────────────────────────────────────────

/**
 * Step 1: get a presigned PUT URL for uploading a project logo directly to S3.
 */
export async function requestLogoUploadUrl(
  projectId: string,
  filename: string,
  mimeType: string,
): Promise<{ uploadUrl: string; s3Key: string }> {
  const userId = await requireOwner();
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
  await requireOwner();

  // Fetch old key before overwriting so we can clean it up
  const { data: existing } = await db
    .from("projects")
    .select("logo_s3_key")
    .eq("id", projectId)
    .single();

  const { error } = await db
    .from("projects")
    .update({ logo_s3_key: s3Key, logo_url: null })
    .eq("id", projectId);
  if (error) throw error;

  // Delete old logo from S3 if it existed
  const oldKey = (existing as { logo_s3_key?: string | null } | null)?.logo_s3_key;
  if (oldKey && oldKey !== s3Key) deleteObject(oldKey).catch(() => {});

  revalidatePath(`/projects/${projectId}`);
  return getDownloadUrl(s3Key, 3600);
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function getFolders(projectId: string) {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
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
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
  const { data, error } = await db
    .from("project_links")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  if (error) throw error;
  return data ?? [];
}

function assertSafeUrl(url: string) {
  const proto = url.trim().toLowerCase();
  if (!proto.startsWith("https://") && !proto.startsWith("http://")) {
    throw new Error("Invalid URL: only http and https are allowed");
  }
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
  assertSafeUrl(input.url);
  const { data, error } = await db
    .from("project_links")
    .insert({ tags: [], folder_id: null, ...input })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${input.project_id}`);
  logActivity(input.project_id, "link_added", { type: "link", id: data.id, name: input.title }).catch(() => {});
  return data;
}

export async function updateLink(
  id: string,
  projectId: string,
  updates: Partial<{ title: string; url: string; type: LinkType; folder_id: string | null; tags: string[] }>
) {
  await requireOwner();
  if (updates.url !== undefined) assertSafeUrl(updates.url);
  const { error } = await db.from("project_links").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteLink(id: string, projectId: string) {
  await requireOwner();
  const { data: link } = await db.from("project_links").select("title").eq("id", id).single();
  const { error } = await db.from("project_links").update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  logActivity(projectId, "link_trashed", { type: "link", id, name: link?.title ?? "" }).catch(() => {});
}

export async function restoreLink(id: string, projectId: string) {
  await requireOwner();
  const { data: link } = await db.from("project_links").select("title").eq("id", id).single();
  const { error } = await db.from("project_links").update({ deleted_at: null } as never).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  logActivity(projectId, "link_restored", { type: "link", id, name: link?.title ?? "" }).catch(() => {});
}

export async function permanentDeleteLink(id: string, projectId: string) {
  await requireOwner();
  const { error } = await db.from("project_links").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ── Files ─────────────────────────────────────────────────────────────────────

export async function getProjectFiles(projectId: string) {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
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
  const userId = await requireOwner();
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
  const { userId, role } = await requireAuth();
  if (projectIds.length === 0) return [];

  // Guests: filter input to only projects they have explicit access to.
  let allowedIds = projectIds;
  if (role !== "owner") {
    const { data: shares } = await db
      .from("project_shares")
      .select("project_id")
      .eq("clerk_user_id", userId)
      .in("project_id", projectIds);
    const shareSet = new Set((shares ?? []).map((s) => s.project_id));
    allowedIds = projectIds.filter((id) => shareSet.has(id));
    if (allowedIds.length === 0) return [];
  }

  const { data, error } = await db
    .from("project_files")
    .select("*")
    .in("project_id", allowedIds)
    .is("deleted_at", null)
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
  logActivity(input.project_id, "file_uploaded", { type: "file", id: data.id, name: input.name }).catch(() => {});
  return data;
}

/**
 * Get a short-lived presigned GET URL for a file (1 hour).
 * Call this whenever you need to render/download a file.
 */
export async function getFileUrl(s3Key: string): Promise<string> {
  const { userId, role } = await requireAuth();
  // Verify the key belongs to a project the user can access
  const { data: fileRow } = await db
    .from("project_files")
    .select("project_id")
    .eq("storage_path", s3Key)
    .is("deleted_at", null)
    .maybeSingle();
  if (!fileRow) throw new Error("Forbidden");
  await assertProjectAccess(userId, role, fileRow.project_id as string);
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

export async function deleteProjectFile(id: string, projectId: string) {
  await requireOwner();
  const { data: f } = await db.from("project_files").select("name").eq("id", id).single();
  const { error } = await db.from("project_files").update({ deleted_at: new Date().toISOString() } as never).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  logActivity(projectId, "file_trashed", { type: "file", id, name: f?.name ?? "" }).catch(() => {});
}

export async function restoreFile(id: string, projectId: string) {
  await requireOwner();
  const { data: f } = await db.from("project_files").select("name").eq("id", id).single();
  const { error } = await db.from("project_files").update({ deleted_at: null } as never).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  logActivity(projectId, "file_restored", { type: "file", id, name: f?.name ?? "" }).catch(() => {});
}

export async function permanentDeleteFile(id: string, projectId: string, s3Key: string) {
  await requireOwner();
  const { data: f } = await db.from("project_files").select("name").eq("id", id).single();
  if (s3Key) await deleteObject(s3Key);
  // Also delete old version S3 objects
  const { data: versions } = await db.from("file_versions").select("storage_path").eq("file_id", id);
  await Promise.all((versions ?? []).map((v) => deleteObject((v as { storage_path: string }).storage_path).catch(() => {})));
  const { error } = await db.from("project_files").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  logActivity(projectId, "file_deleted_forever", { type: "file", id, name: f?.name ?? "" }).catch(() => {});
}

// ── File version history ──────────────────────────────────────────────────────

/** Returns the existing file record if a file with this name exists in the project. */
export async function checkFilenameConflict(
  projectId: string,
  filename: string,
): Promise<{ id: string; name: string; version_number: number; storage_path: string; size: number } | null> {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
  const { data } = await db
    .from("project_files")
    .select("id, name, storage_path, size")
    .eq("project_id", projectId)
    .eq("name", filename)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; name: string; storage_path: string; size: number; version_number?: number };
  return { ...row, version_number: row.version_number ?? 1 };
}

/**
 * Archives the current file state as a historical version, then updates
 * project_files to point at the new S3 object and increments version_number.
 */
export async function saveAsNewVersion(
  fileId: string,
  projectId: string,
  newS3Key: string,
  newSize: number,
): Promise<number> {
  await requireOwner();

  // Fetch current state to archive it
  const { data: current, error: fetchErr } = await db
    .from("project_files")
    .select("name, storage_path, size")
    .eq("id", fileId)
    .single();
  if (fetchErr || !current) throw fetchErr ?? new Error("File not found");

  const cur = current as { name: string; storage_path: string; size: number; version_number?: number };
  const prevVersion = cur.version_number ?? 1;

  // Archive the current version
  await db.from("file_versions").insert({
    file_id:        fileId,
    version_number: prevVersion,
    storage_path:   cur.storage_path,
    size:           cur.size,
    name:           cur.name,
  } as never);

  const newVersion = prevVersion + 1;

  // Update the main file record
  const { error: updateErr } = await db
    .from("project_files")
    .update({ storage_path: newS3Key, size: newSize, version_number: newVersion } as never)
    .eq("id", fileId);
  if (updateErr) throw updateErr;

  revalidatePath(`/projects/${projectId}`);
  logActivity(projectId, "file_new_version", { type: "file", id: fileId, name: cur.name }).catch(() => {});
  return newVersion;
}

export type FileVersionRow = {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  size: number;
  name: string;
  uploaded_at: string;
  presigned_url: string;
};

export async function getFileVersions(fileId: string): Promise<FileVersionRow[]> {
  const { userId, role } = await requireAuth();
  // Resolve the file's project so we can check share access
  const { data: fileRow } = await db
    .from("project_files")
    .select("project_id")
    .eq("id", fileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!fileRow) throw new Error("Forbidden");
  await assertProjectAccess(userId, role, fileRow.project_id as string);

  const { data, error } = await db
    .from("file_versions")
    .select("*")
    .eq("file_id", fileId)
    .order("version_number", { ascending: false });
  if (error) throw error;

  return Promise.all(
    ((data ?? []) as unknown as Omit<FileVersionRow, "presigned_url">[]).map(async (v) => ({
      ...v,
      presigned_url: await getDownloadUrl(v.storage_path),
    })),
  );
}

/**
 * Swaps the current file state with a historical version.
 * Archives the current before overwriting so nothing is lost.
 */
export async function restoreFileVersion(
  fileId: string,
  projectId: string,
  versionId: string,
): Promise<void> {
  await requireOwner();

  const { data: versionRow, error: vErr } = await db
    .from("file_versions")
    .select("*")
    .eq("id", versionId)
    .single();
  if (vErr || !versionRow) throw vErr ?? new Error("Version not found");
  const vRow = versionRow as unknown as Omit<FileVersionRow, "presigned_url">;

  // Archive current version first (same as saveAsNewVersion)
  const { data: current } = await db
    .from("project_files")
    .select("name, storage_path, size")
    .eq("id", fileId)
    .single();
  if (current) {
    const cur = current as { name: string; storage_path: string; size: number; version_number?: number };
    await db.from("file_versions").insert({
      file_id:        fileId,
      version_number: cur.version_number ?? 1,
      storage_path:   cur.storage_path,
      size:           cur.size,
      name:           cur.name,
    } as never);
  }

  // Restore the selected version into project_files
  const { error: updateErr } = await db
    .from("project_files")
    .update({
      storage_path:   vRow.storage_path,
      size:           vRow.size,
      version_number: vRow.version_number,
    } as never)
    .eq("id", fileId);
  if (updateErr) throw updateErr;

  // Remove the restored version from the history (it's now current)
  await db.from("file_versions").delete().eq("id", versionId);

  revalidatePath(`/projects/${projectId}`);
}

// ── Trash ─────────────────────────────────────────────────────────────────────

export async function getTrashedItems(projectId: string) {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);

  const [filesRes, linksRes] = await Promise.all([
    db.from("project_files").select("*").eq("project_id", projectId)
      .not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    db.from("project_links").select("*").eq("project_id", projectId)
      .not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
  ]);
  if (filesRes.error) throw filesRes.error;
  if (linksRes.error) throw linksRes.error;

  const files = await Promise.all(
    (filesRes.data ?? []).map(async (f) => ({
      ...f,
      presigned_url: f.storage_path ? await getDownloadUrl(f.storage_path) : null,
    }))
  );
  return { files, links: linksRes.data ?? [] };
}

// ── Calendar events ───────────────────────────────────────────────────────────

export async function getCalendarEvents(projectId: string) {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
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
