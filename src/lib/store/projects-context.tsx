"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Project, TimelineEvent, RoadmapItem, ProjectLink, ProjectStatus, RoadmapStatus } from "@/types";
import {
  MOCK_PROJECTS,
  MOCK_TIMELINE_EVENTS,
  MOCK_ROADMAP_ITEMS,
  MOCK_LINKS,
} from "@/lib/mock-data";

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

interface ProjectsContextValue {
  projects: Project[];
  addProject: (data: { name: string; description: string | null; status: ProjectStatus }) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, "id" | "createdAt" | "githubRepo">>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;

  timelineEvents: TimelineEvent[];
  getTimeline: (projectId: string) => TimelineEvent[];
  addTimelineEvent: (data: Omit<TimelineEvent, "id">) => TimelineEvent;
  deleteTimelineEvent: (id: string) => void;

  roadmapItems: RoadmapItem[];
  getRoadmapItems: (projectId: string) => RoadmapItem[];
  addRoadmapItem: (data: Omit<RoadmapItem, "id">) => RoadmapItem;
  updateRoadmapItem: (id: string, updates: Partial<Omit<RoadmapItem, "id" | "projectId">>) => void;
  deleteRoadmapItem: (id: string) => void;

  links: ProjectLink[];
  getLinks: (projectId: string) => ProjectLink[];
  addLink: (data: Omit<ProjectLink, "id">) => ProjectLink;
  deleteLink: (id: string) => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(MOCK_TIMELINE_EVENTS);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>(MOCK_ROADMAP_ITEMS);
  const [links, setLinks] = useState<ProjectLink[]>(MOCK_LINKS);

  const addProject = useCallback((data: { name: string; description: string | null; status: ProjectStatus }): Project => {
    const now = new Date();
    const project: Project = {
      id: "proj_" + uid(),
      name: data.name,
      description: data.description,
      status: data.status,
      logoUrl: null,
      createdAt: now,
      updatedAt: now,
      githubRepo: null,
      _count: { timelineEvents: 0, roadmapItems: 0 },
    };
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Omit<Project, "id" | "createdAt" | "githubRepo">>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p))
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTimelineEvents((prev) => prev.filter((e) => e.projectId !== id));
    setRoadmapItems((prev) => prev.filter((r) => r.projectId !== id));
    setLinks((prev) => prev.filter((l) => l.projectId !== id));
  }, []);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const getTimeline = useCallback(
    (projectId: string) => timelineEvents.filter((e) => e.projectId === projectId),
    [timelineEvents]
  );

  const addTimelineEvent = useCallback((data: Omit<TimelineEvent, "id">): TimelineEvent => {
    const event: TimelineEvent = { ...data, id: "evt_" + uid() };
    setTimelineEvents((prev) => [event, ...prev]);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === data.projectId
          ? { ...p, updatedAt: new Date(), _count: { ...p._count, timelineEvents: p._count.timelineEvents + 1 } }
          : p
      )
    );
    return event;
  }, []);

  const deleteTimelineEvent = useCallback((id: string) => {
    const event = timelineEvents.find((e) => e.id === id);
    setTimelineEvents((prev) => prev.filter((e) => e.id !== id));
    if (event) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === event.projectId
            ? { ...p, _count: { ...p._count, timelineEvents: Math.max(0, p._count.timelineEvents - 1) } }
            : p
        )
      );
    }
  }, [timelineEvents]);

  const getRoadmapItems = useCallback(
    (projectId: string) => roadmapItems.filter((r) => r.projectId === projectId),
    [roadmapItems]
  );

  const addRoadmapItem = useCallback((data: Omit<RoadmapItem, "id">): RoadmapItem => {
    const item: RoadmapItem = { ...data, id: "rd_" + uid() };
    setRoadmapItems((prev) => [...prev, item]);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === data.projectId
          ? { ...p, updatedAt: new Date(), _count: { ...p._count, roadmapItems: p._count.roadmapItems + 1 } }
          : p
      )
    );
    return item;
  }, []);

  const updateRoadmapItem = useCallback((id: string, updates: Partial<Omit<RoadmapItem, "id" | "projectId">>) => {
    setRoadmapItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const deleteRoadmapItem = useCallback((id: string) => {
    const item = roadmapItems.find((r) => r.id === id);
    setRoadmapItems((prev) => prev.filter((r) => r.id !== id));
    if (item) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === item.projectId
            ? { ...p, _count: { ...p._count, roadmapItems: Math.max(0, p._count.roadmapItems - 1) } }
            : p
        )
      );
    }
  }, [roadmapItems]);

  const getLinks = useCallback(
    (projectId: string) => links.filter((l) => l.projectId === projectId),
    [links]
  );

  const addLink = useCallback((data: Omit<ProjectLink, "id">): ProjectLink => {
    const link: ProjectLink = { ...data, id: "lnk_" + uid() };
    setLinks((prev) => [...prev, link]);
    return link;
  }, []);

  const deleteLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
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
