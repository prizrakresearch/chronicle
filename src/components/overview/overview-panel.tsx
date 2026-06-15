"use client";

import { useState } from "react";
import { GitBranch, Star, RefreshCw, Pencil, NotebookPen, Link2Off, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProjectCalendarPanel } from "./project-calendar-panel";
import { LinkRepoDialog } from "@/components/projects/link-repo-dialog";
import { LinkedProjectsSection } from "@/components/projects/linked-projects-section";
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
  isReadOnly = false,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (val: string | null) => void;
  isReadOnly?: boolean;
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
        {!editing && !isReadOnly && (
          <button
            onClick={() => { setEditing(true); setDraft(value ?? ""); }}
            className="text-zinc-700 hover:text-zinc-400 p-1 -mt-1 rounded transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {editing && !isReadOnly ? (
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
          onClick={!isReadOnly ? () => { setEditing(true); setDraft(value ?? ""); } : undefined}
          className={cn(
            "text-sm leading-relaxed transition-colors",
            value ? "text-zinc-300" : "text-zinc-600 italic",
            !isReadOnly && "cursor-text hover:text-zinc-100"
          )}
        >
          {value ?? placeholder}
        </p>
      )}
    </div>
  );
}

// ── GitHub card ───────────────────────────────────────────────────────────────

function GithubSection({ project }: { project: Project }) {
  const { syncRepo, unlinkRepo, hasGithubToken, isReadOnly } = useProjects();
  const [linkOpen,    setLinkOpen]    = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [unlinking,   setUnlinking]   = useState(false);

  async function handleSync() {
    setSyncing(true);
    try { await syncRepo(project.id); }
    catch (err) { console.error("[GithubSection] sync failed:", err); }
    finally { setSyncing(false); }
  }

  async function handleUnlink() {
    setUnlinking(true);
    try { await unlinkRepo(project.id); }
    catch (err) { console.error("[GithubSection] unlink failed:", err); }
    finally { setUnlinking(false); }
  }

  // ── Repo connected ────────────────────────────────────────────────────────────
  if (project.githubRepo) {
    const repo = project.githubRepo;
    return (
      <div>
        <SectionLabel>GitHub</SectionLabel>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          {/* Repo name + stars */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <a
              href={`https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors group"
            >
              <GitBranch className="h-4 w-4 text-white/30 group-hover:text-white/50 shrink-0" />
              <span className="truncate">{repo.fullName}</span>
            </a>
            <span className="flex items-center gap-1 text-xs text-white/30 shrink-0">
              <Star className="h-3 w-3" />
              {repo.stars.toLocaleString()}
            </span>
          </div>

          {/* Description */}
          {repo.description && (
            <p className="text-xs text-white/35 mb-3 leading-relaxed">
              {repo.description}
            </p>
          )}

          {/* Branch pill */}
          <div className="flex items-center gap-1.5 mb-3">
            <GitBranch className="h-3 w-3 text-white/20" />
            <span className="text-[11px] font-mono text-white/35">{repo.defaultBranch}</span>
          </div>

          {/* Footer: last synced + actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/20">
              {formatLastSynced(repo.lastSyncedAt)}
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  className="flex items-center gap-1 text-[11px] text-white/20 hover:text-red-400/70 transition-colors disabled:opacity-40"
                >
                  {unlinking
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Link2Off className="h-3 w-3" />}
                  {unlinking ? "Removing…" : "Disconnect"}
                </button>
                <span className="text-white/10">·</span>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                  {syncing ? "Syncing…" : "Sync now"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── No repo linked ─────────────────────────────────────────────────────────────
  if (isReadOnly) return null;

  return (
    <div>
      <SectionLabel>GitHub</SectionLabel>
      <button
        onClick={() => setLinkOpen(true)}
        disabled={!hasGithubToken}
        title={!hasGithubToken ? "Set up your GitHub token first (click your avatar → GitHub)" : undefined}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition duration-150",
          hasGithubToken
            ? "border-white/[0.07] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.04] cursor-pointer"
            : "border-dashed border-white/[0.06] bg-transparent cursor-not-allowed opacity-40"
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
          <Plus className="h-4 w-4 text-white/25" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/50">Connect a GitHub repo</p>
          <p className="text-xs text-white/25 mt-0.5">
            {hasGithubToken
              ? "Link this project to a GitHub repository"
              : "Set up a GitHub token first (avatar → GitHub)"}
          </p>
        </div>
      </button>

      <LinkRepoDialog
        projectId={project.id}
        open={linkOpen}
        onOpenChange={setLinkOpen}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function OverviewPanel({ project, onOpenNotes }: OverviewPanelProps) {
  const { updateProject, isReadOnly } = useProjects();

  return (
    <div className="h-full flex gap-6 overflow-hidden">

      {/* ── Left column: text fields ── */}
      <div className="flex-1 flex flex-col gap-8 overflow-y-auto min-h-0 pr-2">

        <EditableField
          label="Brief"
          value={project.brief}
          placeholder="One-line summary of the project…"
          onSave={(val) => updateProject(project.id, { brief: val })}
          isReadOnly={isReadOnly}
        />

        <EditableField
          label="Problem Statement"
          value={project.problemStatement}
          placeholder="What problem does this project solve?"
          onSave={(val) => updateProject(project.id, { problemStatement: val })}
          isReadOnly={isReadOnly}
        />

        <EditableField
          label="Description"
          value={project.description}
          placeholder="Add a description…"
          onSave={(val) => updateProject(project.id, { description: val })}
          isReadOnly={isReadOnly}
        />

        <GithubSection project={project} />

        <LinkedProjectsSection project={project} />

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
