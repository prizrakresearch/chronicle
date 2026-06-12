"use client";

import { useState } from "react";
import { GitBranch, Star, RefreshCw, Pencil, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProjectCalendarPanel } from "./project-calendar-panel";
import { formatLastSynced } from "@/lib/utils/format";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface OverviewPanelProps {
  project: Project;
  onOpenNotes?: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function EditableField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (val: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? "");
  const [saving,  setSaving]  = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 150));
    onSave(draft.trim() || null);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>{label}</SectionLabel>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setDraft(value ?? ""); }}
            className="text-zinc-700 hover:text-zinc-400 p-1 -mt-1 rounded transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2.5">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            placeholder={placeholder}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-600 resize-none text-sm leading-relaxed"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}
              className="h-7 text-xs bg-zinc-100 text-zinc-900 hover:bg-white px-3">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}
              className="h-7 text-xs text-zinc-500 hover:text-zinc-300">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p
          onClick={() => { setEditing(true); setDraft(value ?? ""); }}
          className={cn(
            "text-sm leading-relaxed cursor-text hover:text-zinc-100 transition-colors",
            value ? "text-zinc-300" : "text-zinc-600 italic"
          )}
        >
          {value ?? placeholder}
        </p>
      )}
    </div>
  );
}

export function OverviewPanel({ project, onOpenNotes }: OverviewPanelProps) {
  const { updateProject } = useProjects();

  return (
    <div className="h-full flex gap-6 overflow-hidden">

      {/* ── Left column: text fields ── */}
      <div className="flex-1 flex flex-col gap-8 overflow-y-auto min-h-0 pr-2">

        <EditableField
          label="Brief"
          value={project.brief}
          placeholder="One-line summary of the project…"
          onSave={(val) => updateProject(project.id, { brief: val })}
        />

        <EditableField
          label="Problem Statement"
          value={project.problemStatement}
          placeholder="What problem does this project solve?"
          onSave={(val) => updateProject(project.id, { problemStatement: val })}
        />

        <EditableField
          label="Description"
          value={project.description}
          placeholder="Add a description…"
          onSave={(val) => updateProject(project.id, { description: val })}
        />

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

      {/* ── Right column: calendar + open notes ── */}
      <div className="w-[28%] shrink-0 flex flex-col gap-3">

        <div className="flex-1 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
          <ProjectCalendarPanel
            events={project.calendarEvents}
            onEventsChange={(events) => updateProject(project.id, { calendarEvents: events })}
          />
        </div>

        <button
          onClick={onOpenNotes}
          className="shrink-0 h-11 px-5 w-full text-sm font-semibold rounded-full bg-transparent text-white/30 border border-white/10 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 transition duration-200 ease-in-out"
        >
          <NotebookPen className="h-3.5 w-3.5" />
          Open notes
        </button>

      </div>

    </div>
  );
}
