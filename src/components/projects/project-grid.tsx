"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus, Search, FolderOpen, LayoutGrid, Zap, PauseCircle, Archive,
  EyeOff, Lock, Unlock, GitBranch, Filter, X, Trash2,
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
  const { projects, loading, pin, setPin, isReadOnly, deleteProject } = useProjects();
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<ProjectStatus | "all">("all");
  const [createOpen,    setCreateOpen]    = useState(false);
  const [importOpen,    setImportOpen]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [hiddenVisible, setHiddenVisible] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<"unlock" | "setup">("unlock");

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [rightTab,       setRightTab]       = useState<"calendar" | "notes">("calendar");

  // ── Batch select (mobile only) ───────────────────────────────────────────────
  const [selectMode,        setSelectMode]        = useState(false);
  const [selected,          setSelected]          = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function handleBatchDelete() {
    selected.forEach((id) => deleteProject(id));
    setBatchDeleteConfirm(false);
    exitSelectMode();
  }

  const scrollRef          = useRef<HTMLDivElement>(null);
  const contentRef         = useRef<HTMLDivElement>(null);
  const headerRef          = useRef<HTMLDivElement>(null);
  const filterMenuRef      = useRef<HTMLDivElement>(null);
  const mobileFilterMenuRef    = useRef<HTMLDivElement>(null);

  // ── Smooth transform scroll (tablet/desktop only) ───────────────────────────
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

  // Close filter dropdown when tapping outside
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const inTablet = filterMenuRef.current?.contains(e.target as Node);
      const inMobile = mobileFilterMenuRef.current?.contains(e.target as Node);
      if (!inTablet && !inMobile) setFilterMenuOpen(false);
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
      const pa = a.pinned ?? false;
      const pb = b.pinned ?? false;
      if (pa !== pb) return pa ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [projects, search, statusFilter]);

  const hiddenProjects = useMemo(
    () => projects.filter((p) => p.hidden ?? false),
    [projects]
  );

  useEffect(() => {
    if (hiddenProjects.length === 0) setHiddenVisible(false);
  }, [hiddenProjects.length]);

  // ── Hidden section handlers ──────────────────────────────────────────────────

  function handleHiddenClick() {
    if (hiddenVisible) { setHiddenVisible(false); return; }
    if (!pin) { setPinDialogMode("setup"); setPinDialogOpen(true); }
    else      { setPinDialogMode("unlock"); setPinDialogOpen(true); }
  }
  function handleUnlock()            { setHiddenVisible(true); }
  function handlePinSetup(p: string) { setPin(p); setHiddenVisible(true); }

  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // ── Shared project list JSX ──────────────────────────────────────────────────

  function ProjectList({ padX = "px-6", selectable = false }: { padX?: string; selectable?: boolean }) {
    return (
      <>
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
              <Button onClick={() => setCreateOpen(true)} size="sm"
                className="mt-5 h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New project
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {visible.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                selected={selectable ? selected.has(project.id) : undefined}
                onToggleSelect={selectable ? () => toggleSelect(project.id) : undefined}
              />
            ))}

            {visible.length === 0 && hiddenProjects.length > 0 && (
              <p className="text-xs text-white/25 text-center py-8">
                No visible projects match — {hiddenProjects.length} hidden
              </p>
            )}

            {hiddenProjects.length > 0 && (
              <div className="mt-3">
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
                  <span>{hiddenVisible ? "Hiding" : "Hidden"} — {hiddenProjects.length} project{hiddenProjects.length !== 1 ? "s" : ""}</span>
                  <span className="ml-auto">
                    {hiddenVisible
                      ? <Unlock className="h-3.5 w-3.5 text-primary/50" />
                      : <Lock className="h-3.5 w-3.5" />}
                  </span>
                </button>
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
      </>
    );
  }

  // ── Mobile filter dropdown (shared UI) ──────────────────────────────────────

  function MobileFilterDropdown() {
    if (!filterMenuOpen) return null;
    return (
      <div className="absolute right-0 top-full mt-1.5 z-50 bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-xl min-w-[160px]">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setFilterMenuOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition duration-200 ease-in-out",
              statusFilter === f.value ? "bg-primary/15 text-primary/80" : "text-white/50 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <span className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
              statusFilter === f.value ? "bg-primary/75" : "bg-zinc-800")}>
              <span className={statusFilter === f.value ? "text-black" : ""}>{f.icon}</span>
            </span>
            {f.label}
          </button>
        ))}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ══════════════════════════════════════════════════
          MOBILE LAYOUT  (below md / 768px)
      ══════════════════════════════════════════════════ */}
      <div className="md:hidden h-full flex flex-col overflow-hidden">

        {/* Centered action modal */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-5 animate-in fade-in fill-mode-both"
            style={{ backdropFilter: "blur(2px)", background: "rgba(0,0,0,0.35)", animationDuration: "150ms" }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-[28px] border border-white/[0.08] p-4 shadow-2xl animate-in fade-in zoom-in-95 fill-mode-both"
              style={{ background: "rgba(9,9,11,0.97)", animationDuration: "220ms", animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[11px] font-semibold text-white/25 uppercase tracking-widest">Quick actions</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-7 h-7 rounded-full text-white/25 hover:text-white/60 flex items-center justify-center transition duration-150"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="h-11 w-full flex items-center gap-2.5 px-4 rounded-full border border-white/10 text-sm text-white/40 hover:border-white/20 hover:text-white/60 transition duration-150"
                >
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  Search all projects…
                </button>

                {!isReadOnly && (
                  <>
                    <button
                      onClick={() => { setImportOpen(true); setMobileMenuOpen(false); }}
                      className="h-11 w-full flex items-center gap-2.5 px-4 rounded-full border border-purple-500/30 text-sm font-medium text-purple-400/70 hover:bg-purple-500/10 transition duration-150"
                    >
                      <GitBranch className="h-3.5 w-3.5 shrink-0" />
                      Import from GitHub
                    </button>

                    <button
                      onClick={() => { setCreateOpen(true); setMobileMenuOpen(false); }}
                      className="h-11 w-full flex items-center gap-2.5 px-4 rounded-full border border-primary/75 text-sm font-semibold text-primary/75 hover:bg-primary/10 transition duration-150"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      New project
                    </button>
                  </>
                )}

                {/* Account row */}
                <div className="mt-1 pt-3 border-t border-white/[0.05]">
                  <UserBadge triggerClassName="w-full pr-5 justify-between" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky header block: Chronicle + Dashboard strip */}
        <div className="shrink-0 z-20">
          {/* Row 1: Chronicle wordmark */}
          <div className="flex items-center justify-center pt-8 pb-6">
            <span className="text-sm font-semibold text-white/80">Chronicle</span>
          </div>

          {/* Row 2: Dashboard title + action buttons */}
          <div className="flex items-end justify-between px-4 pt-4 pb-4">
            {selectMode ? (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-base font-semibold text-white/70">
                  {selected.size === 0 ? "Select projects" : `${selected.size} selected`}
                </span>
                <button
                  onClick={exitSelectMode}
                  className="h-9 px-4 rounded-full border border-white/15 text-sm text-white/50 hover:text-white/80 transition duration-150"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-white/90 tracking-tight">Dashboard</h2>
                  <p className="mt-0.5 text-sm text-white/40">{dateStr}</p>
                </div>
                <div className="pb-1 flex items-center gap-2">
                  {!isReadOnly && (
                    <button
                      onClick={() => setSelectMode(true)}
                      className="h-9 px-3.5 rounded-full border border-white/15 text-xs text-white/40 hover:text-white/70 hover:border-white/25 transition duration-150"
                    >
                      Select
                    </button>
                  )}
                  {!isReadOnly && (
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="w-10 h-10 rounded-full border border-primary/75 text-primary/75 flex items-center justify-center hover:bg-primary/10 active:scale-95 transition duration-150"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 3: Search + Filter */}
        <div className="shrink-0 z-20 flex items-center gap-2 px-4 py-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none transition duration-200" />
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 bg-transparent border border-white/10 text-white/70 placeholder:text-white/30 text-sm rounded-full focus-visible:ring-0 focus-visible:border-primary/75 transition duration-200"
            />
          </div>
          <div ref={mobileFilterMenuRef} className="relative shrink-0">
            <button
              onClick={() => setFilterMenuOpen((o) => !o)}
              className={cn(
                "h-11 px-4 rounded-full text-sm font-medium border flex items-center gap-2 transition duration-200",
                statusFilter !== "all"
                  ? "text-primary/75 border-primary/30 bg-primary/5"
                  : "text-white/50 border-white/10"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {statusFilter === "all" ? "Filters" : STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
            </button>
            <MobileFilterDropdown />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col" style={{ minHeight: "100%" }}>

          {/* Project rows */}
          <div className="px-4 pt-2 pb-14">
            <ProjectList selectable={selectMode} />
          </div>

          {/* Flex spacer: fills gap when few rows, collapses to 0 when many */}
          <div className="flex-1" />

          {/* Calendar / Notes section */}
          <div className="px-4 pb-20">
            <div className="border-t border-white/[0.05] pt-6">
              {/* Toggle */}
              <div className="flex gap-1.5 mb-3">
                <button
                  onClick={() => setRightTab("calendar")}
                  className={cn(
                    "flex-1 h-9 rounded-full text-xs font-medium border transition duration-200",
                    rightTab === "calendar"
                      ? "bg-primary/15 border-primary/30 text-primary/80"
                      : "border-white/10 text-white/35 hover:text-white/60"
                  )}
                >Calendar</button>
                <button
                  onClick={() => setRightTab("notes")}
                  className={cn(
                    "flex-1 h-9 rounded-full text-xs font-medium border transition duration-200",
                    rightTab === "notes"
                      ? "bg-primary/15 border-primary/30 text-primary/80"
                      : "border-white/10 text-white/35 hover:text-white/60"
                  )}
                >Notes</button>
              </div>
              {/* Panel */}
              <div className="rounded-[28px] border border-border/50 bg-black/50 overflow-hidden" style={{ height: 420 }}>
                {rightTab === "calendar" ? <CalendarPanel /> : <NotesPanel />}
              </div>
            </div>
          </div>

          </div>{/* end flex col inner */}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABLET / DESKTOP LAYOUT  (md+ / 768px+)
          Exactly the original code, untouched.
      ══════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col h-full overflow-hidden">

        {/* Full-width topbar */}
        <div className="shrink-0 py-5 px-6 flex items-center justify-between z-20">
          <h1 className="text-sm font-semibold text-white/80">Chronicle</h1>
          <div className="flex items-center gap-2">
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

          {/* Left column */}
          <div className="w-[60%] xl:w-[70%] flex flex-col">

            <div ref={headerRef} className="shrink-0 z-20">
              <div className="px-6 pt-2 pb-6 flex items-center justify-between gap-6">
                <div className="shrink-0">
                  <h2 className="text-2xl xl:text-4xl font-bold text-white/90 tracking-tight">Dashboard</h2>
                  <p className="mt-1 text-sm text-white/40">{dateStr}</p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative w-48 xl:w-52 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-hover:text-primary/75 pointer-events-none transition duration-200 ease-in-out" />
                    <Input
                      placeholder="Search projects…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-11 bg-transparent border border-white/10 text-white/70 placeholder:text-white/30 text-sm rounded-full hover:border-primary/75 hover:text-primary/75 hover:placeholder:text-primary/40 focus-visible:ring-0 focus-visible:outline-none focus-visible:border-primary/75 transition duration-200 ease-in-out"
                    />
                  </div>

                  {/* Compact filter dropdown — tablet only */}
                  <div ref={filterMenuRef} className="relative xl:hidden">
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
                  <div className="hidden xl:flex items-center gap-1.5">
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
                <ProjectList />
              </div>
            </div>

          </div>

          {/* Right column */}
          <div className="w-[40%] xl:w-[30%] flex flex-col overflow-hidden">

            {/* Tab toggle — tablet only */}
            <div className="xl:hidden shrink-0 flex gap-1.5 px-3 py-2">
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
                ? "flex flex-col flex-1 p-3 pt-1 xl:flex-none xl:h-1/2 xl:p-4 xl:pb-2"
                : "hidden xl:flex xl:flex-col xl:h-1/2 xl:p-4 xl:pb-2"
            )}>
              <div className="flex-1 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
                <CalendarPanel />
              </div>
            </div>

            {/* Notes panel */}
            <div className={cn(
              rightTab === "notes"
                ? "flex flex-col flex-1 p-3 pt-1 xl:flex-none xl:h-1/2 xl:p-4 xl:pt-2"
                : "hidden xl:flex xl:flex-col xl:h-1/2 xl:p-4 xl:pt-2"
            )}>
              <div className="flex-1 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
                <NotesPanel />
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── Batch delete action bar (mobile only, floats above content) ── */}
      {selectMode && selected.size > 0 && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => setBatchDeleteConfirm(true)}
            className="w-full h-13 flex items-center justify-center gap-2.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold active:scale-[0.98] transition duration-150"
            style={{ height: "3.25rem" }}
          >
            <Trash2 className="h-4 w-4" />
            Delete {selected.size} project{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* ── Batch delete confirm modal (mobile only) ── */}
      {batchDeleteConfirm && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ backdropFilter: "blur(2px)", background: "rgba(0,0,0,0.5)" }}
          onClick={() => setBatchDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-white/[0.08] p-5 shadow-2xl"
            style={{ background: "rgba(9,9,11,0.97)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-white/90 mb-1">
              Delete {selected.size} project{selected.size !== 1 ? "s" : ""}?
            </p>
            <p className="text-sm text-white/40 mb-5">This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setBatchDeleteConfirm(false)}
                className="flex-1 h-11 rounded-full border border-white/15 text-sm text-white/50 hover:text-white/80 transition duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex-1 h-11 rounded-full bg-red-500/15 border border-red-500/30 text-sm font-semibold text-red-400 hover:bg-red-500/25 transition duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs (portal-rendered, position in tree doesn't matter) */}
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
