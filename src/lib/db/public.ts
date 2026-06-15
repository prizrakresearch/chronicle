"use server";

/**
 * Public data fetching — no auth required.
 * Only used by the /share/[id] route.
 * Credentials are intentionally excluded.
 */

import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";
import { getDownloadUrl } from "@/lib/s3/client";
import { decryptToken } from "@/lib/crypto/github-token";
import type { RepoBranch, RepoCommit } from "@/lib/db/github";
import { toProject, toRoadmapItem, toTimelineEvent, toProjectLink } from "@/lib/db/transform";
import type { Project, RoadmapItem, TimelineEvent, ProjectLink, ProjectFile } from "@/types";

const PUBLIC_SELECT = `
  *,
  github_repos (*),
  calendar_events (*),
  project_notes (*),
  markdown_notes (*),
  roadmap_items (*),
  timeline_events (*),
  project_links (*),
  project_files (*)
`;

export interface PublicProjectData {
  project:        Project;
  roadmapItems:   RoadmapItem[];
  timelineEvents: TimelineEvent[];
  links:          ProjectLink[];
  projectFiles:   ProjectFile[];
}

export async function getPublicProject(id: string): Promise<PublicProjectData | null> {
  const { data, error } = await db
    .from("projects")
    .select(PUBLIC_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;

  // Resolve S3 logo key → presigned URL
  if (row.logo_s3_key && !row.logo_url) {
    try { row.logo_url = await getDownloadUrl(row.logo_s3_key, 3600); } catch { /* ok */ }
  }

  // Resolve project file storage paths → presigned GET URLs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectFiles: ProjectFile[] = await Promise.all((row.project_files ?? []).map(async (f: any) => {
    let dataUrl = "";
    try { dataUrl = await getDownloadUrl(f.storage_path, 3600); } catch { /* ok */ }
    return {
      id:        f.id,
      projectId: f.project_id,
      name:      f.name,
      mimeType:  f.mime_type,
      size:      f.size,
      dataUrl,
      s3Key:     f.storage_path,
      createdAt: f.created_at,
      folderId:  f.folder_id ?? null,
      tags:      f.tags      ?? [],
    } satisfies ProjectFile;
  }));

  const project        = toProject(row);
  const roadmapItems   = (row.roadmap_items   ?? []).map(toRoadmapItem);
  const timelineEvents = (row.timeline_events ?? []).map(toTimelineEvent);
  const links          = (row.project_links   ?? []).map(toProjectLink);

  return { project, roadmapItems, timelineEvents, links, projectFiles };
}

// ── Public GitHub data (uses project owner's stored token, server-side only) ──

/** Resolve a project's owner ID + linked repo info without auth. */
async function getOwnerTokenAndRepo(projectId: string): Promise<{ token: string; fullName: string; defaultBranch: string } | null> {
  const { data } = await db
    .from("projects")
    .select("owner_id, github_repos(full_name, default_branch)")
    .eq("id", projectId)
    .maybeSingle();

  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row    = data as any;
  const repoRaw = row.github_repos;
  const repo    = Array.isArray(repoRaw) ? repoRaw[0] : repoRaw;
  if (!repo) return null;

  const client    = await clerkClient();
  const user      = await client.users.getUser(row.owner_id);
  const encrypted = (user.privateMetadata as { githubToken?: string | null })?.githubToken;
  if (!encrypted) return null;

  return {
    token:         decryptToken(encrypted),
    fullName:      repo.full_name,
    defaultBranch: repo.default_branch,
  };
}

async function githubFetch(token: string, path: string): Promise<unknown> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "chronicle-app/1.0",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

export async function getPublicRepoBranches(projectId: string): Promise<RepoBranch[]> {
  const ctx = await getOwnerTokenAndRepo(projectId);
  if (!ctx) return [];
  const raw = await githubFetch(ctx.token, `/repos/${ctx.fullName}/branches?per_page=30`) as Array<{ name: string }>;
  return raw
    .map(b => ({ name: b.name, isDefault: b.name === ctx.defaultBranch }))
    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
}

export async function getPublicRepoContributions(projectId: string): Promise<{ date: string; count: number }[]> {
  const ctx = await getOwnerTokenAndRepo(projectId);
  if (!ctx) return [];

  const since = new Date();
  since.setDate(since.getDate() - 59);
  since.setHours(0, 0, 0, 0);

  let raw: Array<{ commit: { author: { date: string } } }> = [];
  try {
    raw = await githubFetch(ctx.token, `/repos/${ctx.fullName}/commits?since=${since.toISOString()}&per_page=100`) as typeof raw;
  } catch { raw = []; }

  const counts = new Map<string, number>();
  for (const c of raw) {
    const date = c.commit.author.date.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (59 - i));
    const iso = d.toISOString().slice(0, 10);
    return { date: iso, count: counts.get(iso) ?? 0 };
  });
}

export async function getPublicRepoCommits(projectId: string, branch: string): Promise<RepoCommit[]> {
  const ctx = await getOwnerTokenAndRepo(projectId);
  if (!ctx) return [];

  const raw = await githubFetch(
    ctx.token,
    `/repos/${ctx.fullName}/commits?sha=${encodeURIComponent(branch)}&per_page=30`
  ) as Array<{ sha: string; commit: { author: { name: string; date: string }; message: string } }>;

  // Minimal inline parser (mirrors github.ts)
  function classifyType(m: string) {
    const s = m.toLowerCase();
    if (/^feat[(:![\s]/.test(s) || s.startsWith("feature"))  return "feat"  as const;
    if (/^fix[(:![\s]/.test(s)  || s.startsWith("bugfix"))   return "fix"   as const;
    if (/^docs?[(:![\s]/.test(s))                            return "docs"  as const;
    if (/^refactor[(:![\s]/.test(s))                         return "refactor" as const;
    if (/^test[(:![\s]/.test(s))                             return "test"  as const;
    return "chore" as const;
  }
  return raw.map(c => {
    const lines  = c.commit.message.trim().split("\n");
    const first  = lines[0];
    const type   = classifyType(first);
    const scope  = /^\w+\(([^)]+)\)/.exec(first)?.[1] ?? null;
    const msg    = first.replace(/^\w+(\([^)]+\))?!?:\s*/, "").trim() || first;
    const body   = lines.slice(2).filter(Boolean).join("\n").trim() || null;
    return { sha: c.sha.slice(0, 7), type, scope, msg, body, author: c.commit.author.name, date: c.commit.author.date.slice(0, 10), branch, files: [] };
  });
}
