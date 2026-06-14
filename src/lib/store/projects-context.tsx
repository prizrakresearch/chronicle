"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import type {
  Project, TimelineEvent, RoadmapItem, ProjectLink, ProjectFile,
  ProjectStatus, MarkdownNote, ProjectCalEvent, Credential,
} from "@/types";
import { toProject, toTimelineEvent, toRoadmapItem, toProjectLink, diffById } from "@/lib/db/transform";

// ── Server Actions ─────────────────────────────────────────────────────────────
import {
  getProjects as dbGetProjects,
  createProject as dbCreateProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
} from "@/lib/db/projects";
import {
  addTimelineEvent   as dbAddTimelineEvent,
  deleteTimelineEvent as dbDeleteTimelineEvent,
  createMarkdownNote,
  updateMarkdownNote,
  deleteMarkdownNote as dbDeleteMarkdownNote,
} from "@/lib/db/notes";
import {
  addRoadmapItem   as dbAddRoadmapItem,
  updateRoadmapItem as dbUpdateRoadmapItem,
  deleteRoadmapItem as dbDeleteRoadmapItem,
} from "@/lib/db/roadmap";
import {
  addLink                  as dbAddLink,
  deleteLink               as dbDeleteLink,
  addCalendarEvent,
  toggleCalendarEvent,
  deleteCalendarEvent,
  requestUploadUrl,
  saveProjectFile,
  getFileUrl,
  getProjectFilesWithUrls,
  deleteProjectFile        as dbDeleteProjectFile,
} from "@/lib/db/files";
import {
  hasGithubToken           as dbHasGithubToken,
  saveGithubToken          as dbSaveGithubToken,
  clearGithubToken         as dbClearGithubToken,
  linkRepoToProject        as dbLinkRepo,
  unlinkRepoFromProject    as dbUnlinkRepo,
  syncRepoData             as dbSyncRepo,
} from "@/lib/db/github";

// ── Context interface ──────────────────────────────────────────────────────────

interface ProjectsContextValue {
  projects: Project[];
  loading:  boolean;

  refreshProjects: () => Promise<void>;
  addProject:    (data: { name: string; description: string | null; status: ProjectStatus; logoUrl?: string | null; logoS3Key?: string | null; id?: string }) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, "id" | "createdAt" | "githubRepo">>) => void;
  deleteProject: (id: string) => void;
  getProject:    (id: string) => Project | undefined;

  timelineEvents:     TimelineEvent[];
  getTimeline:        (projectId: string) => TimelineEvent[];
  addTimelineEvent:   (data: Omit<TimelineEvent, "id">) => TimelineEvent;
  deleteTimelineEvent: (id: string) => void;

  roadmapItems:     RoadmapItem[];
  getRoadmapItems:  (projectId: string) => RoadmapItem[];
  addRoadmapItem:   (data: Omit<RoadmapItem, "id">) => RoadmapItem;
  updateRoadmapItem: (id: string, updates: Partial<Omit<RoadmapItem, "id" | "projectId">>) => void;
  deleteRoadmapItem: (id: string) => void;

  links:    ProjectLink[];
  getLinks: (projectId: string) => ProjectLink[];
  addLink:  (data: Omit<ProjectLink, "id">) => ProjectLink;
  deleteLink: (id: string) => void;

  projectFiles:      ProjectFile[];
  getProjectFiles:   (projectId: string) => ProjectFile[];
  addProjectFile:    (data: Omit<ProjectFile, "id">) => ProjectFile;
  /** Upload a native File to S3, save metadata, update context. */
  uploadFile:        (file: File, projectId: string) => Promise<void>;
  deleteProjectFile: (id: string) => void;

  pin:      string | null;
  setPin:   (pin: string) => void;
  clearPin: () => void;

  isReadOnly: boolean;

  // GitHub
  hasGithubToken:  boolean;
  saveGithubToken: (rawToken: string) => Promise<void>;
  clearGithubToken: () => Promise<void>;
  linkRepo:        (projectId: string, fullName: string) => Promise<void>;
  unlinkRepo:      (projectId: string) => Promise<void>;
  syncRepo:        (projectId: string) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

// Exported so ReadOnlyProjectsProvider (used on /share pages) can reuse
// the same context key — components call useProjects() and get either provider.
export { ProjectsContext as ReadOnlyProjectsContext };

