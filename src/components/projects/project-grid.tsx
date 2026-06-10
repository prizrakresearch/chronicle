"use client";

import React, { useState, useMemo } from "react";
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
    <div className="min-h-screen">
      {/* Topbar */}
      <div className="sticky top-0 z-10 py-5 px-6 bg-transparent flex items-center justify-between">
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

      <div className="px-6 pt-2 pb-6 flex items-center justify-between gap-6">
        <div className="shrink-0">
          <h2 className="text-4xl font-bold text-white/90 tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-white/40">
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Search + filter */}
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
                  statusFilter === f.value
                    ? "bg-primary/75"
                    : "bg-zinc-800 group-hover:bg-primary/75"
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

      <div className="px-6 pb-6">
        {/* Grid */}
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
          <div className="rounded-3xl border border-border/50 overflow-hidden bg-black/35 backdrop-blur-sm">
            {filtered.map((project, i) => (
              <React.Fragment key={project.id}>
                <ProjectRow project={project} />
                {i < filtered.length - 1 && (
                  <div className="flex justify-center">
                    <div className="w-[95%] h-px bg-border/40" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
