"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trash2, RotateCcw, FileText, Link2, GitBranch, Globe, Palette,
  File, Image, Video, Music, Archive, Code2,
} from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";

type TrashedFile = {
  id: string; name: string; mime_type: string; size: number;
  storage_path: string; presigned_url: string | null;
  deleted_at: string; project_id: string;
};
type TrashedLink = {
  id: string; title: string; url: string; type: string;
  deleted_at: string; project_id: string;
};

const LINK_ICONS: Record<string, React.ElementType> = {
  github: GitBranch, docs: FileText, production: Globe, design: Palette, other: Link2,
};

function mimeIcon(m: string) {
  if (m.startsWith("image/")) return Image;
  if (m.startsWith("video/")) return Video;
  if (m.startsWith("audio/")) return Music;
  if (m.startsWith("text/") || m.includes("javascript") || m.includes("json")) return Code2;
  if (m.includes("pdf")) return FileText;
  if (m.includes("zip") || m.includes("tar")) return Archive;
  return File;
}
function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "today"; if (d === 1) return "yesterday"; return `${d}d ago`;
}

export function TrashPanel({ projectId }: { projectId: string }) {
  const { reloadProjectFiles, refreshProjects } = useProjects();
  const [files,       setFiles]       = useState<TrashedFile[]>([]);
  const [links,       setLinks]       = useState<TrashedLink[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [busyId,      setBusyId]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { getTrashedItems } = await import("@/lib/db/files");
      const data = await getTrashedItems(projectId);
      setFiles(data.files as unknown as TrashedFile[]);
      setLinks(data.links as unknown as TrashedLink[]);
    } catch (err) {
      console.error("[TrashPanel] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function restoreFile(id: string) {
    setBusyId(id);
    try {
      const { restoreFile: dbRestoreFile } = await import("@/lib/db/files");
      await dbRestoreFile(id, projectId);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      await reloadProjectFiles();
    } finally { setBusyId(null); }
  }

  async function restoreLink(id: string) {
    setBusyId(id);
    try {
      const { restoreLink: dbRestoreLink } = await import("@/lib/db/files");
      await dbRestoreLink(id, projectId);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      await refreshProjects();
    } finally { setBusyId(null); }
  }

  async function permDeleteFile(f: TrashedFile) {
    setBusyId(f.id);
    try {
      const { permanentDeleteFile } = await import("@/lib/db/files");
      await permanentDeleteFile(f.id, f.project_id, f.storage_path);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
    } finally { setBusyId(null); }
  }

  async function permDeleteLink(l: TrashedLink) {
    setBusyId(l.id);
    try {
      const { permanentDeleteLink } = await import("@/lib/db/files");
      await permanentDeleteLink(l.id, l.project_id);
      setLinks((prev) => prev.filter((x) => x.id !== l.id));
    } finally { setBusyId(null); }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-white/25">Loading…</p>
      </div>
    );
  }

  if (files.length === 0 && links.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <Trash2 className="h-5 w-5 text-white/20" />
        </div>
        <p className="text-sm text-white/35">Trash is empty</p>
        <p className="text-xs text-white/20">Deleted files and links appear here</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pb-16">
      {files.map((f) => {
        const Icon  = mimeIcon(f.mime_type);
        const busy  = busyId === f.id;
        return (
          <div key={f.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] group">
            {f.mime_type.startsWith("image/") && f.presigned_url ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 bg-white/[0.06]">
                <img src={f.presigned_url} alt={f.name} className="w-full h-full object-cover opacity-40" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-white/25" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/45 truncate">{f.name}</p>
              <p className="text-[10px] text-white/22 tabular-nums">{fmtSize(f.size)} · deleted {daysAgo(f.deleted_at)}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
              <button disabled={busy} onClick={() => restoreFile(f.id)}
                className="h-7 px-2.5 text-xs rounded-full border border-white/10 text-white/50 hover:text-primary/80 hover:border-primary/30 flex items-center gap-1.5 transition disabled:opacity-40">
                <RotateCcw className="h-3 w-3" />{busy ? "…" : "Restore"}
              </button>
              <button disabled={busy} onClick={() => permDeleteFile(f)}
                className="h-7 px-2.5 text-xs rounded-full border border-red-500/10 text-red-400/40 hover:text-red-400/80 hover:border-red-500/30 hover:bg-red-500/5 flex items-center gap-1.5 transition disabled:opacity-40">
                <Trash2 className="h-3 w-3" />{busy ? "…" : "Delete forever"}
              </button>
            </div>
          </div>
        );
      })}
      {links.map((l) => {
        const Icon = LINK_ICONS[l.type] ?? Link2;
        const busy = busyId === l.id;
        return (
          <div key={l.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] group">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-white/25" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/45 truncate">{l.title}</p>
              <p className="text-[10px] text-white/22 truncate">{l.url} · deleted {daysAgo(l.deleted_at)}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
              <button disabled={busy} onClick={() => restoreLink(l.id)}
                className="h-7 px-2.5 text-xs rounded-full border border-white/10 text-white/50 hover:text-primary/80 hover:border-primary/30 flex items-center gap-1.5 transition disabled:opacity-40">
                <RotateCcw className="h-3 w-3" />{busy ? "…" : "Restore"}
              </button>
              <button disabled={busy} onClick={() => permDeleteLink(l)}
                className="h-7 px-2.5 text-xs rounded-full border border-red-500/10 text-red-400/40 hover:text-red-400/80 hover:border-red-500/30 hover:bg-red-500/5 flex items-center gap-1.5 transition disabled:opacity-40">
                <Trash2 className="h-3 w-3" />{busy ? "…" : "Delete forever"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
