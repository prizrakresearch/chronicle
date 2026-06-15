"use server";

import { db } from "@/lib/supabase/server";
import { requireAuth as _requireAuth, requireOwner as _requireOwner, assertProjectAccess } from "./auth";
import { revalidatePath } from "next/cache";
import type { RoadmapStatus } from "@/lib/supabase/types";

const requireOwner = _requireOwner;
const requireAuth  = _requireAuth;

export async function getRoadmapItems(projectId: string) {
  const { userId, role } = await requireAuth();
  await assertProjectAccess(userId, role, projectId);
  const { data, error } = await db
    .from("roadmap_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addRoadmapItem(input: {
  id?: string;
  project_id: string;
  title: string;
  description?: string | null;
  status?: RoadmapStatus;
  sort_order?: number;
}) {
  await requireOwner();
  const { data, error } = await db
    .from("roadmap_items")
    .insert({ status: "planned", sort_order: 0, ...input })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/projects/${input.project_id}`);
  return data;
}

export async function updateRoadmapItem(
  id: string,
  projectId: string,
  updates: Partial<{ title: string; description: string | null; status: RoadmapStatus; sort_order: number }>
) {
  await requireOwner();
  const { error } = await db.from("roadmap_items").update(updates).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteRoadmapItem(id: string, projectId: string) {
  await requireOwner();
  const { error } = await db.from("roadmap_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

/** Persist a full reorder in one round-trip. */
export async function reorderRoadmapItems(
  items: { id: string; sort_order: number }[],
  projectId: string
) {
  await requireOwner();
  const updates = items.map(({ id, sort_order }) =>
    db.from("roadmap_items").update({ sort_order }).eq("id", id)
  );
  await Promise.all(updates);
  revalidatePath(`/projects/${projectId}`);
}
