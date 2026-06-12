"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus, Search, FolderOpen, LayoutGrid, Zap, PauseCircle, Archive,
  EyeOff, Lock, Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectRow } from "./project-row";
import { ProjectCardSkeleton } from "./project-card-skeleton";
import { CreateProjectDialog } from "./create-project-dialog";
import { PinDialog } from "./pin-dialog";
import { CalendarPanel } from "@/components/dashboard/calendar-panel";
import { NotesPanel } from "@/components/dashboard/notes-panel";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: ProjectStatus | "all"; icon: React.ReactNode }[] = [
  { label: "All",      value: "all",      icon: <LayoutGrid   className="h-3.5 w-3.5" /> },
  { label: "Active",   value: "active",   icon: <Zap          className="h-3.5 w-3.5" /> },
  { label: "Paused",   value: "paused",   icon: <PauseCircle  className="h-3.5 w-3.5" /> },
  { label: "Archived", value: "archived", icon: <Archive      className="h-3.5 w-3.5" /> },
];

export function ProjectGrid() {
  const { projects, pin, setPin, isReadOnly } = useProjects();
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [createOpen,   setCreateOpen]   = useState(false);
  const [loading] = useState(false);

  // Hidden-projects reveal state
  const [hiddenVisible, setHiddenVisible] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<"unlock" | "setup">("unlock");

  const scrollRef  = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);

  // ── Smooth transform scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const viewport = scrollRef.current;
    const content  = contentRef.current;
    if (!viewport || !content) return;

    let pos    = 0;
    let target = 0;
    let rafId  = 0;

    const maxScroll = () => Math.max(0, content.offsetHeight - viewport.offsetHeight);

    const tick = () => {
      rafId = 0;
      const diff = target - pos;
      if (Math.abs(diff) < 0.05) {
        pos = target;
        content.style.transform = `translateY(${-pos}px)`;
        return;
      }
      pos += diff * 0.1;
      content.style.transform = `translateY(${-pos}px)`;
      rafId = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 24;
      if (e.deltaMode === 2) delta *= viewport.clientHeight;
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    const scroll = scrollRef.current;
    if (!header || !scroll) return;
    const sync = () => scroll.style.setProperty("--header-h", `${header.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  // ── Filtered lists ───────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    let list = projects.filter((p) => !(p.hidden ?? false));
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      // Pinned float to top
      const pa = a.pinned ?? false;
      const pb = b.pinned ?? false;
      if (pa !== pb) return pa ? -1 : 1;
      // Then most-recently-updated
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [projects, search, statusFilter]);

  const hiddenProjects = useMemo(
    () => projects.filter((p) => p.hidden ?? false),
    [projects]
  );

  // When a hidden project is unhidden while the section is visible, keep it visible
  // but lock again if all are unhidden
  useEffect(() => {
    if (hiddenProjects.length === 0) setHiddenVisible(false);
  }, [hiddenProjects.length]);

  // ── Hidden section: click handler ────────────────────────────────────────────

  function handleHiddenClick() {
    if (hiddenVisible) {
      // already open → lock
      setHiddenVisible(false);
      return;
    }
    if (!pin) {
      // First use: no PIN set — show setup dialog
      setPinDialogMode("setup");
      setPinDialogOpen(true);
    } else {
      // PIN is set — show unlock dialog
      setPinDialogMode("unlock");
      setPinDialogOpen(true);
    }
  }

  function handleUnlock() {
    setHiddenVisible(true);
  }

  function handlePinSetup(newPin: string) {
    setPin(newPin);
    setHiddenVisible(true);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Full-width topbar */}
      <div className="shrink-0 py-5 px-6 flex items-center justify-between z-20">
        <h1 className="text-sm font-semibold text-white/80">Chronicle</h1>
        {!isReadOnly && (
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 gap-2 transition duration-200 ease-in-out"
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        )}
      </div>

      {/* 70 / 30 split */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left column (70%) */}
        <div className="w-[70%] flex flex-col">

          <div ref={headerRef} className="shrink-0 z-20">
            <div className="px-6 pt-2 pb-6 flex items-center justify-between gap-6">
              <div className="shrink-0">
                <h2 className="text-4xl font-bold text-white/90 tracking-tight">Dashboard</h2>
                <p className="mt-1 text-sm text-white/40">
                  {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative w-52 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-hover:text-primary/75 pointer-events-none transition duration-200 ease-in-out" />
                  <Input
                    placeholder="Search projects…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11 bg-transparent border border-white/10 text-white/70 placeholder:text-white/30 text-sm rounded-full hover:border-primary/75 hover:text-primary/75 hover:placeholder:text-primary/40 focus-visible:ring-0 focus-visible:outline-none focus-visible:border-primary/75 transition duration-200 ease-in-out"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={cn(
                        "group h-11 pl-1 pr-4 rounded-full text-sm font-medium border flex items-center gap-2.5 transition duration-200 ease-in-out",
                        statusFilter === f.value
                          ? "bg-transparent text-primary/75 border-transparent"
                          : "bg-transparent text-white/50 border-white/10 hover:border-transparent hover:text-primary/75"
                      )}
                    >
                      <span className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition duration-200 ease-in-out group-hover:scale-110",
                        statusFilter === f.value ? "bg-primary/75" : "bg-zinc-800 group-hover:bg-primary/75"
                      )}>
                        <span className={cn(
                          "transition duration-200 ease-in-out group-hover:text-black",
                          statusFilter === f.value && "text-black"
                        )}>
                          {f.icon}
                        </span>
                      </span>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rows scroll viewport */}
          <div ref={scrollRef} className="flex-1 overflow-hidden">
            <div ref={contentRef} className="px-6 pb-16" style={{ willChange: "transform" }}>
              {loading ? (
                <div className="rounded-3xl border border-border/50 overflow-hidden bg-black/35 backdrop-blur-sm">
                  {Array.from({ length: 4 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
                </div>
              ) : visible.length === 0 && hiddenProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mb-4">
                    <FolderOpen className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {search || statusFilter !== "all" ? "No projects match" : "No projects yet"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || statusFilter !== "all"
                      ? "Try a different search or filter"
                      : "Create your first project to get started"}
                  </p>
                  {!search && statusFilter === "all" && !isReadOnly && (
                    <Button
                      onClick={() => setCreateOpen(true)}
                      size="sm"
                      className="mt-5 h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New project
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">

                  {/* Visible projects (pinned float to top automatically) */}
                  {visible.map((project) => (
                    <ProjectRow key={project.id} project={project} />
                  ))}

                  {visible.length === 0 && hiddenProjects.length > 0 && (
                    <p className="text-xs text-white/25 text-center py-8">
                      No visible projects match — {hiddenProjects.length} hidden
                    </p>
                  )}

                  {/* ── Hidden projects section ── */}
                  {hiddenProjects.length > 0 && (
                    <div className="mt-3">
                      {/* Toggle button */}
                      <button
                        onClick={handleHiddenClick}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-5 py-3 rounded-full border text-sm font-medium transition duration-200",
                          hiddenVisible
                            ? "border-primary/20 bg-primary/5 text-primary/60 hover:bg-primary/10"
                            : "border-white/[0.06] text-white/25 hover:text-white/50 hover:border-white/10"
                        )}
                      >
                        <EyeOff className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {hiddenVisible ? "Hiding" : "Hidden"} — {hiddenProjects.length} project{hiddenProjects.length !== 1 ? "s" : ""}
                        </span>
                        <span className="ml-auto">
                          {hiddenVisible
                            ? <Unlock className="h-3.5 w-3.5 text-primary/50" />
                            : <Lock className="h-3.5 w-3.5" />
                          }
                        </span>
                      </button>

                      {/* Revealed hidden projects */}
                      {hiddenVisible && (
                        <div className="mt-2 flex flex-col gap-1">
                          {hiddenProjects.map((project) => (
                            <ProjectRow key={project.id} project={project} dimmed />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right column (30%): calendar + notes */}
        <div className="w-[30%] flex flex-col">
          <div className="h-1/2 flex flex-col p-4 pb-2">
            <div className="flex-1 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
              <CalendarPanel />
            </div>
          </div>
          <div className="h-1/2 flex flex-col p-4 pt-2">
            <div className="flex-1 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
              <NotesPanel />
            </div>
          </div>
        </div>

      </div>

      {/* Dialogs */}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PinDialog
        mode={pinDialogMode}
        storedPin={pin}
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        onUnlock={handleUnlock}
        onSetPin={handlePinSetup}
      />
    </div>
  );
}
