/**
 * Transform Supabase snake_case rows → app camelCase types.
 * All functions accept `any` because the Supabase-generated types are complex
 * and we just need safe field mapping.
 */

import type {
  Project,
  GitHubRepo,
  ProjectCalEvent,
  ProjectNote,
  MarkdownNote,
  Credential,
  CredentialPair,
  TimelineEvent,
  RoadmapItem,
  ProjectLink,
} from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function toGithubRepo(row: Row): GitHubRepo {
  return {
    id:            row.id,
    githubId:      row.github_id ?? 0,
    fullName:      row.full_name,
    defaultBranch: row.default_branch,
    description:   row.description ?? null,
    stars:         row.stars ?? 0,
    lastSyncedAt:  row.last_synced_at ? new Date(row.last_synced_at) : null,
  };
}

function toCalEvent(row: Row): ProjectCalEvent {
  return {
    id:        row.id,
    date:      row.date,
    title:     row.title,
    completed: row.completed ?? false,
  };
}

function toProjectNote(row: Row): ProjectNote {
  return {
    id:        row.id,
    content:   row.content,
    createdAt: row.created_at,
  };
}

function toMarkdownNote(row: Row): MarkdownNote {
  return {
    id:        row.id,
    title:     row.title,
    content:   row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCredentialPair(row: Row): CredentialPair {
  return { key: row.key, value: row.value };
}

function toCredential(row: Row): Credential {
  const pairs = (row.credential_pairs ?? []) as Row[];
  return {
    id:        row.id,
    title:     row.title,
    pairs:     pairs
                 .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                 .map(toCredentialPair),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Public transforms ─────────────────────────────────────────────────────────

/**
 * Transform a full project row (with all relations embedded) to the app's
 * `Project` type.
 */
export function toProject(row: Row): Project {
  // Supabase returns has-one relations as a single object or null (not an array)
  // when UNIQUE constraint is present, but guard for both shapes.
  const ghRaw  = row.github_repos;
  const ghRepo = Array.isArray(ghRaw) ? (ghRaw[0] ?? null) : (ghRaw ?? null);

  return {
    id:               row.id,
    name:             row.name,
    brief:            row.brief            ?? null,
    description:      row.description      ?? null,
    problemStatement: row.problem_statement ?? null,
    status:           row.status,
    logoUrl:          row.logo_url         ?? null,
    pinned:           row.pinned           ?? false,
    hidden:           row.hidden           ?? false,
    createdAt:        new Date(row.created_at),
    updatedAt:        new Date(row.updated_at),
    githubRepo:       ghRepo ? toGithubRepo(ghRepo) : null,
    calendarEvents:   (row.calendar_events  ?? []).map(toCalEvent),
    projectNotes:     (row.project_notes    ?? []).map(toProjectNote),
    markdownNotes:    (row.markdown_notes   ?? []).map(toMarkdownNote),
    credentials:      (row.credentials      ?? []).map(toCredential),
    _count: {
      timelineEvents: (row.timeline_events ?? []).length,
      roadmapItems:   (row.roadmap_items   ?? []).length,
    },
  };
}

export function toTimelineEvent(row: Row): TimelineEvent {
  return {
    id:        row.id,
    projectId: row.project_id,
    type:      row.type,
    title:     row.title,
    body:      row.body      ?? null,
    eventDate: new Date(row.event_date),
    metadata:  row.metadata  ?? null,
  };
}

export function toRoadmapItem(row: Row): RoadmapItem {
  return {
    id:          row.id,
    projectId:   row.project_id,
    title:       row.title,
    description: row.description ?? null,
    status:      row.status,
    sortOrder:   row.sort_order  ?? 0,
  };
}

export function toProjectLink(row: Row): ProjectLink {
  return {
    id:        row.id,
    projectId: row.project_id,
    title:     row.title,
    url:       row.url,
    type:      row.type,
  };
}

// ── Diff helpers (used by ProjectsContext to sync nested arrays) ──────────────

interface Diff<T extends { id: string }> {
  added:   T[];
  removed: T[];
  changed: T[];
}

export function diffById<T extends { id: string }>(
  oldItems: T[],
  newItems: T[],
): Diff<T> {
  const oldMap = new Map(oldItems.map((i) => [i.id, i]));
  const newMap = new Map(newItems.map((i) => [i.id, i]));

  return {
    added:   newItems.filter((ni) => !oldMap.has(ni.id)),
    removed: oldItems.filter((oi) => !newMap.has(oi.id)),
    changed: newItems.filter((ni) => {
      const oi = oldMap.get(ni.id);
      return oi !== undefined && JSON.stringify(oi) !== JSON.stringify(ni);
    }),
  };
}
