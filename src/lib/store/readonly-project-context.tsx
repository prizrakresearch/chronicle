"use client";

/**
 * ReadOnlyProjectsProvider — wraps /share/[id] children in the same
 * ProjectsContext that all existing components read from, but with:
 *   - isReadOnly = true
 *   - All write operations silently no-op
 *   - Data pre-loaded (no Clerk auth required)
 */

import React, { useMemo } from "react";
import type {
  Project, TimelineEvent, RoadmapItem, ProjectLink, ProjectFile,
  ProjectStatus,
} from "@/types";
import { ReadOnlyProjectsContext } from "./projects-context";

// Mirrors ProjectsContextValue — kept in sync manually.
interface ProjectsContextValue {
  projects: Project[];
  loading:  boolean;

  refreshProjects: () => Promise<void>;
  addProject:    (data: { name: string; description: string | null; status: ProjectStatus; logoUrl?: string | null; logoS3Key?: string | null; id?: string }) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, "id" | "createdAt" | "githubRepo">>) => void;
  deleteProject: (id: string) => void;
  getProject:    (id: string) => Project | undefined;

  timelineEvents:      TimelineEvent[];
  getTimeline:         (projectId: string) => TimelineEvent[];
  addTimelineEvent:    (data: Omit<TimelineEvent, "id">) => TimelineEvent;
  deleteTimelineEvent: (id: string) => void;

  roadmapItems:      RoadmapItem[];
  getRoadmapItems:   (projectId: string) => RoadmapItem[];
  addRoadmapItem:    (data: Omit<RoadmapItem, "id">) => RoadmapItem;
  updateRoadmapItem: (id: string, updates: Partial<Omit<RoadmapItem, "id" | "projectId">>) => void;
  deleteRoadmapItem: (id: string) => void;

  links:      ProjectLink[];
  getLinks:   (projectId: string) => ProjectLink[];
  addLink:    (data: Omit<ProjectLink, "id">) => ProjectLink;
  deleteLink: (id: string) => void;

  projectFiles:      ProjectFile[];
  getProjectFiles:   (projectId: string) => ProjectFile[];
  addProjectFile:    (data: Omit<ProjectFile, "id">) => ProjectFile;
  uploadFile:        (file: File, projectId: string, onProgress?: (pct: number) => void, options?: { versionOf?: string; overrideName?: string }) => Promise<void>;
  deleteProjectFile: (id: string) => void;

  pin:      string | null;
  setPin:   (pin: string) => void;
  clearPin: () => void;

  isReadOnly:      boolean;
  hasGithubToken:  boolean;

  saveGithubToken:    (rawToken: string) => Promise<void>;
  clearGithubToken:   () => Promise<void>;
  linkRepo:           (projectId: string, fullName: string) => Promise<void>;
  unlinkRepo:         (projectId: string) => Promise<void>;
  syncRepo:           (projectId: string) => Promise<void>;
  reloadProjectFiles: () => Promise<void>;
}

interface Props {
  project:        Project;
  roadmapItems:   RoadmapItem[];
  timelineEvents: TimelineEvent[];
  links:          ProjectLink[];
  projectFiles:   ProjectFile[];
  children:       React.ReactNode;
}

const noop      = () => {};
const asyncNoop = async () => {};
const fallbackProject: ProjectFile = { id: "", projectId: "", name: "", mimeType: "", size: 0, dataUrl: "", createdAt: "", folderId: null, tags: [] };

export function ReadOnlyProjectsProvider({
  project, roadmapItems, timelineEvents, links, projectFiles, children,
}: Props) {
  const value = useMemo<ProjectsContextValue>(() => ({
    projects:  [project],
    loading:   false,
    isReadOnly:     true,
    hasGithubToken: false,

    getProject: (id) => id === project.id ? project : undefined,

    addProject:    () => project,
    updateProject: noop,
    deleteProject: noop,

    timelineEvents,
    getTimeline:         (pid) => timelineEvents.filter((e) => e.projectId === pid),
    addTimelineEvent:    () => ({ id: "", projectId: project.id, type: "note", title: "", body: null, eventDate: new Date(), metadata: null }),
    deleteTimelineEvent: noop,

    roadmapItems,
    getRoadmapItems:   (pid) => roadmapItems.filter((r) => r.projectId === pid),
    addRoadmapItem:    () => ({ id: "", projectId: project.id, title: "", description: null, status: "planned", sortOrder: 0 }),
    updateRoadmapItem: noop,
    deleteRoadmapItem: noop,

    links,
    getLinks:  (pid) => links.filter((l) => l.projectId === pid),
    addLink:   () => ({ id: "", projectId: project.id, title: "", url: "", type: "other", folderId: null, tags: [] }),
    deleteLink: noop,

    projectFiles,
    getProjectFiles:   (pid) => projectFiles.filter((f) => f.projectId === pid),
    addProjectFile:    () => fallbackProject,
    uploadFile:        asyncNoop,
    deleteProjectFile: noop,

    pin:      null,
    setPin:   noop,
    clearPin: noop,

    refreshProjects:  asyncNoop,
    saveGithubToken:  asyncNoop,
    clearGithubToken: asyncNoop,
    linkRepo:         asyncNoop,
    unlinkRepo:       asyncNoop,
    syncRepo:           asyncNoop,
    reloadProjectFiles: asyncNoop,
  }), [project, roadmapItems, timelineEvents, links, projectFiles]);

  return (
    <ReadOnlyProjectsContext.Provider value={value}>
      {children}
    </ReadOnlyProjectsContext.Provider>
  );
}
