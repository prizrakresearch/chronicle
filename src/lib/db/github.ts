"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/crypto/github-token";
import type { GitHubRepo } from "@/types";

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireOwner() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");
  return userId;
}

// ── GitHub API fetch helper ───────────────────────────────────────────────────

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
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── Token management via Clerk private metadata ───────────────────────────────
// Stored in privateMetadata.githubToken (server-side only, never in browser).
// No DB permissions required — Clerk handles storage via the Backend API.

async function getClerkClient() {
  return clerkClient();
}

/** Save an encrypted GitHub PAT in Clerk private metadata. */
export async function saveGithubToken(rawToken: string): Promise<void> {
  const ownerId = await requireOwner();
  const encrypted = encryptToken(rawToken.trim());
  const client = await getClerkClient();
  await client.users.updateUserMetadata(ownerId, {
    privateMetadata: { githubToken: encrypted },
  });
}

/** Clear the stored GitHub PAT. */
export async function clearGithubToken(): Promise<void> {
  const ownerId = await requireOwner();
  const client = await getClerkClient();
  await client.users.updateUserMetadata(ownerId, {
    privateMetadata: { githubToken: null },
  });
}

/** Returns true if a token is stored for this owner. */
export async function hasGithubToken(): Promise<boolean> {
  const ownerId = await requireOwner();
  const client = await getClerkClient();
  const user = await client.users.getUser(ownerId);
  return !!(user.privateMetadata as { githubToken?: string | null })?.githubToken;
}

/** Retrieve and decrypt the stored token. Throws if missing. */
async function getStoredToken(): Promise<string> {
  const ownerId = await requireOwner();
  const client = await getClerkClient();
  const user = await client.users.getUser(ownerId);
  const encrypted = (user.privateMetadata as { githubToken?: string | null })?.githubToken;
  if (!encrypted) throw new Error("No GitHub token saved — connect one via Settings → GitHub");
  return decryptToken(encrypted);
}

/** Validate a token against GitHub API — returns the authenticated username. */
export async function validateGithubToken(rawToken: string): Promise<{ login: string }> {
  const user = await githubFetch(rawToken.trim(), "/user") as { login: string };
  return { login: user.login };
}

// ── Repo discovery ────────────────────────────────────────────────────────────

export interface UserRepo {
  id: number;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  stars: number;
  updatedAt: string;
  defaultBranch: string;
}

/** List repos accessible to the authenticated user (sorted by most recent update). */
export async function listUserRepos(): Promise<UserRepo[]> {
  const token = await getStoredToken();
  const raw = await githubFetch(token, "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator") as Array<{
    id: number;
    full_name: string;
    description: string | null;
    private: boolean;
    stargazers_count: number;
    updated_at: string;
    default_branch: string;
  }>;
  return raw.map(r => ({
    id:            r.id,
    fullName:      r.full_name,
    description:   r.description,
    isPrivate:     r.private,
    stars:         r.stargazers_count,
    updatedAt:     r.updated_at,
    defaultBranch: r.default_branch,
  }));
}

// ── Repo CRUD ─────────────────────────────────────────────────────────────────

