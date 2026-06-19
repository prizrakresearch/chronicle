"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import {
  MoreHorizontal, GitBranch, Clock, Trash2, Archive, RotateCcw,
  CircleDot, Pin, PinOff, EyeOff, Share2, Check,
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
} from "lucide-react";
import { ProjectStatusBadge } from "./project-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PinDialog } from "./pin-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { formatRelativeDate } from "@/lib/utils/format";
import { useProjects } from "@/lib/store/projects-context";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";
import { getAvatarColor } from "./project-card";

const PLACEHOLDER_ICONS = [
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
];

function getProjectIcon(name: string) {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % PLACEHOLDER_ICONS.length;
  return PLACEHOLDER_ICONS[idx];
}

interface ProjectRowProps {
  project: Project;
  dimmed?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function ProjectAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className="w-14 h-14 rounded-full object-cover shrink-0" />;
  }
  const Icon = getProjectIcon(name);
  return (
    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 select-none", getAvatarColor(name))}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function ProjectRow({ project, dimmed = false, selected, onToggleSelect }: ProjectRowProps) {
  const { updateProject, deleteProject, pin, setPin, isReadOnly } = useProjects();
  const router = useRouter();
  const [pinSetupOpen,    setPinSetupOpen]    = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const repoShortName = project.githubRepo?.fullName.split("/")[1] ?? null;
  const isPinned   = project.pinned    ?? false;
  const isHidden   = project.hidden    ?? false;
  const isShared   = project.isShared  ?? false;

  function handleHide() {
    if (!pin) {
      // No PIN set yet — open setup dialog
      setPinSetupOpen(true);
    } else {
      updateProject(project.id, { hidden: true });
    }
  }

  function handlePinSetup(newPin: string) {
    setPin(newPin);
    updateProject(project.id, { hidden: true });
  }

  return (
    <>
      {/* ── Mobile card layout ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "md:hidden group flex items-center gap-3 p-3 rounded-2xl border transition-colors duration-200 ease-out cursor-pointer",
          onToggleSelect
            ? selected
              ? "border-primary/40 bg-primary/10"
              : "border-border/50 bg-black/5 active:bg-white/[0.04]"
            : "border-border/50 bg-black/5 hover:bg-white/[0.04] hover:border-border/80",
          dimmed && "opacity-50"
        )}
        onClick={() => onToggleSelect ? onToggleSelect() : router.push(`/projects/${project.id}`)}
      >
        {onToggleSelect !== undefined ? (
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150",
            selected ? "bg-primary border-primary" : "border-white/25"
          )}>
            {selected && <Check className="h-3 w-3 text-black" />}
          </div>
        ) : null}
        <ProjectAvatar name={project.name} logoUrl={project.logoUrl} />

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-lg text-white/90 group-hover:text-primary/90 transition-colors duration-150 truncate">
              {project.name}
            </span>
            {isPinned && <Pin className="h-3 w-3 text-primary/50 shrink-0 rotate-45" />}
            {isHidden && <EyeOff className="h-3 w-3 text-white/25 shrink-0" />}
          </div>
          {(project.brief ?? project.description) && (
            <p className="text-[12px] text-white/40 truncate leading-snug">
              {project.brief ?? project.description}
            </p>
          )}
          <div className="flex items-center gap-2.5 flex-wrap">
            <ProjectStatusBadge status={project.status} size="sm" />
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <GitBranch className="h-3 w-3" />
              {project.githubRepo?.defaultBranch ?? "no branch"}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <Clock className="h-3 w-3" />
              {formatRelativeDate(project.updatedAt)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <CircleDot className="h-3 w-3" />
              {project._count.roadmapItems} open
            </span>
          </div>
        </div>
      </div>

      {/* ── Tablet / desktop row layout (untouched) ──────────────────────── */}
      <div
        className={cn(
          "hidden md:flex group items-center gap-4 pl-2 pr-4 py-2 rounded-full border border-border/50 bg-black/5 hover:bg-white/[0.04] hover:border-border/80 transition-colors duration-200 ease-out cursor-pointer",
          dimmed && "opacity-50 hover:opacity-80"
        )}
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        <ProjectAvatar name={project.name} logoUrl={project.logoUrl} />

        {/* Title stacked above description */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-[14px] text-white/85 group-hover:text-primary/90 transition-colors duration-150 truncate">
              {project.name}
            </span>
            {isPinned && (
              <Pin className="h-3 w-3 text-primary/50 shrink-0 rotate-45" />
            )}
            {isHidden && (
              <EyeOff className="h-3 w-3 text-white/25 shrink-0" />
            )}
          </div>
          {(project.brief ?? project.description) && (
            <p className="text-[11px] text-white/35 truncate leading-snug">
              {project.brief ?? project.description}
            </p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] shrink-0">
          <ProjectStatusBadge status={project.status} size="sm" />
          <span className="flex items-center gap-1.5 text-white/30">
            <GitBranch className="h-3 w-3" />
            {project.githubRepo?.defaultBranch ?? "no branch"}
          </span>
          <span className="flex items-center gap-1.5 text-white/30">
            <Clock className="h-3 w-3" />
            {formatRelativeDate(project.updatedAt)}
          </span>
          <span className="flex items-center gap-1.5 text-white/30">
            <CircleDot className="h-3 w-3" />
            {project._count.roadmapItems} open
          </span>
        </div>

        {/* Context menu — hidden for read-only guests */}
        {!isReadOnly && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7 w-7 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">

                {/* Pin / Unpin */}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); updateProject(project.id, { pinned: !isPinned }); }}
                >
                  {isPinned ? (
                    <><PinOff className="h-3.5 w-3.5 mr-2 opacity-60" />Unpin</>
                  ) : (
                    <><Pin className="h-3.5 w-3.5 mr-2 opacity-60 rotate-45" />Pin to top</>
                  )}
                </DropdownMenuItem>

                {/* Hide / Unhide */}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); isHidden ? updateProject(project.id, { hidden: false }) : handleHide(); }}>
                  <EyeOff className="h-3.5 w-3.5 mr-2 opacity-60" />
                  {isHidden ? "Unhide" : "Hide"}
                </DropdownMenuItem>

                {/* Public share page toggle */}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); updateProject(project.id, { isShared: !isShared }); }}
                >
                  <Share2 className="h-3.5 w-3.5 mr-2 opacity-60" />
                  {isShared ? "Disable public link" : "Enable public link"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Archive / Restore */}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); updateProject(project.id, { status: project.status === "archived" ? "active" : "archived" }); }}
                >
                  {project.status === "archived" ? (
                    <><RotateCcw className="h-3.5 w-3.5 mr-2 opacity-60" />Restore</>
                  ) : (
                    <><Archive className="h-3.5 w-3.5 mr-2 opacity-60" />Archive</>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Delete */}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* PIN setup dialog (triggered when hiding without a PIN) */}
      <PinDialog
        mode="setup"
        storedPin={null}
        open={pinSetupOpen}
        onOpenChange={setPinSetupOpen}
        onUnlock={() => {}}
        onSetPin={handlePinSetup}
      />
      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectName={project.name}
        onConfirm={() => deleteProject(project.id)}
      />
    </>
  );
}
