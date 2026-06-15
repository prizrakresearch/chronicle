"use server";

import { db } from "@/lib/supabase/server";
import { requireAuth as _requireAuth, requireOwner as _requireOwner, assertProjectAccess } from "./auth";
import { revalidatePath } from "next/cache";
import type { EventType } from "@/lib/supabase/types";

const requireOwner = _requireOwner;
const requireAuth  = _requireAuth;

// ── Markdown notes ────────────────────────────────────────────────────────────

export async function getMarkdownNotes(projectId: string) {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
  const { data, error } = await db
    .from("markdown_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMarkdownNote(
  projectId: string,
  opts?: { id?: string; title?: string; content?: string }
) {
  await requireOwner();
  const { data, error } = await db
    .from("markdown_notes")
    .insert({
      ...(opts?.id ? { id: opts.id } : {}),
      project_id: projectId,
      title:   opts?.title   ?? "Untitled",
      content: opts?.content ?? "",
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  return data;
}

export async function updateMarkdownNote(
  id: string,
  projectId: string,
  updates: Partial<{ title: string; content: string }>
) {
  await requireOwner();
  const { error } = await db.from("markdown_notes").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteMarkdownNote(id: string, projectId: string) {
  await requireOwner();
  const { error } = await db.from("markdown_notes").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ── Short project notes (overview sticky notes) ───────────────────────────────

export async function addProjectNote(projectId: string, content: string, id?: string) {
  await requireOwner();
  const { data, error } = await db
    .from("project_notes")
    .insert({ ...(id ? { id } : {}), project_id: projectId, content })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
  return data;
}

export async function deleteProjectNote(id: string, projectId: string) {
  await requireOwner();
  const { error } = await db.from("project_notes").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

// ── Timeline events ───────────────────────────────────────────────────────────

export async function getTimeline(projectId: string) {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
  const { data, error } = await db
    .from("timeline_events")
    .select("*")
    .eq("project_id", projectId)
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addTimelineEvent(input: {
  id?: string;
  project_id: string;
  type: EventType;
  title: string;
  body?: string | null;
  event_date?: string;
  metadata?: { sha?: string; url?: string; authorName?: string } | null;
}) {
  await requireOwner();
  const { data, error } = await db
    .from("timeline_events")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${input.project_id}`);
  return data;
}

export async function deleteTimelineEvent(id: string, projectId: string) {
  await requireOwner();
  const { error } = await db.from("timeline_events").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}