/** Link a GitHub repo to a project (fetches latest info and saves it). */
export async function linkRepoToProject(
  projectId: string,
  fullName: string
): Promise<GitHubRepo> {
  const token = await getStoredToken();

  const raw = await githubFetch(token, `/repos/${fullName}`) as {
    id: number;
    full_name: string;
    default_branch: string;
    description: string | null;
    stargazers_count: number;
  };

  // Upsert (there should only ever be one row per project)
  const { data, error } = await db
    .from("github_repos")
    .upsert({
      project_id:      projectId,
      github_id:       raw.id,
      full_name:       raw.full_name,
      default_branch:  raw.default_branch,
      description:     raw.description,
      stars:           raw.stargazers_count,
      last_synced_at:  new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id:            data.id,
    githubId:      data.github_id ?? 0,
    fullName:      data.full_name,
    defaultBranch: data.default_branch,
    description:   data.description,
    stars:         data.stars,
    lastSyncedAt:  data.last_synced_at ? new Date(data.last_synced_at) : null,
  };
}

/** Remove the linked GitHub repo from a project. */
export async function unlinkRepoFromProject(projectId: string): Promise<void> {
  await requireOwner();
  const { error } = await db
    .from("github_repos")
    .delete()
    .eq("project_id", projectId);
  if (error) throw error;
}

/** Refresh the repo metadata (stars, description, branch) from GitHub. */
export async function syncRepoData(projectId: string): Promise<GitHubRepo> {
  const token = await getStoredToken();

  const { data: existing, error: fetchErr } = await db
    .from("github_repos")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (fetchErr || !existing) throw new Error("No GitHub repo linked to this project");

  const raw = await githubFetch(token, `/repos/${existing.full_name}`) as {
    id: number;
    default_branch: string;
    description: string | null;
    stargazers_count: number;
  };

  const { data, error } = await db
    .from("github_repos")
    .update({
      github_id:      raw.id,
      default_branch: raw.default_branch,
      description:    raw.description,
      stars:          raw.stargazers_count,
      last_synced_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) throw error;

  return {
    id:            data.id,
    githubId:      data.github_id ?? 0,
    fullName:      data.full_name,
    defaultBranch: data.default_branch,
    description:   data.description,
    stars:         data.stars,
    lastSyncedAt:  data.last_synced_at ? new Date(data.last_synced_at) : null,
  };
}

// ── Branches ──────────────────────────────────────────────────────────────────

export interface RepoBranch {
  name: string;
  isDefault: boolean;
}

export async function getRepoBranches(
  fullName: string,
  defaultBranch: string
): Promise<RepoBranch[]> {
  const token = await getStoredToken();
  const raw = await githubFetch(token, `/repos/${fullName}/branches?per_page=30`) as Array<{ name: string }>;
  return raw
    .map(b => ({ name: b.name, isDefault: b.name === defaultBranch }))
    .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
}

// ── Contribution graph (last 60 days) ─────────────────────────────────────────

export async function getRepoContributions(
  fullName: string
): Promise<{ date: string; count: number }[]> {
  const token = await getStoredToken();

  // Fetch commits from the last 60 days
  const since = new Date();
  since.setDate(since.getDate() - 59);
  since.setHours(0, 0, 0, 0);

  let raw: Array<{ commit: { author: { date: string } } }> = [];
  try {
    raw = await githubFetch(
      token,
      `/repos/${fullName}/commits?since=${since.toISOString()}&per_page=100`
    ) as typeof raw;
  } catch {
    // Network or auth error — return empty (graceful degradation)
    raw = [];
  }

  // Group by date
  const counts = new Map<string, number>();
  for (const c of raw) {
    const date = c.commit.author.date.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  // Return full 60-day array with 0 for days without commits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (59 - i));
    const iso = d.toISOString().slice(0, 10);
    return { date: iso, count: counts.get(iso) ?? 0 };
  });
}

// ── Commits ───────────────────────────────────────────────────────────────────

export type CommitType = "feat" | "fix" | "chore" | "docs" | "refactor" | "test";

export interface RepoCommit {
  sha:    string;
  type:   CommitType;
  scope:  string | null;
  msg:    string;
  body:   string | null;
  author: string;
  date:   string;
  branch: string;
  files:  { path: string; additions: number; deletions: number; status: "M" | "A" | "D" }[];
}

function classifyType(message: string): CommitType {
  const m = message.toLowerCase();
  if (/^feat[(:![\s]/.test(m) || m.startsWith("feature"))  return "feat";
  if (/^fix[(:![\s]/.test(m)  || m.startsWith("bugfix"))   return "fix";
  if (/^docs?[(:![\s]/.test(m))                            return "docs";
  if (/^refactor[(:![\s]/.test(m))                         return "refactor";
  if (/^test[(:![\s]/.test(m))                             return "test";
  return "chore";
}

function parseConventional(message: string): { type: CommitType; scope: string | null; msg: string; body: string | null } {
  const lines = message.trim().split("\n");
  const firstLine = lines[0];
  const type = classifyType(firstLine);
  const scopeMatch = /^\w+\(([^)]+)\)/.exec(firstLine);
  const scope = scopeMatch ? scopeMatch[1] : null;
  const msg = firstLine.replace(/^\w+(\([^)]+\))?!?:\s*/, "").trim() || firstLine;
  const body = lines.slice(2).filter(Boolean).join("\n").trim() || null;
  return { type, scope, msg, body };
}

function mapFileStatus(s: string): "M" | "A" | "D" {
  if (s === "added") return "A";
  if (s === "removed") return "D";
  return "M";
}

/** Fetch recent commits for a branch (up to 30). Files array is empty — use getCommitDetail for file diffs. */
export async function getRepoCommits(
  fullName: string,
  branch: string,
  page = 1
): Promise<RepoCommit[]> {
  const token = await getStoredToken();
  const raw = await githubFetch(
    token,
    `/repos/${fullName}/commits?sha=${encodeURIComponent(branch)}&per_page=30&page=${page}`
  ) as Array<{
    sha: string;
    commit: { author: { name: string; date: string }; message: string };
  }>;

  return raw.map(c => {
    const parsed = parseConventional(c.commit.message);
    return {
      sha:    c.sha.slice(0, 7),
      ...parsed,
      author: c.commit.author.name,
      date:   c.commit.author.date.slice(0, 10),
      branch,
      files:  [], // populated on demand via getCommitDetail
    };
  });
}

/** Fetch a single commit with full file diff. */
export async function getCommitDetail(
  fullName: string,
  sha: string,
  branch: string
): Promise<RepoCommit> {
  const token = await getStoredToken();
  const raw = await githubFetch(token, `/repos/${fullName}/commits/${sha}`) as {
    sha: string;
    commit: { author: { name: string; date: string }; message: string };
    files: Array<{
      filename: string;
      additions: number;
      deletions: number;
      status: string;
    }>;
  };

  const parsed = parseConventional(raw.commit.message);
  return {
    sha:    raw.sha.slice(0, 7),
    ...parsed,
    author: raw.commit.author.name,
    date:   raw.commit.author.date.slice(0, 10),
    branch,
    files:  (raw.files ?? []).slice(0, 20).map(f => ({
      path:      f.filename,
      additions: f.additions,
      deletions: f.deletions,
      status:    mapFileStatus(f.status),
    })),
  };
}

// ── Bulk import ───────────────────────────────────────────────────────────────

export interface ImportedProject {
  projectId: string;
  name:      string;
  fullName:  string;
}

/**
 * Create a Chronicle project for each selected GitHub repo and link the repo
 * in one go. Skips repos that are already linked to an existing project.
 * Returns the list of newly-created projects.
 */
export async function importReposAsProjects(
  repos: Pick<UserRepo, "id" | "fullName" | "description" | "defaultBranch">[]
): Promise<ImportedProject[]> {
  const ownerId = await requireOwner();

  // Find repos that are already linked so we can skip them
  const { data: existing } = await db
    .from("github_repos")
    .select("github_id")
    .in("github_id", repos.map(r => r.id));

  const alreadyLinked = new Set((existing ?? []).map(r => r.github_id));

  const toImport = repos.filter(r => !alreadyLinked.has(r.id));
  if (toImport.length === 0) return [];

  const results: ImportedProject[] = [];

  for (const repo of toImport) {
    // Derive a clean project name from the repo slug
    const name = repo.fullName.split("/")[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());

    const projectId = crypto.randomUUID();

    // 1. Create the project row
    const { error: projErr } = await db
      .from("projects")
      .insert({
        id:          projectId,
        owner_id:    ownerId,
        name,
        description: repo.description,
        status:      "active",
        logo_url:    null,
      });

    if (projErr) {
      console.error(`Failed to create project for ${repo.fullName}:`, projErr);
      continue;
    }

    // 2. Link the GitHub repo
    const { error: repoErr } = await db
      .from("github_repos")
      .insert({
        project_id:     projectId,
        github_id:      repo.id,
        full_name:      repo.fullName,
        default_branch: repo.defaultBranch,
        description:    repo.description,
        stars:          0,
        last_synced_at: new Date().toISOString(),
      });

    if (repoErr) {
      console.error(`Failed to link repo ${repo.fullName}:`, repoErr);
      // Still add the project even if repo link fails
    }

    results.push({ projectId, name, fullName: repo.fullName });
  }

  return results;
}
