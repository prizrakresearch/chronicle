"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus, Search, FolderOpen, LayoutGrid, Zap, PauseCircle, Archive,
  EyeOff, Lock, Unlock, GitBranch, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectRow } from "./project-row";
import { ProjectCardSkeleton } from "./project-card-skeleton";
import { CreateProjectDialog } from "./create-project-dialog";
import { ImportGithubDialog } from "./import-github-dialog";
import { PinDialog } from "./pin-dialog";
import { CalendarPanel } from "@/components/dashboard/calendar-panel";
import { NotesPanel } from "@/components/dashboard/notes-panel";
import { useProjects } from "@/lib/store/projects-context";
import { UserBadge } from "@/components/layout/user-badge";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: ProjectStatus | "all"; icon: React.ReactNode }[] = [
  { label: "All",      value: "all",      icon: <LayoutGrid   className="h-3.5 w-3.5" /> },
  { label: "Active",   value: "active",   icon: <Zap          className="h-3.5 w-3.5" /> },
  { label: "Paused",   value: "paused",   icon: <PauseCircle  className="h-3.5 w-3.5" /> },
  { label: "Archived", value: "archived", icon: <Archive      className="h-3.5 w-3.5" /> },
];

export function ProjectGrid() {
  const { projects, loading, pin, setPin, isReadOnly } = useProjects();
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [createOpen,   setCreateOpen]   = useState(false);
  const [importOpen,   setImportOpen]   = useState(false);

  // Hidden-projects reveal state
  const [hiddenVisible, setHiddenVisible] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<"unlock" | "setup">("unlock");

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [rightTab,       setRightTab]       = useState<"calendar" | "notes">("calendar");

  const scrollRef    = useRef<HTMLDivElement>(null);
  const contentRef   = useRef<HTMLDivElement>(null);
  const headerRef    = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

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

  // Close filter dropdown when tapping outside (covers touch + mouse)
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
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
        <div className="flex items-center gap-2">
          {/* Global search trigger */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className="h-9 px-3.5 flex items-center gap-2 rounded-full border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition duration-150 text-xs"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] font-mono bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
          </button>
          {!isReadOnly && (
            <>
              <Button
                onClick={() => setImportOpen(true)}
                size="sm"
                className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-purple-400/70 border border-purple-500/30 hover:text-purple-300 hover:border-purple-400/60 hover:bg-purple-500/10 hover:-translate-y-px active:translate-y-0 gap-2 transition duration-200 ease-in-out"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Import
              </Button>
              <Button
                onClick={() => setCreateOpen(true)}
                size="sm"
                className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 gap-2 transition duration-200 ease-in-out"
              >
                <Plus className="h-3.5 w-3.5" />
                New project
              </Button>
            </>
          )}
          <UserBadge />
        </div>
      </div>

      {/* 70 / 30 split */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left column (60% tablet / 70% desktop) */}
        <div className="w-[60%] lg:w-[70%] flex flex-col">

          <div ref={headerRef} className="shrink-0 z-20">
            <div className="px-6 pt-2 pb-6 flex items-center justify-between gap-6">
              <div className="shrink-0">
                <h2 className="text-2xl lg:text-4xl font-bold text-white/90 tracking-tight">Dashboard</h2>
                <p className="mt-1 text-sm text-white/40">
                  {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative w-36 lg:w-52 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-hover:text-primary/75 pointer-events-none transition duration-200 ease-in-out" />
                  <Input
                    placeholder="Search projects…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11 bg-transparent border border-white/10 text-white/70 placeholder:text-white/30 text-sm rounded-full hover:border-primary/75 hover:text-primary/75 hover:placeholder:text-primary/40 focus-visible:ring-0 focus-visible:outline-none focus-visible:border-primary/75 transition duration-200 ease-in-out"
                  />
                </div>
                {/* Compact filter dropdown — tablet only */}
                <div ref={filterMenuRef} className="relative lg:hidden">
                  <button
                    onClick={() => setFilterMenuOpen((o) => !o)}
                    className={cn(
                      "h-11 px-4 rounded-full text-sm font-medium border flex items-center gap-2 transition duration-200 ease-in-out",
                      statusFilter !== "all"
                        ? "text-primary/75 border-primary/30 bg-primary/5"
                        : "text-white/50 border-white/10 hover:text-white/70 hover:border-white/20"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {statusFilter === "all" ? "Filters" : STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
                  </button>
                  {filterMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-xl min-w-[160px]">
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => { setStatusFilter(f.value); setFilterMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition duration-200 ease-in-out",
                            statusFilter === f.value
                              ? "bg-primary/15 text-primary/80"
                              : "text-white/50 hover:bg-white/5 hover:text-white/80"
                          )}
                        >
                          <span className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            statusFilter === f.value ? "bg-primary/75" : "bg-zinc-800"
                          )}>
                            <span className={statusFilter === f.value ? "text-black" : ""}>{f.icon}</span>
                          </span>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Individual filter buttons — desktop only */}
                <div className="hidden lg:flex items-center gap-1.5">
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
                <div className="rounded-3xl border border-border/50 overflow-hidden bg-black/35">
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

        {/* Right column (40% tablet / 30% desktop) */}
        <div className="w-[40%] lg:w-[30%] flex flex-col overflow-hidden">

          {/* Tab toggle — tablet only */}
          <div className="lg:hidden shrink-0 flex gap-1.5 px-3 py-2">
            <button
              onClick={() => setRightTab("calendar")}
              className={cn(
                "flex-1 h-8 rounded-full text-xs font-medium border transition duration-200 ease-in-out",
                rightTab === "calendar"
                  ? "bg-primary/15 border-primary/30 text-primary/80"
                  : "border-white/10 text-white/35 hover:text-white/60"
              )}
            >Calendar</button>
            <button
              onClick={() => setRightTab("notes")}
              className={cn(
                "flex-1 h-8 rounded-full text-xs font-medium border transition duration-200 ease-in-out",
                rightTab === "notes"
                  ? "bg-primary/15 border-primary/30 text-primary/80"
                  : "border-white/10 text-white/35 hover:text-white/60"
              )}
            >Notes</button>
          </div>

          {/* Calendar panel */}
          <div className={cn(
            rightTab === "calendar"
              ? "flex flex-col flex-1 p-3 pt-1 lg:flex-none lg:h-1/2 lg:p-4 lg:pb-2"
              : "hidden lg:flex lg:flex-col lg:h-1/2 lg:p-4 lg:pb-2"
          )}>
            <div className="flex-1 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
              <CalendarPanel />
            </div>
          </div>

          {/* Notes panel */}
          <div className={cn(
            rightTab === "notes"
              ? "flex flex-col flex-1 p-3 pt-1 lg:flex-none lg:h-1/2 lg:p-4 lg:pt-2"
              : "hidden lg:flex lg:flex-col lg:h-1/2 lg:p-4 lg:pt-2"
          )}>
            <div className="flex-1 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
              <NotesPanel />
            </div>
          </div>

        </div>

      </div>

      {/* Dialogs */}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ImportGithubDialog  open={importOpen} onOpenChange={setImportOpen} />
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
