"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, GitBranch, Clock, Trash2, Archive, RotateCcw } from "lucide-react";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectStatusBadge } from "./project-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeDate } from "@/lib/utils/format";
import { useProjects } from "@/lib/store/projects-context";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
}

const AVATAR_PALETTES = [
  "bg-violet-500/15 text-violet-300",
  "bg-sky-500/15 text-sky-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-amber-500/15 text-amber-300",
  "bg-rose-500/15 text-rose-300",
  "bg-indigo-500/15 text-indigo-300",
];

export function getAvatarColor(name: string) {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];
}

export function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function ProjectAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className="w-9 h-9 rounded-lg object-cover shrink-0" />;
  }
  return (
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0 select-none", getAvatarColor(name))}>
      {getInitials(name)}
    </div>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { updateProject, deleteProject } = useProjects();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const repoShortName = project.githubRepo?.fullName.split("/")[1] ?? null;

  return (
    <>
    <div className="group relative flex flex-col rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-150">
      {/* Main content */}
      <Link href={`/projects/${project.id}`} className="flex-1 p-5 block">
        <div className="flex items-start gap-3">
          <ProjectAvatar name={project.name} logoUrl={project.logoUrl} />

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-foreground text-[15px] leading-tight truncate">
                {project.name}
              </h3>
              <span className="shrink-0">
                <ProjectStatusBadge status={project.status} size="sm" />
              </span>
            </div>

            {project.description && (
              <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          {/* Context menu */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-1 -mr-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/80 transition-colors"
                onClick={(e: React.MouseEvent) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() =>
                    updateProject(project.id, {
                      status: project.status === "archived" ? "active" : "archived",
                    })
                  }
                >
                  {project.status === "archived" ? (
                    <><RotateCcw className="h-4 w-4 mr-2" />Restore</>
                  ) : (
                    <><Archive className="h-4 w-4 mr-2" />Archive</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/60 flex items-center gap-3 text-[11px] text-muted-foreground/70">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(project.updatedAt)}
        </span>
        {repoShortName && (
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <GitBranch className="h-3 w-3 shrink-0" />
            <span className="truncate">{repoShortName}</span>
          </span>
        )}
        <span className="ml-auto tabular-nums">
          {project._count.timelineEvents} <span className="text-muted-foreground/40">events</span>
        </span>
      </div>
    </div>
      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        projectName={project.name}
        onConfirm={() => deleteProject(project.id)}
      />
    </>
  );
}