// ── Provider ───────────────────────────────────────────────────────────────────

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const role      = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isReadOnly = role !== "owner";

  const [loading,          setLoading]          = useState(true);
  const [projects,         setProjects]         = useState<Project[]>([]);
  const [timelineEvents,   setTimelineEvents]   = useState<TimelineEvent[]>([]);
  const [roadmapItems,     setRoadmapItems]     = useState<RoadmapItem[]>([]);
  const [links,            setLinks]            = useState<ProjectLink[]>([]);
  const [projectFiles,     setProjectFiles]     = useState<ProjectFile[]>([]);
  const [hasGithubTokenSt, setHasGithubToken]   = useState(false);
  const [pin,              setPinState]         = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("chronicle_pin") : null
  );

  // Stable ref to latest projects — avoids stale closures inside callbacks
  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);
  const roadmapRef = useRef(roadmapItems);
  useEffect(() => { roadmapRef.current = roadmapItems; }, [roadmapItems]);
  const timelineRef = useRef(timelineEvents);
  useEffect(() => { timelineRef.current = timelineEvents; }, [timelineEvents]);
  const linksRef = useRef(links);
  useEffect(() => { linksRef.current = links; }, [links]);

  // ── Initial data load ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;          // wait until Clerk user is ready
    let cancelled = false;

    (async () => {
      try {
        const rows = await dbGetProjects();
        if (cancelled) return;

        const loadedProjects: Project[]       = [];
        const loadedTimeline: TimelineEvent[] = [];
        const loadedRoadmap:  RoadmapItem[]   = [];
        const loadedLinks:    ProjectLink[]   = [];

        for (const row of rows as never[]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = row as any;
          loadedProjects.push(toProject(r));
          for (const ri of r.roadmap_items   ?? []) loadedRoadmap.push(toRoadmapItem(ri));
          for (const te of r.timeline_events ?? []) loadedTimeline.push(toTimelineEvent(te));
          for (const lk of r.project_links   ?? []) loadedLinks.push(toProjectLink(lk));
        }

        setProjects(loadedProjects);
        setRoadmapItems(loadedRoadmap);
        setTimelineEvents(loadedTimeline);
        setLinks(loadedLinks);

        // Load project files with presigned S3 GET URLs
        const projectIds = loadedProjects.map((p) => p.id);
        if (projectIds.length > 0) {
          const filesData = await getProjectFilesWithUrls(projectIds);
          if (!cancelled) {
            setProjectFiles(filesData.map((f) => ({
              id:         f.id,
              projectId:  f.project_id,
              name:       f.name,
              mimeType:   f.mime_type,
              size:       f.size,
              dataUrl:    f.presigned_url,
              s3Key:      f.storage_path,
              createdAt:  f.created_at,
            })));
          }
        }

        // Check if GitHub token is saved (owner-only — non-owners can skip)
        if (!isReadOnly) {
          const tokenSet = await dbHasGithubToken().catch(err => {
            console.error("[ProjectsContext] hasGithubToken failed:", err);
            return false;
          });
          if (!cancelled) setHasGithubToken(tokenSet);
        }
      } catch (err) {
        console.error("[ProjectsContext] load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);   // re-run only when the signed-in user changes

  // ── Pin ──────────────────────────────────────────────────────────────────────

  const setPin = useCallback((newPin: string) => {
    localStorage.setItem("chronicle_pin", newPin);
    setPinState(newPin);
  }, []);

  const clearPin = useCallback(() => {
    localStorage.removeItem("chronicle_pin");
    setPinState(null);
  }, []);

  // ── Refresh (re-fetch all from DB) ──────────────────────────────────────────

  const refreshProjects = useCallback(async () => {
    try {
      const rows = await dbGetProjects();
      const loadedProjects: Project[]       = [];
      const loadedTimeline: TimelineEvent[] = [];
      const loadedRoadmap:  RoadmapItem[]   = [];
      const loadedLinks:    ProjectLink[]   = [];

      for (const row of rows as never[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = row as any;
        loadedProjects.push(toProject(r));
        for (const ri of r.roadmap_items   ?? []) loadedRoadmap.push(toRoadmapItem(ri));
        for (const te of r.timeline_events ?? []) loadedTimeline.push(toTimelineEvent(te));
        for (const lk of r.project_links   ?? []) loadedLinks.push(toProjectLink(lk));
      }

      setProjects(loadedProjects);
      setRoadmapItems(loadedRoadmap);
      setTimelineEvents(loadedTimeline);
      setLinks(loadedLinks);
    } catch (err) {
      console.error("[ProjectsContext] refreshProjects failed:", err);
    }
  }, []);

  // ── Project mutations ────────────────────────────────────────────────────────

  const addProject = useCallback((data: {
    name: string; description: string | null; status: ProjectStatus;
    logoUrl?: string | null; logoS3Key?: string | null;
    id?: string; // allow caller to supply pre-generated ID
  }): Project => {
    const id  = data.id ?? crypto.randomUUID();
    const now = new Date();
    const project: Project = {
      id,
      name:             data.name,
      brief:            null,
      description:      data.description,
      problemStatement: null,
      status:           data.status,
      logoUrl:          data.logoUrl ?? null,
      createdAt:        now,
      updatedAt:        now,
      githubRepo:       null,
      calendarEvents:   [],
      projectNotes:     [],
      markdownNotes:    [],
      credentials:      [],
      pinned:           false,
      hidden:           false,
      _count:           { timelineEvents: 0, roadmapItems: 0 },
    };
    setProjects((prev) => [project, ...prev]);

    // Persist — the SA accepts an explicit id so local + DB share the same UUID
    dbCreateProject({
      id,
      name:         data.name,
      description:  data.description,
      status:       data.status as never,
      logo_url:     data.logoUrl ?? null,
      logo_s3_key:  data.logoS3Key ?? null,
    }).catch(console.error);

    return project;
  }, []);

  const updateProject = useCallback((
    id: string,
    updates: Partial<Omit<Project, "id" | "createdAt" | "githubRepo">>,
  ) => {
    const current = projectsRef.current.find((p) => p.id === id);

    // 1. Optimistic local update
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p))
    );

    if (!current) return;

    // 2. Persist simple project-table fields
    const SNAKE: Record<string, string> = {
      problemStatement: "problem_statement",
      logoUrl:          "logo_url",
    };
    const dbFields: Record<string, unknown> = {};
    for (const k of ["name","brief","description","problemStatement","status","logoUrl","pinned","hidden"] as const) {
      if (k in updates) dbFields[SNAKE[k] ?? k] = (updates as Record<string, unknown>)[k];
    }
    if (Object.keys(dbFields).length > 0) {
      (dbUpdateProject as (id: string, u: Record<string, unknown>) => Promise<void>)(id, dbFields)
        .catch(console.error);
    }

    // 3. Calendar events diff
    if ("calendarEvents" in updates && Array.isArray(updates.calendarEvents)) {
      const diff = diffById<ProjectCalEvent>(current.calendarEvents, updates.calendarEvents);
      for (const e of diff.added)   addCalendarEvent({ id: e.id, project_id: id, date: e.date, title: e.title }).catch(console.error);
      for (const e of diff.removed) deleteCalendarEvent(e.id, id).catch(console.error);
      for (const e of diff.changed) toggleCalendarEvent(e.id, id, e.completed).catch(console.error);
    }

    // 4. Markdown notes diff
    if ("markdownNotes" in updates && Array.isArray(updates.markdownNotes)) {
      const diff = diffById<MarkdownNote>(current.markdownNotes, updates.markdownNotes as MarkdownNote[]);
      for (const n of diff.added)   createMarkdownNote(id, { id: n.id, title: n.title, content: n.content }).catch(console.error);
      for (const n of diff.removed) dbDeleteMarkdownNote(n.id, id).catch(console.error);
      for (const n of diff.changed as MarkdownNote[]) updateMarkdownNote(n.id, id, { title: n.title, content: n.content }).catch(console.error);
    }

    // 5. Credentials diff (dynamic import avoids bundling crypto on every render)
    if ("credentials" in updates && Array.isArray(updates.credentials)) {
      const diff = diffById<Credential>(current.credentials, updates.credentials as Credential[]);
      import("@/lib/db/credentials").then(({ createCredential, deleteCredential, updateCredentialTitle, replaceCredentialPairs }) => {
        for (const c of diff.added   as Credential[]) createCredential({ id: c.id, project_id: id, title: c.title, pairs: c.pairs }).catch(console.error);
        for (const c of diff.removed)                  deleteCredential(c.id, id).catch(console.error);
        for (const c of diff.changed as Credential[]) {
          updateCredentialTitle(c.id, id, c.title).catch(console.error);
          replaceCredentialPairs(c.id, id, c.pairs).catch(console.error);
        }
      });
    }
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTimelineEvents((prev) => prev.filter((e) => e.projectId !== id));
    setRoadmapItems((prev) => prev.filter((r) => r.projectId !== id));
    setLinks((prev) => prev.filter((l) => l.projectId !== id));
    setProjectFiles((prev) => prev.filter((f) => f.projectId !== id));
    dbDeleteProject(id).catch(console.error);
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  // ── Timeline mutations ────────────────────────────────────────────────────────

  const getTimeline = useCallback(
    (projectId: string) => timelineEvents.filter((e) => e.projectId === projectId),
    [timelineEvents]
  );

  const addTimelineEvent = useCallback((data: Omit<TimelineEvent, "id">): TimelineEvent => {
    const id    = crypto.randomUUID();
    const event: TimelineEvent = { ...data, id };
    setTimelineEvents((prev) => [event, ...prev]);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === data.projectId
          ? { ...p, updatedAt: new Date(), _count: { ...p._count, timelineEvents: p._count.timelineEvents + 1 } }
          : p
      )
    );
    dbAddTimelineEvent({
      id,
      project_id: data.projectId,
      type:       data.type,
      title:      data.title,
      body:       data.body ?? null,
      event_date: data.eventDate.toISOString(),
      metadata:   data.metadata as { sha?: string; url?: string; authorName?: string } | null,
    }).catch(console.error);
    return event;
  }, []);

  const deleteTimelineEvent = useCallback((id: string) => {
    const event = timelineRef.current.find((e) => e.id === id);
    setTimelineEvents((prev) => prev.filter((e) => e.id !== id));
    if (event) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === event.projectId
            ? { ...p, _count: { ...p._count, timelineEvents: Math.max(0, p._count.timelineEvents - 1) } }
            : p
        )
      );
      dbDeleteTimelineEvent(id, event.projectId).catch(console.error);
    }
  }, []);

  // ── Roadmap mutations ─────────────────────────────────────────────────────────

  const getRoadmapItems = useCallback(
    (projectId: string) => roadmapItems.filter((r) => r.projectId === projectId),
    [roadmapItems]
  );

  const addRoadmapItem = useCallback((data: Omit<RoadmapItem, "id">): RoadmapItem => {
    const id   = crypto.randomUUID();
    const item: RoadmapItem = { ...data, id };
    setRoadmapItems((prev) => [...prev, item]);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === data.projectId
          ? { ...p, updatedAt: new Date(), _count: { ...p._count, roadmapItems: p._count.roadmapItems + 1 } }
          : p
      )
    );
    dbAddRoadmapItem({
      id,
      project_id:  data.projectId,
      title:       data.title,
      description: data.description ?? null,
      status:      data.status as never,
      sort_order:  data.sortOrder,
    }).catch(console.error);
    return item;
  }, []);

  const updateRoadmapItem = useCallback((
    id: string,
    updates: Partial<Omit<RoadmapItem, "id" | "projectId">>,
  ) => {
    setRoadmapItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    const item = roadmapRef.current.find((r) => r.id === id);
    if (!item) return;
    const dbU: Record<string, unknown> = {};
    if ("title"       in updates) dbU.title       = updates.title;
    if ("description" in updates) dbU.description = updates.description ?? null;
    if ("status"      in updates) dbU.status      = updates.status;
    if ("sortOrder"   in updates) dbU.sort_order  = updates.sortOrder;
    (dbUpdateRoadmapItem as (id: string, pid: string, u: Record<string, unknown>) => Promise<void>)(id, item.projectId, dbU)
      .catch(console.error);
  }, []);

  const deleteRoadmapItem = useCallback((id: string) => {
    const item = roadmapRef.current.find((r) => r.id === id);
    setRoadmapItems((prev) => prev.filter((r) => r.id !== id));
    if (item) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === item.projectId
            ? { ...p, _count: { ...p._count, roadmapItems: Math.max(0, p._count.roadmapItems - 1) } }
            : p
        )
      );
      dbDeleteRoadmapItem(id, item.projectId).catch(console.error);
    }
  }, []);

  // ── Link mutations ────────────────────────────────────────────────────────────

  const getLinks = useCallback(
    (projectId: string) => links.filter((l) => l.projectId === projectId),
    [links]
  );

  const addLink = useCallback((data: Omit<ProjectLink, "id">): ProjectLink => {
    const id   = crypto.randomUUID();
    const link: ProjectLink = { ...data, id };
    setLinks((prev) => [...prev, link]);
    dbAddLink({
      id,
      project_id: data.projectId,
      title:      data.title,
      url:        data.url,
      type:       data.type as never,
    }).catch(console.error);
    return link;
  }, []);

  const deleteLink = useCallback((id: string) => {
    const link = linksRef.current.find((l) => l.id === id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    if (link) dbDeleteLink(id, link.projectId).catch(console.error);
  }, []);

  // ── File mutations ────────────────────────────────────────────────────────────

  const getProjectFiles = useCallback(
    (projectId: string) => projectFiles.filter((f) => f.projectId === projectId),
    [projectFiles]
  );

  /** Add an already-resolved ProjectFile to local state (used after S3 upload). */
  const addProjectFile = useCallback((data: Omit<ProjectFile, "id">): ProjectFile => {
    const file: ProjectFile = { ...data, id: crypto.randomUUID() };
    setProjectFiles((prev) => [file, ...prev]);
    return file;
  }, []);

  /**
   * Full S3 upload flow:
   *  1. Get presigned PUT URL from server
   *  2. PUT file bytes directly to S3 from the browser
   *  3. Save metadata to Supabase
   *  4. Get presigned GET URL
   *  5. Add to local state
   */
  const uploadFile = useCallback(async (file: File, projectId: string): Promise<void> => {
    const mimeType = file.type || "application/octet-stream";

    // 1 — Presigned PUT URL
    const { uploadUrl, s3Key } = await requestUploadUrl({
      project_id: projectId,
      filename:   file.name,
      mime_type:  mimeType,
    });

    // 2 — Upload bytes straight to S3 (no server round-trip for the data)
    const putResp = await fetch(uploadUrl, {
      method:  "PUT",
      body:    file,
      headers: { "Content-Type": mimeType },
    });
    if (!putResp.ok) throw new Error(`S3 upload failed: ${putResp.status} ${putResp.statusText}`);

    // 3 — Persist metadata in Supabase
    const saved = await saveProjectFile({
      project_id: projectId,
      name:       file.name,
      mime_type:  mimeType,
      size:       file.size,
      s3_key:     s3Key,
    });

    // 4 — Get a short-lived download URL so the file is immediately viewable
    const downloadUrl = await getFileUrl(s3Key);

    // 5 — Update local state (uses real Supabase-generated ID)
    setProjectFiles((prev) => [{
      id:        saved.id,
      projectId,
      name:      file.name,
      mimeType,
      size:      file.size,
      dataUrl:   downloadUrl,
      s3Key,
      createdAt: saved.created_at,
    }, ...prev]);
  }, []);

  const deleteProjectFile = useCallback((id: string) => {
    const file = projectFiles.find((f) => f.id === id);
    setProjectFiles((prev) => prev.filter((f) => f.id !== id));
    if (file?.s3Key) {
      // Delete from both S3 and Supabase
      dbDeleteProjectFile(id, file.projectId, file.s3Key).catch(console.error);
    }
  }, [projectFiles]);

  // ── GitHub mutations ──────────────────────────────────────────────────────────

  const saveGithubToken = useCallback(async (rawToken: string): Promise<void> => {
    await dbSaveGithubToken(rawToken);
    setHasGithubToken(true);
  }, []);

  const clearGithubToken = useCallback(async (): Promise<void> => {
    await dbClearGithubToken();
    setHasGithubToken(false);
  }, []);

  const linkRepo = useCallback(async (projectId: string, fullName: string): Promise<void> => {
    const repo = await dbLinkRepo(projectId, fullName);
    setProjects((prev) =>
      prev.map((p) => p.id === projectId ? { ...p, githubRepo: repo } : p)
    );
  }, []);

  const unlinkRepo = useCallback(async (projectId: string): Promise<void> => {
    await dbUnlinkRepo(projectId);
    setProjects((prev) =>
      prev.map((p) => p.id === projectId ? { ...p, githubRepo: null } : p)
    );
  }, []);

  const syncRepo = useCallback(async (projectId: string): Promise<void> => {
    const repo = await dbSyncRepo(projectId);
    setProjects((prev) =>
      prev.map((p) => p.id === projectId ? { ...p, githubRepo: repo } : p)
    );
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        loading,
        refreshProjects,
        addProject,
        updateProject,
        deleteProject,
        getProject,
        timelineEvents,
        getTimeline,
        addTimelineEvent,
        deleteTimelineEvent,
        roadmapItems,
        getRoadmapItems,
        addRoadmapItem,
        updateRoadmapItem,
        deleteRoadmapItem,
        links,
        getLinks,
        addLink,
        deleteLink,
        projectFiles,
        getProjectFiles,
        addProjectFile,
        uploadFile,
        deleteProjectFile,
        pin,
        setPin,
        clearPin,
        isReadOnly,
        hasGithubToken:  hasGithubTokenSt,
        saveGithubToken,
        clearGithubToken,
        linkRepo,
        unlinkRepo,
        syncRepo,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}
