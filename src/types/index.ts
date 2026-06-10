export type ProjectStatus = "active" | "paused" | "archived";
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
  description: string | null;
  status: ProjectStatus;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  githubRepo: GitHubRepo | null;
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
}
