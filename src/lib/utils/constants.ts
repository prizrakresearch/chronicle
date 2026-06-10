import type { EventType, ProjectStatus, RoadmapStatus, LinkType } from "@/types";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  note: "Note",
  decision: "Decision",
  maintenance: "Maintenance",
  milestone: "Milestone",
  git_commit: "Commit",
};

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  github: "GitHub",
  docs: "Documentation",
  production: "Production",
  design: "Design",
  other: "Other",
};

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  active: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  paused: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  archived: {
    bg: "bg-zinc-700/40",
    text: "text-zinc-500",
    dot: "bg-zinc-500",
  },
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  note: "text-zinc-400",
  decision: "text-violet-400",
  maintenance: "text-amber-400",
  milestone: "text-emerald-400",
  git_commit: "text-sky-400",
};

export const EVENT_TYPE_BG: Record<EventType, string> = {
  note: "bg-zinc-400/10",
  decision: "bg-violet-400/10",
  maintenance: "bg-amber-400/10",
  milestone: "bg-emerald-400/10",
  git_commit: "bg-sky-400/10",
};
