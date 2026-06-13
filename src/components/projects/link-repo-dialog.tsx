"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, GitBranch, Lock, Star, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProjects } from "@/lib/store/projects-context";
import { listUserRepos, type UserRepo } from "@/lib/db/github";
import { cn } from "@/lib/utils";

interface LinkRepoDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

export function LinkRepoDialog({ projectId, open, onOpenChange }: LinkRepoDialogProps) {
  const { linkRepo } = useProjects();

  const [repos,   setRepos]   = useState<UserRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");

  // Fetch repos when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listUserRepos()
      .then(setRepos)
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load repos"))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter(r =>
      r.fullName.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q)
    );
  }, [repos, search]);

  async function handleSelect(repo: UserRepo) {
    setLinking(repo.fullName);
    try {
      await linkRepo(projectId, repo.fullName);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link repo");
      setLinking(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a0a] border border-white/[0.08] rounded-[28px] p-0 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-white/60" />
          </div>
          <div>
            <DialogTitle className="text-sm font-semibold text-white/85">
              Connect a GitHub repo
            </DialogTitle>
            <p className="text-xs text-white/30 mt-0.5">
              Select a repo to link to this project
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/[0.05] shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search repositories…"
              className="w-full pl-9 pr-3 h-9 rounded-full bg-white/[0.04] border border-white/[0.07] text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-white/25">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading repositories…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-6">
              <AlertCircle className="h-5 w-5 text-red-400/60" />
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
              <p className="text-sm text-white/30">
                {search ? "No repos match your search" : "No repos found"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map(repo => (
                <button
                  key={repo.id}
                  onClick={() => handleSelect(repo)}
                  disabled={!!linking}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-3 py-3 rounded-2xl border transition duration-150 group",
                    "border-white/[0.05] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.04]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {linking === repo.fullName ? (
                    <Loader2 className="h-4 w-4 text-primary/60 animate-spin mt-0.5 shrink-0" />
                  ) : (
                    <GitBranch className="h-4 w-4 text-white/25 mt-0.5 shrink-0 group-hover:text-white/40 transition" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-white/80 truncate">{repo.fullName}</span>
                      {repo.isPrivate && (
                        <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-medium text-white/25 bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                          <Lock className="h-2 w-2" />
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-white/30 truncate">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-white/20">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" />
                        {repo.stars}
                      </span>
                      <span className="font-mono">{repo.defaultBranch}</span>
                      <span className="ml-auto">{formatRelativeTime(repo.updatedAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && !error && repos.length > 0 && (
          <div className="shrink-0 px-6 py-2.5 border-t border-white/[0.05] text-[10px] text-white/20 text-right">
            {filtered.length} of {repos.length} repos
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
