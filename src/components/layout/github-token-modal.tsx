"use client";

import { useState } from "react";
import { GitBranch, CheckCircle2, AlertCircle, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useProjects } from "@/lib/store/projects-context";
import { validateGithubToken } from "@/lib/db/github";
import { cn } from "@/lib/utils";

interface GithubTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Status = "idle" | "validating" | "ok" | "error";

export function GithubTokenModal({ open, onOpenChange }: GithubTokenModalProps) {
  const { hasGithubToken, saveGithubToken, clearGithubToken } = useProjects();

  const [token,   setToken]   = useState("");
  const [status,  setStatus]  = useState<Status>("idle");
  const [login,   setLogin]   = useState<string | null>(null);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleSave() {
    if (!token.trim()) return;
    setSaving(true);
    setStatus("validating");
    setErrMsg(null);
    try {
      // Validate the token against GitHub first
      const { login: ghLogin } = await validateGithubToken(token.trim());
      setLogin(ghLogin);
      setStatus("ok");
      // Persist
      await saveGithubToken(token.trim());
      setToken("");
      setTimeout(() => onOpenChange(false), 800);
    } catch (err) {
      setStatus("error");
      if (err instanceof Error) {
        setErrMsg(err.message);
      } else if (err && typeof err === "object" && "message" in err) {
        setErrMsg(String((err as { message: unknown }).message));
      } else {
        setErrMsg("Something went wrong — check console for details");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      await clearGithubToken();
      onOpenChange(false);
    } finally {
      setClearing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0a0a] border border-white/[0.08] rounded-[28px] p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-white/60" />
          </div>
          <div>
            <DialogTitle className="text-sm font-semibold text-white/85">
              GitHub Connection
            </DialogTitle>
            <p className="text-xs text-white/30 mt-0.5">
              {hasGithubToken ? "Personal access token is saved" : "Connect your GitHub account"}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {hasGithubToken ? (
            /* ── Token already saved ── */
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400/80 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-300/80">Token saved</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    GitHub API access is active. Repos can be linked to projects.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-full border border-red-500/20 text-red-400/60 hover:text-red-400/90 hover:border-red-500/40 hover:bg-red-500/[0.05] text-xs font-semibold transition duration-150 disabled:opacity-40"
              >
                {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {clearing ? "Removing…" : "Remove token"}
              </button>
            </div>
          ) : (
            /* ── No token yet ── */
            <div className="space-y-4">
              {/* Instructions */}
              <div className="space-y-2 text-xs text-white/40 leading-relaxed">
                <p>
                  Create a{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/70 hover:text-primary/90 inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                  >
                    personal access token
                    <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                  </a>{" "}
                  on GitHub with{" "}
                  <span className="text-white/60 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">repo</span>{" "}
                  and{" "}
                  <span className="text-white/60 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">read:user</span>{" "}
                  scopes. Paste it below.
                </p>
              </div>

              {/* Token input */}
              <div className="space-y-2">
                <input
                  type="password"
                  value={token}
                  onChange={e => { setToken(e.target.value); setStatus("idle"); setErrMsg(null); }}
                  onKeyDown={handleKeyDown}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className={cn(
                    "w-full h-11 px-4 rounded-2xl border bg-white/[0.03] font-mono text-xs text-white/80 placeholder:text-white/20",
                    "focus:outline-none transition duration-150",
                    status === "error"
                      ? "border-red-400/40 focus:border-red-400/60"
                      : status === "ok"
                      ? "border-emerald-400/40"
                      : "border-white/[0.08] focus:border-primary/30"
                  )}
                />
                {status === "error" && errMsg && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400/80">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {errMsg}
                  </div>
                )}
                {status === "ok" && login && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400/80">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Connected as <span className="font-semibold ml-1">@{login}</span>
                  </div>
                )}
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!token.trim() || saving}
                className="w-full h-11 rounded-full bg-primary/15 text-primary/80 border border-primary/30 hover:bg-primary/20 hover:text-primary hover:border-primary/50 text-sm font-semibold transition duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Verifying…" : "Save token"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
