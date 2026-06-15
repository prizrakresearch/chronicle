export type ProjectStatus = "active" | "paused" | "archived";

export interface CredentialPair {
  key:   string;
  value: string;
}

export interface Credential {
  id:        string;
  title:     string;
  pairs:     CredentialPair[];
  createdAt: string;
  updatedAt: string;
}

export interface MarkdownNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCalEvent {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  completed: boolean;
}

export interface ProjectNote {
  id: string;
  content: string;
  createdAt: string; // ISO date string
}
export type EventType = "note" | "decision" | "maintenance" | "milestone" | "git_commit";
export type RoadmapStatus = "planned" | "in_progress" | "completed";
export type LinkType = "github" | "docs" | "production" | "design" | "other";

export interface GitHubRepo {
  id: string;
  githubId: number;
  fullName: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  lastSyncedAt: Date | null;
}

export interface Project {
  id: string;
  name: string;
  brief: string | null;
  description: string | null;
  problemStatement: string | null;
  status: ProjectStatus;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  githubRepo: GitHubRepo | null;
  calendarEvents: ProjectCalEvent[];
  projectNotes: ProjectNote[];
  markdownNotes: MarkdownNote[];
  credentials:   Credential[];
  pinned?: boolean;
  hidden?: boolean;
  _count: { timelineEvents: number; roadmapItems: number };
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: EventType;
  title: string;
  body: string | null;
  eventDate: Date;
  metadata: { sha?: string; url?: string; authorName?: string } | null;
}

export interface RoadmapItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  sortOrder: number;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  type: LinkType;
  folderId: string | null;
  tags: string[];
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;      // bytes
  /** Presigned S3 GET URL (or base64 for legacy in-memory files). */
  dataUrl: string;
  /** S3 object key — present for S3-backed files, undefined for legacy. */
  s3Key?: string;
  createdAt: string; // ISO
  folderId: string | null;
  tags: string[];
  /** Current version number; 1 = original, 2+ = has history. */
  versionNumber?: number;
}
