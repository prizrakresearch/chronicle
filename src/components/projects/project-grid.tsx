"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, FolderOpen, LayoutGrid, Zap, PauseCircle, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectRow } from "./project-row";
import { ProjectCardSkeleton } from "./project-card-skeleton";
import { CreateProjectDialog } from "./create-project-dialog";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: ProjectStatus | "all"; icon: React.ReactNode }[] = [
  { label: "All", value: "all", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { label: "Active", value: "active", icon: <Zap className="h-3.5 w-3.5" /> },
  { label: "Paused", value: "paused", icon: <PauseCircle className="h-3.5 w-3.5" /> },
  { label: "Archived", value: "archived", icon: <Archive className="h-3.5 w-3.5" /> },
];

export function ProjectGrid() {
  const { projects } = useProjects();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [loading] = useState(false);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLDivElement>(null);

  // ── Smooth scroll via transform (zero repaint) ───────────────────────────
  //
  // Setting scrollTop triggers layout + paint every frame → text anti-aliasing
  // changes slightly each frame → shimmer on white-on-black text.
  //
  // transform: translateY() is compositor-only: content is rasterised once,
  // then the GPU moves the texture. Text renders identically every frame.
  useEffect(() => {
    const viewport = scrollRef.current;
    const content  = contentRef.current;
    if (!viewport || !content) return;

    let pos    = 0;
    let target = 0;
    let rafId  = 0;

    const maxScroll = () =>
      Math.max(0, content.offsetHeight - viewport.offsetHeight);

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

  // Keep --header-h in sync for anything that needs it
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

  const filtered = useMemo(() => {
    let list = [...projects];
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [projects, search, statusFilter]);

  return (
    // Flex column: header sits above the scroll area — rows can never scroll into it
    <div className="h-full flex flex-col">

      {/* ── Header (outside the scroll container) ── */}
      <div ref={headerRef} className="shrink-0 z-20">
        {/* Topbar */}
        <div className="py-5 px-6 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-white/80">Chronicle</h1>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 gap-2 transition-colors duration-75 ease-out"
          >
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </div>

        {/* Dashboard title + search/filters */}
        <div className="px-6 pt-2 pb-6 flex items-center justify-between gap-6">
          <div className="shrink-0">
            <h2 className="text-4xl font-bold text-white/90 tracking-tight">Dashboard</h2>
            <p className="mt-1 text-sm text-white/40">
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-52 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 group-hover:text-primary/75 pointer-events-none transition-colors duration-75" />
              <Input
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 bg-transparent border border-white/10 text-white/70 placeholder:text-white/30 text-sm rounded-full hover:border-primary/75 hover:text-primary/75 hover:placeholder:text-primary/40 focus-visible:ring-0 focus-visible:outline-none focus-visible:border-primary/75 transition-colors duration-75"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "group h-11 pl-1 pr-4 rounded-full text-sm font-medium border flex items-center gap-2.5 transition-colors duration-75 ease-out",
                    statusFilter === f.value
                      ? "bg-transparent text-primary/75 border-transparent"
                      : "bg-transparent text-white/50 border-white/10 hover:border-transparent hover:text-primary/75"
                  )}
                >
                  <span className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-75",
                    statusFilter === f.value ? "bg-primary/75" : "bg-zinc-800 group-hover:bg-primary/75"
                  )}>
                    <span className={cn("transition-colors duration-75 group-hover:text-black", statusFilter === f.value && "text-black")}>
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
      {/* ── End header ── */}

      {/* ── Scrollable rows ── */}
      {/* viewport: clips content at its edges, no native scroll */}
      <div ref={scrollRef} className="flex-1 overflow-hidden">
        {/* content mover: GPU transform only — never triggers a repaint */}
        <div ref={contentRef} className="px-6 pb-16" style={{ willChange: "transform" }}>
          {loading ? (
            <div className="rounded-3xl border border-border/50 overflow-hidden bg-black/35 backdrop-blur-sm">
              {Array.from({ length: 4 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
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
              {!search && statusFilter === "all" && (
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
            <div className="flex flex-col">
              {filtered.map((project) => (
                <div key={project.id} style={{ marginBottom: "4px" }}>
                  <ProjectRow project={project} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
