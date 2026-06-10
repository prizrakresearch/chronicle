"use client";

import { useState } from "react";
import { GitBranch, Star, Clock, Map, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { STATUS_LABELS } from "@/lib/utils/constants";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { formatLastSynced } from "@/lib/utils/format";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types";

interface OverviewPanelProps {
  project: Project;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

export function OverviewPanel({ project }: OverviewPanelProps) {
  const { updateProject, getTimeline, getRoadmapItems } = useProjects();
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(project.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);

  const timelineCount = getTimeline(project.id).length;
  const roadmapCount = getRoadmapItems(project.id).length;

  async function handleSaveDesc() {
    setSavingDesc(true);
    await new Promise((r) => setTimeout(r, 150));
    updateProject(project.id, { description: descValue.trim() || null });
    setSavingDesc(false);
    setEditingDesc(false);
  }

  return (
    <div className="max-w-2xl space-y-8">

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Description</SectionLabel>
          {!editingDesc && (
            <button
              onClick={() => { setEditingDesc(true); setDescValue(project.description ?? ""); }}
              className="text-zinc-700 hover:text-zinc-400 p-1 -mt-1 rounded transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>

        {editingDesc ? (
          <div className="space-y-2.5">
            <Textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Describe this project…"
              className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-600 resize-none text-sm leading-relaxed"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDesc} disabled={savingDesc}
                className="h-7 text-xs bg-zinc-100 text-zinc-900 hover:bg-white px-3">
                {savingDesc ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}
                className="h-7 text-xs text-zinc-500 hover:text-zinc-300">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => { setEditingDesc(true); setDescValue(project.description ?? ""); }}
            className={cn(
              "text-sm leading-relaxed cursor-text hover:text-zinc-100 transition-colors",
              project.description ? "text-zinc-300" : "text-zinc-600 italic"
            )}
          >
            {project.description ?? "Add a description…"}
          </p>
        )}
      </div>

      {/* Status */}
      <div>
        <SectionLabel>Status</SectionLabel>
        <Select value={project.status} onValueChange={(v) => updateProject(project.id, { status: v as ProjectStatus })}>
          <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800 text-zinc-100 h-8 text-sm hover:border-zinc-700 transition-colors">
            <span className="flex items-center gap-2">
              <ProjectStatusBadge status={project.status} size="sm" />
            </span>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div>
        <SectionLabel>Stats</SectionLabel>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-1.5 text-zinc-600 mb-3">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[11px] uppercase tracking-wide font-semibold">Events</span>
            </div>
            <p className="text-3xl font-bold text-zinc-100 tabular-nums">{timelineCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-1.5 text-zinc-600 mb-3">
              <Map className="h-3.5 w-3.5" />
              <span className="text-[11px] uppercase tracking-wide font-semibold">Roadmap</span>
            </div>
            <p className="text-3xl font-bold text-zinc-100 tabular-nums">{roadmapCount}</p>
          </div>
        </div>
      </div>

      {/* GitHub */}
      {project.githubRepo && (
        <div>
          <SectionLabel>GitHub</SectionLabel>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <a
                href={`https://github.com/${project.githubRepo.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-zinc-100 hover:text-white transition-colors group"
              >
                <GitBranch className="h-4 w-4 text-zinc-400 group-hover:text-zinc-300" />
                {project.githubRepo.fullName}
              </a>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Star className="h-3 w-3" />
                {project.githubRepo.stars}
              </span>
            </div>
            {project.githubRepo.description && (
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                {project.githubRepo.description}
              </p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-xs text-zinc-600">
                {formatLastSynced(project.githubRepo.lastSyncedAt)}
              </span>
              <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                <RefreshCw className="h-3 w-3" />
                Sync now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
