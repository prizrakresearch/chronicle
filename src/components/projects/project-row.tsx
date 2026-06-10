"use client";

import Link from "next/link";
import { MoreHorizontal, GitBranch, Clock, Trash2, Archive, RotateCcw, ExternalLink } from "lucide-react";
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
import { getAvatarColor, getInitials } from "./project-card";

interface ProjectRowProps {
  project: Project;
}

function ProjectAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 select-none", getAvatarColor(name))}>
      {getInitials(name)}
    </div>
  );
}

export function ProjectRow({ project }: ProjectRowProps) {
  const { updateProject, deleteProject } = useProjects();
  const repoShortName = project.githubRepo?.fullName.split("/")[1] ?? null;

  return (
    <div className="group flex items-center gap-4 px-5 py-5 hover:bg-white/[0.025] transition-colors duration-200 ease-out">
      <ProjectAvatar name={project.name} logoUrl={project.logoUrl} />

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/projects/${project.id}`}
          className="font-semibold text-[14px] text-white/85 hover:text-primary/90 transition-colors duration-150 truncate block"
        >
          {project.name}
        </Link>
        {project.description && (
          <p className="mt-0.5 text-[12px] text-white/35 truncate">
            {project.description}
          </p>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 shrink-0">
        <ProjectStatusBadge status={project.status} size="sm" />
        <div className="flex items-center gap-4 text-[11px] text-white/30">
          {repoShortName && (
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3" />
              {repoShortName}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3" />
            {project._count.timelineEvents} events
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {formatRelativeDate(project.updatedAt)}
          </span>
        </div>
      </div>

      {/* Context menu */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="h-7 w-7 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
              onClick={() => deleteProject(project.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
