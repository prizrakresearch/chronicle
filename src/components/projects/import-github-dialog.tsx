"use client";

import { useState, useEffect } from "react";
import { GitBranch, Lock, Star, CheckCheck, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listUserRepos, importReposAsProjects } from "@/lib/db/github";
import type { UserRepo } from "@/lib/db/github";
import { useProjects } from "@/lib/store/projects-context";

interface ImportGithubDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportGithubDialog({ open, onOpenChange }: ImportGithubDialogProps) {
  const { projects, refreshProjects } = useProjects();

  const [repos,     setRepos]     = useState<UserRepo[]>([]);
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [loading,   setLoading]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [query,     setQuery]     = useState("");

  // IDs of repos already linked to a project
  const linkedIds = new Set(
    projects.flatMap(p => p.githubRepo ? [p.githubRepo.githubId] : [])
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setQuery("");
    listUserRepos()
      .then(setRepos)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load repos"))
      .finally(() => setLoading(false));
  }, [open]);

  function toggle(id: number) {
    if (linkedIds.has(id)) return; // already imported — not selectable
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const importable = filtered.filter(r => !linkedIds.has(r.id));
    const allSelected = importable.every(r => selected.has(r.id));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importable.map(r => r.id)));
    }
  }

  async function handleImport() {
    const toImport = repos.filter(r => selected.has(r.id));
    if (!toImport.length) return;
    setImporting(true);
    try {
      await importReposAsProjects(toImport);
      await refreshProjects();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const filtered = repos.filter(r =>
    r.fullName.toLowerCase().includes(query.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const importable       = filtered.filter(r => !linkedIds.has(r.id));
  const selectedCount    = [...selected].filter(id => filtered.some(r => r.id === id)).length;
  const allFilteredSelected = importable.length > 0 && importable.every(r => selected.has(r.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-white/50" />
            Import from GitHub
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <input
          placeholder="Search repositories…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={cn(
            "w-full bg-white/[0.04] border border-white/10 rounded-2xl",
            "px-4 py-2.5 text-sm text-white/80 placeholder:text-white/25",
            "outline-none focus:border-white/25 transition duration-150"
          )}
        />

        {/* Repo list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12 text-white/30 gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading repositories…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400/80">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-white/25">No repositories found.</p>
          )}

          {!loading && !error && filtered.map(repo => {
            const alreadyImported = linkedIds.has(repo.id);
            const isSelected      = selected.has(repo.id);
            const [org, repoName] = repo.fullName.split("/");

            return (
              <button
                key={repo.id}
                type="button"
                onClick={() => toggle(repo.id)}
                disabled={alreadyImported}
                className={cn(
                  "w-full flex items-start gap-3 rounded-2xl px-3 py-3 text-left",
                  "transition duration-150 group",
                  alreadyImported
                    ? "opacity-40 cursor-default"
                    : isSelected
                      ? "bg-primary/10 border border-primary/25"
                      : "hover:bg-white/[0.04] border border-transparent"
                )}
              >
                {/* Checkbox */}
                <div className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition duration-150",
                  alreadyImported
                    ? "border-white/20 bg-white/10"
                    : isSelected
                      ? "border-primary bg-primary/20"
                      : "border-white/20 group-hover:border-white/40"
                )}>
                  {alreadyImported
                    ? <CheckCheck className="h-2.5 w-2.5 text-white/40" />
                    : isSelected
                      ? <div className="h-2 w-2 rounded-sm bg-primary" />
                      : null
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-white/35">{org}/</span>
                    <span className="text-sm font-medium text-white/80">{repoName}</span>
                    {repo.isPrivate && (
                      <span className="flex items-center gap-0.5 text-[10px] text-white/30 border border-white/10 rounded-full px-1.5 py-0.5">
                        <Lock className="h-2.5 w-2.5" /> private
                      </span>
                    )}
                    {alreadyImported && (
                      <span className="text-[10px] text-primary/60 border border-primary/20 rounded-full px-1.5 py-0.5">
                        imported
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-white/30 mt-0.5 truncate">{repo.description}</p>
                  )}
                </div>

                {/* Stars */}
                {repo.stars > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-white/25 shrink-0 mt-0.5">
                    <Star className="h-3 w-3" />
                    {repo.stars}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
          {/* Select all */}
          {importable.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-white/35 hover:text-white/60 transition duration-150 shrink-0"
            >
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 rounded-full border border-white/10 text-sm text-white/40 font-semibold hover:text-white/70 hover:border-white/20 transition duration-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={selectedCount === 0 || importing}
            className={cn(
              "h-10 px-5 rounded-full border text-sm font-semibold transition duration-200",
              "border-primary/75 text-primary/80 hover:bg-primary/10",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "flex items-center gap-2"
            )}
          >
            {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {importing
              ? "Importing…"
              : selectedCount > 0
                ? `Import ${selectedCount} repo${selectedCount > 1 ? "s" : ""}`
                : "Import"
            }
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
