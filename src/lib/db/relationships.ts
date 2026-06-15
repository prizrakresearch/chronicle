"use server";

import { db } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/db/auth";

export async function linkProjects(
  projectId: string,
  relatedId: string,
  label?: string | null,
): Promise<void> {
  await requireOwner();
  if (projectId === relatedId) throw new Error("Cannot link a project to itself");
  if (label && label.trim().length > 64) throw new Error("Label must be 64 characters or fewer");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from("project_relationships") as any).upsert(
    [
      { project_id: projectId, related_id: relatedId, label: label ?? null },
      { project_id: relatedId, related_id: projectId, label: label ?? null },
    ],
    { onConflict: "project_id,related_id" },
  );
}

export async function unlinkProjects(
  projectId: string,
  relatedId: string,
): Promise<void> {
  await requireOwner();
  await db
    .from("project_relationships")
    .delete()
    .eq("project_id", projectId)
    .eq("related_id", relatedId);
  await db
    .from("project_relationships")
    .delete()
    .eq("project_id", relatedId)
    .eq("related_id", projectId);
}
