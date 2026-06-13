"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireOwner() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");
  return userId;
}

/**
 * Fetch all credentials + their encrypted pairs for a project.
 * The client decrypts each pair.value after receiving them.
 */
export async function getCredentials(projectId: string) {
  const { data, error } = await db
    .from("credentials")
    .select("*, credential_pairs (*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Create a credential group with pre-encrypted pairs.
 * The client must encrypt pair values BEFORE calling this.
 */
export async function createCredential(input: {
  id?: string;
  project_id: string;
  title: string;
  pairs: { key: string; value: string }[];
}) {
  await requireOwner();

  const { data: cred, error: credErr } = await db
    .from("credentials")
    .insert({ ...(input.id ? { id: input.id } : {}), project_id: input.project_id, title: input.title })
    .select()
    .single();
  if (credErr) throw credErr;

  if (input.pairs.length > 0) {
    const { error: pairsErr } = await db.from("credential_pairs").insert(
      input.pairs.map((p, i) => ({
        credential_id: cred.id,
        key:        p.key,
        value:      p.value,
        sort_order: i,
      }))
    );
    if (pairsErr) throw pairsErr;
  }

  revalidatePath(`/projects/${input.project_id}`);
  return cred;
}

export async function updateCredentialTitle(id: string, projectId: string, title: string) {
  await requireOwner();
  const { error } = await db.from("credentials").update({ title }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}

/** Replace all pairs for a credential (delete then re-insert). */
export async function replaceCredentialPairs(
  credentialId: string,
  projectId: string,
  pairs: { key: string; value: string }[] // values already encrypted
) {
  await requireOwner();
  const { error: delErr } = await db
    .from("credential_pairs")
    .delete()
    .eq("credential_id", credentialId);
  if (delErr) throw delErr;

  if (pairs.length > 0) {
    const { error: insErr } = await db.from("credential_pairs").insert(
      pairs.map((p, i) => ({
        credential_id: credentialId,
        key:        p.key,
        value:      p.value,
        sort_order: i,
      }))
    );
    if (insErr) throw insErr;
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteCredential(id: string, projectId: string) {
  await requireOwner();
  // cascade deletes credential_pairs automatically
  const { error } = await db.from("credentials").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/projects/${projectId}`);
}
