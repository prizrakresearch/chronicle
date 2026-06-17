"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  Plus, Link2, Upload, GitBranch, FileText, Globe, Palette,
  Image, Video, Music, Archive, Code2, File,
  Copy, Check, Trash2, ExternalLink, Download,
  FolderPlus, FolderOpen, ChevronRight, X, Hash,
  LayoutList, LayoutGrid, Maximize2, Minimize2, KeyRound, CheckCircle2, Pencil, Eye, Activity,
  FileSpreadsheet, Presentation, PenTool,
} from "lucide-react";
import { FilePreview } from "./file-preview";
import { TrashPanel  } from "./trash-panel";
import { DocThumbnail, isDocPreviewType } from "./doc-thumbnail";
import { ActivityPanel } from "./activity-panel";
import { VersionConflictDialog, dupName } from "./version-conflict-dialog";
import { AddLinkDialog } from "@/components/links/add-link-dialog";
import { GitSidebar } from "./git-sidebar";
import { CommitsPanel } from "./commits-panel";
import { CredentialsPanel } from "@/components/notes/credentials-panel";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { Project, ProjectLink, ProjectFile } from "@/types";
import type { RepoBranch, RepoCommit } from "@/lib/db/github";
import { createPortal } from "react-dom";
import {
  createFolder        as dbCreateFolder,
  renameFolder        as dbRenameFolder,
  updateProjectFile   as dbUpdateFile,
  updateLink          as dbUpdateLink,
  checkFilenameConflict,
} from "@/lib/db/files";

// ── Icon / colour helpers ─────────────────────────────────────────────────────

const LINK_ICONS = { github: GitBranch, docs: FileText, production: Globe, design: Palette, other: Link2 };
const LINK_COLORS = { github: "text-zinc-300", docs: "text-blue-400", production: "text-emerald-400", design: "text-violet-400", other: "text-zinc-400" };

function fileIcon(m: string) {
  if (m.startsWith("image/")) return Image;
  if (m.startsWith("video/")) return Video;
  if (m.startsWith("audio/")) return Music;
  if (m.startsWith("text/") || m.includes("javascript") || m.includes("json")) return Code2;
  if (m.includes("pdf")) return FileText;
  if (m.includes("zip") || m.includes("tar")) return Archive;
  return File;
}
function fileColor(m: string) {
  if (m.startsWith("image/")) return "text-pink-400";
  if (m.startsWith("video/")) return "text-orange-400";
  if (m.startsWith("audio/")) return "text-yellow-400";
  if (m.includes("pdf")) return "text-red-400";
  if (m.startsWith("text/") || m.includes("javascript") || m.includes("json")) return "text-blue-400";
  if (m.includes("zip") || m.includes("tar")) return "text-amber-400";
  return "text-zinc-400";
}
function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ── Tag colours ───────────────────────────────────────────────────────────────

const TAG_COLORS = [
  "bg-violet-500/15 text-violet-400/80 border-violet-500/20",
  "bg-blue-500/15 text-blue-400/80 border-blue-500/20",
  "bg-emerald-500/15 text-emerald-400/80 border-emerald-500/20",
  "bg-orange-500/15 text-orange-400/80 border-orange-500/20",
  "bg-pink-500/15 text-pink-400/80 border-pink-500/20",
  "bg-yellow-500/15 text-yellow-400/80 border-yellow-500/20",
] as const;

// ── Per-item metadata ─────────────────────────────────────────────────────────

interface ItemMeta { folderId: string | null; tags: string[] }

// ── Tag pill ──────────────────────────────────────────────────────────────────

function TagPill({ tag, colorIdx, onRemove }: { tag: string; colorIdx: number; onRemove?: () => void }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium", TAG_COLORS[colorIdx % TAG_COLORS.length])}>
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

// ── Inline tag adder ──────────────────────────────────────────────────────────

function TagAdder({ existingTags, allTags, onAdd }: { existingTags: string[]; allTags: string[]; onAdd: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const t = draft.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !existingTags.includes(t)) onAdd(t);
    setDraft(""); setOpen(false);
  }
  const suggestions = allTags.filter(t => !existingTags.includes(t) && t.includes(draft.toLowerCase()));

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 h-5 w-5 flex items-center justify-center rounded-full border border-white/10 text-white/40 hover:text-white/80 transition"
      >
        <Hash className="h-2.5 w-2.5" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input ref={inputRef} value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setOpen(false); setDraft(""); } }}
        onBlur={() => { if (!draft.trim()) setOpen(false); }}
        placeholder="tag…"
        className="h-5 w-20 px-1.5 rounded text-[10px] bg-white/[0.06] border border-white/10 text-white/70 placeholder:text-white/25 focus:outline-none focus:border-primary/30"
      />
      {suggestions.length > 0 && (
        <div className="flex gap-1">
          {suggestions.slice(0, 3).map(s => (
            <button key={s} onClick={() => { onAdd(s); setOpen(false); setDraft(""); }}
              className="text-[10px] text-white/35 hover:text-white/70 px-1 transition">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Folder assign ─────────────────────────────────────────────────────────────

function FolderAssign({ folders, currentFolderId, onAssign }: { folders: { id: string; name: string }[]; currentFolderId: string | null; onAssign: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150">
        <FolderOpen className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-2xl border border-white/10 bg-black/95 py-1 shadow-xl">
          <button onClick={() => { onAssign(null); setOpen(false); }}
            className={cn("w-full text-left px-3 py-1.5 text-xs transition hover:bg-white/[0.05]", !currentFolderId ? "text-primary/70" : "text-white/50")}>
            No folder
          </button>
          {folders.map(f => (
            <button key={f.id} onClick={() => { onAssign(f.id); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-xs transition hover:bg-white/[0.05]", currentFolderId === f.id ? "text-primary/70" : "text-white/50")}>
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Item types ────────────────────────────────────────────────────────────────

type ItemType = { kind: "link"; link: ProjectLink } | { kind: "file"; file: ProjectFile };

// ── List row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, meta, folders, allTags, onMetaChange, onDeleteLink, onDeleteFile, isReadOnly, isDragging, onItemDragStart, onItemDragEnd, isSelected, showCheckbox, onToggleSelect, onPreviewFile }: {
  item: ItemType; meta: ItemMeta; folders: { id: string; name: string }[];
  allTags: string[]; onMetaChange: (m: Partial<ItemMeta>) => void;
  onDeleteLink: (id: string) => void; onDeleteFile: (id: string) => void;
  isReadOnly: boolean;
  isDragging?:      boolean;
  onItemDragStart?: (id: string) => void;
  onItemDragEnd?:   () => void;
  isSelected?:      boolean;
  showCheckbox?:    boolean;
  onToggleSelect?:  (id: string, e: React.MouseEvent) => void;
  onPreviewFile?:   (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const id        = item.kind === "link" ? item.link.id : item.file.id;
  const Icon      = item.kind === "link" ? LINK_ICONS[item.link.type] : fileIcon(item.file.mimeType);
  const iconCls   = item.kind === "link" ? LINK_COLORS[item.link.type] : fileColor(item.file.mimeType);
  const title     = item.kind === "link" ? item.link.title : item.file.name;
  const subtitle  = item.kind === "link" ? item.link.url : `${fmtSize(item.file.size)} · ${fmtDate(item.file.createdAt)}`;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-4 py-3 rounded-2xl border transition duration-150 group",
        isSelected
          ? "border-primary/30 bg-primary/[0.05]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]",
        !isReadOnly && "cursor-grab active:cursor-grabbing",
      )}
      draggable={!isReadOnly}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-chronicle-item", id);
        e.dataTransfer.effectAllowed = "copyMove";
        // Same-origin proxy URL — Chrome allows DownloadURL for same-origin only
        if (item.kind === "file" && item.file.s3Key) {
          const proxyUrl =
            `${window.location.origin}/api/files/download` +
            `?key=${encodeURIComponent(item.file.s3Key)}` +
            `&name=${encodeURIComponent(item.file.name)}`;
          try {
            e.dataTransfer.setData(
              "DownloadURL",
              `${item.file.mimeType}:${item.file.name}:${proxyUrl}`,
            );
          } catch { /* ignore */ }
        }
        onItemDragStart?.(id);
      }}
      onDragEnd={() => onItemDragEnd?.()}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox — visible on hover or when any item is selected */}
        {onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(id, e); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150",
              isSelected
                ? "bg-primary/80 border-primary/80"
                : "border-white/20 bg-transparent",
              !showCheckbox && !isSelected && "opacity-0 group-hover:opacity-100",
            )}
          >
            {isSelected && <Check className="h-2.5 w-2.5 text-black" />}
          </button>
        )}
        <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
          {item.kind === "file" && item.file.mimeType.startsWith("image/") ? (
            <img src={item.file.dataUrl} alt={item.file.name} loading="lazy"
              className="w-full h-full object-cover" />
          ) : item.kind === "file" && isDocPreviewType(item.file.mimeType) ? (
            <DocThumbnail
              fileId={item.file.id}
              mimeType={item.file.mimeType}
              url={item.file.dataUrl}
              size={item.file.size}
              compact
            />
          ) : (
            <Icon className={cn("h-4 w-4", iconCls)} />
          )}
        </div>
        <p className="flex-1 min-w-0 text-sm font-medium text-white/80 truncate">{title}</p>
        {item.kind === "file" && (item.file.versionNumber ?? 1) > 1 && (
          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400/80 border border-violet-500/20 tabular-nums">
            v{item.file.versionNumber}
          </span>
        )}
        <p className="text-xs text-white/25 shrink-0 whitespace-nowrap tabular-nums">{subtitle}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
          {item.kind === "file" && onPreviewFile && (
            <button onClick={() => onPreviewFile(id)}
              className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150">
              <Eye className="h-3 w-3" />
            </button>
          )}
          {item.kind === "link" ? (
            <>
              <a href={item.link.url} target="_blank" rel="noopener noreferrer"
                className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150">
                <ExternalLink className="h-3 w-3" />
              </a>
              <button onClick={async () => { await navigator.clipboard.writeText(item.link.url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150 ml-0.5">
                {copied ? <Check className="h-3 w-3 text-primary/80" /> : <Copy className="h-3 w-3" />}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => window.open(item.file.dataUrl, "_blank")}
                className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150">
                <ExternalLink className="h-3 w-3" />
              </button>
              <button onClick={() => { const a = document.createElement("a"); a.href = item.file.dataUrl; a.download = item.file.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150 ml-0.5">
                <Download className="h-3 w-3" />
              </button>
            </>
          )}
          {!isReadOnly && folders.length > 0 && (
            <div className="ml-0.5">
              <FolderAssign folders={folders} currentFolderId={meta.folderId} onAssign={fid => onMetaChange({ folderId: fid })} />
            </div>
          )}
          {!isReadOnly && (
            <button onClick={() => item.kind === "link" ? onDeleteLink(id) : onDeleteFile(id)}
              className="h-7 w-7 rounded-full border border-red-500/10 text-red-400/30 hover:text-red-400/80 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center transition duration-150 ml-0.5">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        {!isReadOnly && <TagAdder existingTags={meta.tags} allTags={allTags} onAdd={t => onMetaChange({ tags: [...meta.tags, t] })} />}
      </div>
      {meta.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-11">
          {meta.tags.map((t, i) => (
            <TagPill key={t} tag={t} colorIdx={i} onRemove={() => onMetaChange({ tags: meta.tags.filter(x => x !== t) })} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function ItemCard({ item, meta, onDeleteLink, onDeleteFile, isReadOnly, onPreviewFile }: {
  item: ItemType; meta: ItemMeta;
  onDeleteLink: (id: string) => void; onDeleteFile: (id: string) => void;
  isReadOnly: boolean;
  onPreviewFile?: (id: string) => void;
}) {
  const id       = item.kind === "link" ? item.link.id : item.file.id;
  const Icon     = item.kind === "link" ? LINK_ICONS[item.link.type] : fileIcon(item.file.mimeType);
  const iconCls  = item.kind === "link" ? LINK_COLORS[item.link.type] : fileColor(item.file.mimeType);
  const title    = item.kind === "link" ? item.link.title : item.file.name;
  const subtitle = item.kind === "link" ? item.link.url : fmtSize(item.file.size);
  const isImage  = item.kind === "file" && item.file.mimeType.startsWith("image/");
  const isVideo  = item.kind === "file" && item.file.mimeType.startsWith("video/");
  const isDoc    = item.kind === "file" && isDocPreviewType(item.file.mimeType);
  const hasThumbnail = isImage || isVideo || isDoc;

  function handleClick() {
    if (item.kind === "file") onPreviewFile?.(id);
    else window.open(item.link.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      onClick={handleClick}
      className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition duration-150 group relative overflow-hidden cursor-pointer"
    >
      {/* Thumbnail area */}
      {hasThumbnail ? (
        <div className="w-full aspect-[4/3] bg-white/[0.04] overflow-hidden">
          {isDoc ? (
            <DocThumbnail
              fileId={item.file.id}
              mimeType={item.file.mimeType}
              url={item.file.dataUrl}
              size={item.file.size}
            />
          ) : (
            <img src={item.file.dataUrl} alt={item.file.name} loading="lazy"
              className="w-full h-full object-cover" />
          )}
        </div>
      ) : (
        <div className="p-4 pb-2">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
            <Icon className={cn("h-5 w-5", iconCls)} />
          </div>
        </div>
      )}

      <div className="p-3 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-medium text-white/80 truncate flex-1 min-w-0">{title}</p>
          {item.kind === "file" && (item.file.versionNumber ?? 1) > 1 && (
            <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400/80 border border-violet-500/20">
              v{item.file.versionNumber}
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/25 truncate mt-0.5">{subtitle}</p>
        {meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {meta.tags.slice(0, 2).map((t, i) => <TagPill key={t} tag={t} colorIdx={i} />)}
            {meta.tags.length > 2 && <span className="text-[10px] text-white/20">+{meta.tags.length - 2}</span>}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div
        className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {item.kind === "link" ? (
          <a href={item.link.url} target="_blank" rel="noopener noreferrer"
            className="h-6 w-6 rounded-full border border-white/10 bg-black/50 backdrop-blur-sm text-white/40 hover:text-white/80 hover:border-white/25 flex items-center justify-center transition duration-150">
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <button onClick={() => window.open(item.file.dataUrl, "_blank")}
            className="h-6 w-6 rounded-full border border-white/10 bg-black/50 backdrop-blur-sm text-white/40 hover:text-white/80 hover:border-white/25 flex items-center justify-center transition duration-150">
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        )}
        {!isReadOnly && (
          <button onClick={() => item.kind === "link" ? onDeleteLink(id) : onDeleteFile(id)}
            className="h-6 w-6 rounded-full border border-red-500/10 bg-black/50 backdrop-blur-sm text-red-400/40 hover:text-red-400/90 hover:border-red-500/30 hover:bg-red-500/10 flex items-center justify-center transition duration-150">
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Fullscreen overlay wrapper ────────────────────────────────────────────────

function FullscreenOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  if (typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-sm flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-end mb-3 shrink-0">
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>,
    document.body
  );
}

// ── Folder context menu ───────────────────────────────────────────────────────

interface FolderCtxMenu {
  folderId: string;
  folderName: string;
  itemCount: number;
  x: number;
  y: number;
}

function FolderContextMenu({
  menu,
  isReadOnly,
  zipping,
  onClose,
  onRename,
  onDownload,
  onDelete,
}: {
  menu: FolderCtxMenu;
  isReadOnly: boolean;
  zipping: boolean;
  onClose: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [onClose]);

  // Clamp to viewport
  const style: React.CSSProperties = { position: "fixed", zIndex: 9999, top: menu.y, left: menu.x };

  return createPortal(
    <div ref={ref} style={style}
      className="min-w-[160px] rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-2xl py-1 text-sm overflow-hidden">

      <button
        onClick={() => { onDownload(); onClose(); }}
        disabled={zipping || menu.itemCount === 0}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-white/75 hover:bg-white/[0.07] disabled:opacity-40 disabled:cursor-default transition"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        {zipping ? "Zipping…" : "Download as zip"}
        {menu.itemCount === 0 && <span className="ml-auto text-white/30 text-[10px]">empty</span>}
      </button>

      {!isReadOnly && (
        <>
          <div className="mx-2 my-1 h-px bg-white/[0.06]" />
          <button
            onClick={() => { onRename(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-white/75 hover:bg-white/[0.07] transition"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            Rename
          </button>
          <div className="mx-2 my-1 h-px bg-white/[0.06]" />
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-red-400/70 hover:bg-red-500/[0.08] hover:text-red-400 transition"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Delete folder
            {menu.itemCount > 0 && <span className="ml-auto text-[10px] opacity-50">{menu.itemCount} moved out</span>}
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

// ── Google file creation ──────────────────────────────────────────────────────

const GOOGLE_FILE_TYPES = [
  { id: "sheet",   label: "Google Sheet",   shortLabel: "Sheet",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", Icon: FileSpreadsheet, createUrl: "https://docs.google.com/spreadsheets/create" },
  { id: "doc",     label: "Google Doc",     shortLabel: "Doc",     color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       Icon: FileText,        createUrl: "https://docs.google.com/document/create"      },
  { id: "slide",   label: "Google Slide",   shortLabel: "Slide",   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",     Icon: Presentation,    createUrl: "https://docs.google.com/presentation/create"  },
  { id: "drawing", label: "Google Drawing", shortLabel: "Drawing", color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20",   Icon: PenTool,         createUrl: "https://docs.google.com/drawings/create"      },
] as const;

type GoogleFileType = (typeof GOOGLE_FILE_TYPES)[number];

function AddButton({ onAddLink, onUpload }: { onAddLink: () => void; onUpload: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [dropdownOpen]);

  function handleGoogleClick(type: GoogleFileType) {
    window.open(type.createUrl, "_blank", "noopener,noreferrer");
    setDropdownOpen(false);
    onAddLink();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setDropdownOpen(v => !v)}
        className={cn(
          "h-9 px-4 text-xs font-semibold rounded-full border flex items-center gap-1.5 transition duration-200 hover:-translate-y-px active:translate-y-0",
          dropdownOpen
            ? "border-primary/60 text-primary/90 bg-primary/10"
            : "border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10"
        )}
      >
        <Plus className="h-3.5 w-3.5" />Add
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-56 rounded-2xl border border-white/[0.08] bg-black/80 shadow-2xl py-2">
          {GOOGLE_FILE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleGoogleClick(type)}
              className="flex items-center gap-2.5 px-3 py-2 mx-1.5 text-left rounded-xl transition hover:bg-white/[0.06]"
              style={{ width: "calc(100% - 12px)" }}
            >
              <type.Icon className={cn("h-4 w-4 shrink-0", type.color)} strokeWidth={1.5} />
              <span className="text-xs text-white/70 font-medium">{type.label}</span>
            </button>
          ))}
          <div className="mx-3 my-1.5 h-px bg-white/[0.07]" />
          <button
            onClick={() => { setDropdownOpen(false); onAddLink(); }}
            className="flex items-center gap-2.5 px-3 py-2 mx-1.5 text-left rounded-xl transition hover:bg-white/[0.06]"
            style={{ width: "calc(100% - 12px)" }}
          >
            <Link2 className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
            <span className="text-xs text-white/70 font-medium">Link</span>
          </button>
          <button
            onClick={() => { setDropdownOpen(false); onUpload(); }}
            className="flex items-center gap-2.5 px-3 py-2 mx-1.5 text-left rounded-xl transition hover:bg-white/[0.06]"
            style={{ width: "calc(100% - 12px)" }}
          >
            <Upload className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
            <span className="text-xs text-white/70 font-medium">Upload file</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Right files panel ─────────────────────────────────────────────────────────

interface FilesPanelProps {
  projectId:          string;
  folders:            { id: string; name: string }[];
  itemMeta:           Record<string, ItemMeta>;
  onCreateFolder:     () => void;
  onRenameFolder:     (id: string, name: string) => void;
  onDeleteFolder:     (id: string) => void;
  onMetaChange:       (id: string, m: Partial<ItemMeta>) => void;
  showCredentials:     boolean;
  onToggleCredentials: () => void;
  onToggleTrash:       () => void;
  onToggleActivity:    () => void;
}

function RightFilesPanel({ projectId, folders, itemMeta, onCreateFolder, onRenameFolder, onDeleteFolder, onMetaChange, showCredentials, onToggleCredentials, onToggleTrash, onToggleActivity }: FilesPanelProps) {
  const { getLinks, getProjectFiles, uploadFile, deleteLink, deleteProjectFile, isReadOnly } = useProjects();
  const [addLinkOpen,      setAddLinkOpen]  = useState(false);
  const [dragOver,         setDragOver]     = useState(false);
  const [uploading,        setUploading]    = useState(false);
  const [selectedTag,      setSelectedTag]  = useState<string | null>(null);
  const [collapsedFolders, setCollapsed]    = useState<Set<string>>(new Set());
  const [viewMode,         setViewMode]     = useState<"list" | "grid">("list");
  const [fullscreen,       setFullscreen]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter  = useRef(0);
  const [draggedItemId,  setDraggedItemId]  = useState<string | null>(null);
  const [folderDragOver, setFolderDragOver] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingName,     setRenamingName]     = useState("");
  const [zippingFolderId,  setZippingFolderId]  = useState<string | null>(null);
  const [folderCtxMenu,    setFolderCtxMenu]    = useState<FolderCtxMenu | null>(null);
  const [listDragOver,     setListDragOver]     = useState(false);
  const [previewFileId,    setPreviewFileId]    = useState<string | null>(null);
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [bulkMoveOpen,     setBulkMoveOpen]     = useState(false);
  const [isBulkDownloading,setIsBulkDownloading]= useState(false);
  const anchorId = useRef<string | null>(null);
  const [conflictState, setConflictState] = useState<{
    fileName: string;
    resolve: (choice: "version" | "duplicate" | "cancel") => void;
  } | null>(null);

  // Per-file upload progress: key → { name, progress 0-100, done }
  interface UploadItem { name: string; progress: number; done: boolean }
  const [uploadQueue, setUploadQueue] = useState<Map<string, UploadItem>>(new Map());
  const setItem = useCallback((key: string, patch: Partial<UploadItem>) =>
    setUploadQueue(prev => { const n = new Map(prev); n.set(key, { ...n.get(key)!, ...patch }); return n; }), []);

  const links = getLinks(projectId);
  const files = getProjectFiles(projectId);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    [...links, ...files].forEach(item => (itemMeta[item.id]?.tags ?? []).forEach(t => set.add(t)));
    return [...set].sort();
  }, [links, files, itemMeta]);

  const allItems: ItemType[] = useMemo(() => [
    ...links.map(l => ({ kind: "link" as const, link: l })),
    ...files.map(f => ({ kind: "file" as const, file: f })),
  ], [links, files]);

  const visibleItems = useMemo(() => {
    if (!selectedTag) return allItems;
    return allItems.filter(item => {
      const id = item.kind === "link" ? item.link.id : item.file.id;
      return (itemMeta[id]?.tags ?? []).includes(selectedTag);
    });
  }, [allItems, selectedTag, itemMeta]);

  const folderGroups = useMemo(() => {
    const groups: Record<string, ItemType[]> = { __root__: [] };
    folders.forEach(f => { groups[f.id] = []; });
    visibleItems.forEach(item => {
      const id  = item.kind === "link" ? item.link.id : item.file.id;
      const fid = itemMeta[id]?.folderId ?? null;
      if (fid && groups[fid]) groups[fid].push(item);
      else groups.__root__.push(item);
    });
    return groups;
  }, [visibleItems, folders, itemMeta]);

  // Flat visual order of all visible items (respects collapsed folders — collapsed items skipped)
  const flatOrder = useMemo(() => {
    const ids: string[] = [];
    folders.forEach(folder => {
      if (!collapsedFolders.has(folder.id)) {
        (folderGroups[folder.id] ?? []).forEach(item =>
          ids.push(item.kind === "link" ? item.link.id : item.file.id));
      }
    });
    folderGroups.__root__.forEach(item =>
      ids.push(item.kind === "link" ? item.link.id : item.file.id));
    return ids;
  }, [folderGroups, folders, collapsedFolders]);

  async function downloadFolder(folderId: string, folderName: string) {
    const items = folderGroups[folderId] ?? [];
    const fileItems = items.filter(i => i.kind === "file");
    if (fileItems.length === 0) return;

    setZippingFolderId(folderId);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      await Promise.all(fileItems.map(async (item) => {
        if (item.kind !== "file") return;
        try {
          const res = await fetch(item.file.dataUrl);
          const blob = await res.blob();
          zip.file(item.file.name, blob);
        } catch {
          // skip files that fail (e.g. expired presigned URL)
        }
      }));

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setZippingFolderId(null);
    }
  }

  async function ingestFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList); if (!arr.length) return;
    setUploading(true);

    // Register each file in the queue with a unique key
    const keys = arr.map(() => crypto.randomUUID());
    setUploadQueue(prev => {
      const n = new Map(prev);
      arr.forEach((f, i) => n.set(keys[i], { name: f.name, progress: 0, done: false }));
      return n;
    });

    try {
      // Process sequentially so conflict dialogs appear one at a time
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i];
        let opts: { versionOf?: string; overrideName?: string } | undefined;

        // Check for filename conflict before uploading
        const conflict = await checkFilenameConflict(projectId, f.name);
        if (conflict) {
          const choice = await new Promise<"version" | "duplicate" | "cancel">((resolve) => {
            setConflictState({ fileName: f.name, resolve });
          });
          setConflictState(null);

          if (choice === "cancel") {
            setUploadQueue(prev => { const n = new Map(prev); n.delete(keys[i]); return n; });
            continue;
          }
          if (choice === "version")   opts = { versionOf: conflict.id };
          if (choice === "duplicate") opts = { overrideName: dupName(f.name) };
        }

        try {
          await uploadFile(f, projectId, (pct) => setItem(keys[i], { progress: pct }), opts);
          setItem(keys[i], { progress: 100, done: true });
          setTimeout(() => setUploadQueue(prev => { const n = new Map(prev); n.delete(keys[i]); return n; }), 2500);
        } catch (err) {
          console.error("[files-view] upload failed:", err);
          setUploadQueue(prev => { const n = new Map(prev); n.delete(keys[i]); return n; });
        }
      }
    } finally {
      setUploading(false);
    }
  }

  // Only respond to drags coming from outside the browser (files from Finder/Explorer)
  const isExternalFile  = (e: React.DragEvent) => e.dataTransfer.types.includes("Files") && !e.dataTransfer.types.includes("application/x-chronicle-item");
  const handleDragEnter = (e: React.DragEvent) => { if (!isExternalFile(e)) return; e.preventDefault(); dragCounter.current++; setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { if (!isExternalFile(e)) return; e.preventDefault(); dragCounter.current--; if (!dragCounter.current) setDragOver(false); };
  const handleDragOver  = (e: React.DragEvent) => { if (!isExternalFile(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  const handleDrop      = (e: React.DragEvent) => { if (!isExternalFile(e)) return; e.preventDefault(); dragCounter.current = 0; setDragOver(false); if (e.dataTransfer.files) ingestFiles(e.dataTransfer.files); };

  function getMeta(id: string): ItemMeta { return itemMeta[id] ?? { folderId: null, tags: [] }; }
  function toggleFolder(id: string) { setCollapsed(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); }

  // Toggle select with shift-click range support
  const handleToggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && anchorId.current) {
      const anchorIdx = flatOrder.indexOf(anchorId.current);
      const clickIdx  = flatOrder.indexOf(id);
      if (anchorIdx !== -1 && clickIdx !== -1) {
        const [start, end] = anchorIdx < clickIdx ? [anchorIdx, clickIdx] : [clickIdx, anchorIdx];
        const range = flatOrder.slice(start, end + 1);
        setSelectedIds(prev => { const s = new Set(prev); range.forEach(rid => s.add(rid)); return s; });
        return; // keep anchor unchanged on shift-click
      }
    }
    // Regular click: toggle + set new anchor
    anchorId.current = id;
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, [flatOrder]);

  // Keyboard shortcuts: Cmd/Ctrl+A to select all visible, Escape to clear
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setSelectedIds(new Set()); setBulkMoveOpen(false); anchorId.current = null; return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setSelectedIds(new Set(allItems.map(item => item.kind === "link" ? item.link.id : item.file.id)));
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [allItems]);

  // Bulk operations
  function handleBulkMove(folderId: string | null) {
    selectedIds.forEach(id => onMetaChange(id, { folderId }));
    setSelectedIds(new Set()); setBulkMoveOpen(false);
  }
  async function handleBulkDownload() {
    const fileItems = allItems.filter(item => item.kind === "file" && selectedIds.has(item.file.id)) as { kind: "file"; file: ProjectFile }[];
    if (!fileItems.length) return;
    setIsBulkDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(fileItems.map(async item => {
        try { const res = await fetch(item.file.dataUrl); zip.file(item.file.name, await res.blob()); } catch { /* skip */ }
      }));
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a"); a.href = url; a.download = "selected-files.zip"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally { setIsBulkDownloading(false); }
  }
  function handleBulkDelete() {
    selectedIds.forEach(id => {
      if (files.some(f => f.id === id)) deleteProjectFile(id); else deleteLink(id);
    });
    setSelectedIds(new Set());
  }

  const empty = links.length === 0 && files.length === 0;

  const content = (
    <div
      className="h-full flex flex-col"
      onDragEnter={!isReadOnly ? handleDragEnter : undefined}
      onDragLeave={!isReadOnly ? handleDragLeave : undefined}
      onDragOver={!isReadOnly ? handleDragOver : undefined}
      onDrop={!isReadOnly ? handleDrop : undefined}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 pt-1 shrink-0">
        {!isReadOnly && (
          <>
            <AddButton onAddLink={() => setAddLinkOpen(true)} onUpload={() => fileInputRef.current?.click()} />
            <button onClick={onCreateFolder}
              className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 flex items-center gap-1.5 transition duration-200">
              <FolderPlus className="h-3.5 w-3.5" />Folder
            </button>
            <button
              onClick={onToggleCredentials}
              className={cn(
                "h-9 px-4 text-xs font-semibold rounded-full border flex items-center gap-1.5 transition duration-200 hover:-translate-y-px active:translate-y-0",
                showCredentials
                  ? "border-primary/40 text-primary/75 bg-primary/10"
                  : "border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10"
              )}
            >
              <KeyRound className="h-3.5 w-3.5" />Credentials
            </button>
            <button
              onClick={onToggleTrash}
              className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/40 hover:text-red-400/70 hover:border-red-500/30 hover:bg-red-500/5 flex items-center gap-1.5 transition duration-200 hover:-translate-y-px active:translate-y-0"
            >
              <Trash2 className="h-3.5 w-3.5" />Trash
            </button>
            <button
              onClick={onToggleActivity}
              className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 flex items-center gap-1.5 transition duration-200 hover:-translate-y-px active:translate-y-0"
            >
              <Activity className="h-3.5 w-3.5" />Activity
            </button>
            <input ref={fileInputRef} type="file" multiple className="sr-only"
              onChange={e => { if (e.target.files) ingestFiles(e.target.files); e.target.value = ""; }} />
          </>
        )}

        {/* View + fullscreen controls */}
        <div className="ml-auto flex items-center gap-1">
          {!empty && (
            <span className="text-[11px] text-white/20 mr-2">
              {links.length > 0 && `${links.length} link${links.length !== 1 ? "s" : ""}`}
              {links.length > 0 && files.length > 0 && " · "}
              {files.length > 0 && `${files.length} file${files.length !== 1 ? "s" : ""}`}
              {files.length > 0 && ` · ${fmtBytes(files.reduce((s, f) => s + f.size, 0))}`}
            </span>
          )}
          <button
            onClick={() => setViewMode("list")}
            className={cn("h-8 w-8 rounded-full border flex items-center justify-center transition duration-150",
              viewMode === "list" ? "border-primary/40 text-primary/70 bg-primary/8" : "border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn("h-8 w-8 rounded-full border flex items-center justify-center transition duration-150",
              viewMode === "grid" ? "border-primary/40 text-primary/70 bg-primary/8" : "border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setFullscreen(v => !v)}
            className="h-8 w-8 rounded-full border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 flex items-center justify-center transition duration-150"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
          <button onClick={() => setSelectedTag(null)}
            className={cn("h-6 px-3 rounded-full text-[11px] font-medium border transition", !selectedTag ? "bg-white/10 text-white/70 border-white/15" : "border-white/[0.06] text-white/30 hover:text-white/60")}>
            All
          </button>
          {allTags.map((t, i) => (
            <button key={t} onClick={() => setSelectedTag(selectedTag === t ? null : t)}
              className={cn("h-6 px-3 rounded-full text-[11px] font-medium border transition", selectedTag === t ? cn(TAG_COLORS[i % TAG_COLORS.length]) : "border-white/[0.06] text-white/30 hover:text-white/60")}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Drag-over overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="rounded-[28px] border-2 border-dashed border-primary/60 bg-primary/5 px-12 py-8 text-center">
            <Upload className="h-8 w-8 text-primary/60 mx-auto mb-2" />
            <p className="text-sm font-semibold text-primary/80">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Content */}
      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Plus className="h-5 w-5 text-white/20" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/40">Nothing here yet</p>
            <p className="text-xs text-white/20 mt-1">Add links, upload files, or drag files onto this page</p>
          </div>
          {!isReadOnly && (
            <div className="flex gap-2 mt-1">
              <button onClick={() => setAddLinkOpen(true)}
                className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/35 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 flex items-center gap-1.5 transition duration-200">
                <Link2 className="h-3 w-3" />Add link
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/35 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 flex items-center gap-1.5 transition duration-200">
                <Upload className="h-3 w-3" />Upload file
              </button>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid view ── */
        <div className="flex-1 overflow-y-auto min-h-0 pb-16">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleItems.map(item => {
              const id = item.kind === "link" ? item.link.id : item.file.id;
              return (
                <ItemCard key={id} item={item} meta={getMeta(id)}
                  onDeleteLink={deleteLink} onDeleteFile={deleteProjectFile} isReadOnly={isReadOnly}
                  onPreviewFile={setPreviewFileId} />
              );
            })}
          </div>
        </div>
      ) : (
        /* ── List view ── */
        <div
          className={cn(
            "flex-1 overflow-y-auto space-y-4 min-h-0 pb-16 rounded-2xl transition-all duration-150",
            listDragOver && "outline outline-2 outline-dashed outline-primary/25 outline-offset-[-2px] bg-primary/[0.02]",
          )}
          onDragOver={(e) => {
            if (!draggedItemId) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setListDragOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setListDragOver(false);
          }}
          onDrop={(e) => {
            if (!draggedItemId) return;
            e.preventDefault();
            const ids = selectedIds.has(draggedItemId) && selectedIds.size > 1
              ? [...selectedIds]
              : [draggedItemId];
            ids.forEach(id => onMetaChange(id, { folderId: null }));
            setDraggedItemId(null);
            setListDragOver(false);
            setFolderDragOver(null);
          }}
        >
          {folders.map(folder => {
            const items    = folderGroups[folder.id] ?? [];
            const collapsed = collapsedFolders.has(folder.id);
            const isTarget  = folderDragOver === folder.id;
            return (
              <section
                key={folder.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Clamp to viewport
                  const x = Math.min(e.clientX, window.innerWidth  - 200);
                  const y = Math.min(e.clientY, window.innerHeight - 120);
                  setFolderCtxMenu({ folderId: folder.id, folderName: folder.name, itemCount: items.length, x, y });
                }}
                onDragOver={(e) => {
                  if (!draggedItemId) return;
                  e.preventDefault();
                  e.stopPropagation(); // don't bubble to list container
                  e.dataTransfer.dropEffect = "move";
                  setFolderDragOver(folder.id);
                  setListDragOver(false);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setFolderDragOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // don't bubble to list container
                  if (draggedItemId) {
                    const ids = selectedIds.has(draggedItemId) && selectedIds.size > 1
                      ? [...selectedIds]
                      : [draggedItemId];
                    ids.forEach(id => onMetaChange(id, { folderId: folder.id }));
                    setDraggedItemId(null);
                  }
                  setFolderDragOver(null);
                }}
              >
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl border transition w-full text-left mb-1.5",
                    isTarget
                      ? "text-primary/80 bg-primary/10 border-primary/20"
                      : "text-white/60 bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]"
                  )}>
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                    <FolderOpen className={cn("h-4 w-4", isTarget ? "text-primary/70" : "text-amber-400/70")} />
                  </div>
                  <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform duration-150 text-white/30", !collapsed && "rotate-90")} />
                  {renamingFolderId === folder.id ? (
                    <input
                      autoFocus
                      value={renamingName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenamingName(e.target.value)}
                      onBlur={() => {
                        const trimmed = renamingName.trim();
                        if (trimmed) onRenameFolder(folder.id, trimmed);
                        setRenamingFolderId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const trimmed = renamingName.trim();
                          if (trimmed) onRenameFolder(folder.id, trimmed);
                          setRenamingFolderId(null);
                        } else if (e.key === "Escape") {
                          setRenamingFolderId(null);
                        }
                        e.stopPropagation();
                      }}
                      className="bg-transparent border-b border-primary/50 outline-none text-primary/80 font-medium min-w-0 flex-1 text-sm"
                    />
                  ) : (
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{folder.name}</span>
                  )}
                  <span className="text-xs text-white/25 tabular-nums shrink-0">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  {zippingFolderId === folder.id && (
                    <span className="shrink-0 h-3 w-3 inline-block border border-current border-t-transparent rounded-full animate-spin text-white/40" />
                  )}
                  {isTarget && <span className="text-[10px] text-primary/60 shrink-0">Drop here</span>}
                </button>
                {!collapsed && (
                  <div className="ml-4 pl-3 border-l border-white/[0.07] space-y-1.5 mt-1.5">
                    {items.length === 0 ? (
                      <p className={cn("text-[11px] px-2 py-2", isTarget ? "text-primary/50" : "text-white/20")}>
                        {isTarget ? "Release to move here" : "Empty folder"}
                      </p>
                    ) : items.map(item => {
                      const id = item.kind === "link" ? item.link.id : item.file.id;
                      return (
                        <ItemRow key={id} item={item} meta={getMeta(id)} folders={folders} allTags={allTags}
                          onMetaChange={m => onMetaChange(id, m)}
                          onDeleteLink={deleteLink} onDeleteFile={deleteProjectFile} isReadOnly={isReadOnly}
                          isDragging={draggedItemId === id}
                          onItemDragStart={setDraggedItemId}
                          onItemDragEnd={() => { setDraggedItemId(null); setFolderDragOver(null); }}
                          isSelected={selectedIds.has(id)}
                          showCheckbox={selectedIds.size > 0}
                          onToggleSelect={handleToggleSelect}
                          onPreviewFile={setPreviewFileId}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
          {folderGroups.__root__.length > 0 && (
            <section
              onDragOver={(e) => {
                if (!draggedItemId) return;
                e.preventDefault();
                e.stopPropagation(); // don't bubble to list container
                e.dataTransfer.dropEffect = "move";
                setFolderDragOver("__root__");
                setListDragOver(false);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setFolderDragOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation(); // don't bubble to list container
                if (draggedItemId) {
                  const ids = selectedIds.has(draggedItemId) && selectedIds.size > 1
                    ? [...selectedIds]
                    : [draggedItemId];
                  ids.forEach(id => onMetaChange(id, { folderId: null }));
                  setDraggedItemId(null);
                }
                setFolderDragOver(null);
              }}
            >
              {folders.length > 0 && (
                <p className={cn(
                  "text-[11px] font-semibold uppercase tracking-widest mb-2 px-2 py-1 rounded-xl border transition",
                  folderDragOver === "__root__"
                    ? "text-primary/80 bg-primary/10 border-primary/20"
                    : "text-white/25 border-transparent"
                )}>
                  {folderDragOver === "__root__" ? "Drop to unfolder" : "Unfoldered"}
                </p>
              )}
              <div className="space-y-1.5">
                {folderGroups.__root__.map(item => {
                  const id = item.kind === "link" ? item.link.id : item.file.id;
                  return (
                    <ItemRow key={id} item={item} meta={getMeta(id)} folders={folders} allTags={allTags}
                      onMetaChange={m => onMetaChange(id, m)}
                      onDeleteLink={deleteLink} onDeleteFile={deleteProjectFile} isReadOnly={isReadOnly}
                      isDragging={draggedItemId === id}
                      onItemDragStart={setDraggedItemId}
                      onItemDragEnd={() => { setDraggedItemId(null); setFolderDragOver(null); }}
                      isSelected={selectedIds.has(id)}
                      showCheckbox={selectedIds.size > 0}
                      onToggleSelect={handleToggleSelect}
                      onPreviewFile={setPreviewFileId}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <AddLinkDialog projectId={projectId} open={addLinkOpen} onOpenChange={setAddLinkOpen} />

      {/* ── Upload progress panel (Google Drive style) ── */}
      {uploadQueue.size > 0 && createPortal(
        <div className="fixed bottom-14 right-5 z-50 w-72 rounded-2xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-semibold text-white/60">
              {[...uploadQueue.values()].some(u => !u.done)
                ? `Uploading ${[...uploadQueue.values()].filter(u => !u.done).length} file${[...uploadQueue.values()].filter(u => !u.done).length !== 1 ? "s" : ""}…`
                : "Upload complete"}
            </span>
            <Upload className="h-3.5 w-3.5 text-white/25" />
          </div>
          {/* File rows */}
          <div className="p-3 space-y-3 max-h-52 overflow-y-auto">
            {[...uploadQueue.entries()].map(([key, item]) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex-1 text-[11px] text-white/60 truncate">{item.name}</span>
                  {item.done
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    : <span className="text-[10px] text-white/30 shrink-0 tabular-nums">{item.progress}%</span>
                  }
                </div>
                <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-200",
                      item.done ? "bg-primary/60" : "bg-primary/80"
                    )}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}

      {/* Folder right-click context menu */}
      {folderCtxMenu && (
        <FolderContextMenu
          menu={folderCtxMenu}
          isReadOnly={isReadOnly}
          zipping={zippingFolderId === folderCtxMenu.folderId}
          onClose={() => setFolderCtxMenu(null)}
          onRename={() => {
            setRenamingFolderId(folderCtxMenu.folderId);
            setRenamingName(folderCtxMenu.folderName);
          }}
          onDownload={() => downloadFolder(folderCtxMenu.folderId, folderCtxMenu.folderName)}
          onDelete={() => onDeleteFolder(folderCtxMenu.folderId)}
        />
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900/95 backdrop-blur-md shadow-2xl">
          <span className="text-xs font-semibold text-white/50 pr-1">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-white/[0.08]" />

          {/* Move to folder */}
          {folders.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setBulkMoveOpen(v => !v); }}
                className="h-7 px-3 text-xs rounded-full border border-white/10 text-white/60 hover:text-white/90 hover:border-white/20 flex items-center gap-1.5 transition"
              >
                <FolderOpen className="h-3 w-3" /> Move to…
              </button>
              {bulkMoveOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-44 rounded-xl border border-white/10 bg-zinc-900/98 backdrop-blur-md py-1 shadow-xl z-10">
                  <button onClick={() => handleBulkMove(null)}
                    className="w-full text-left px-3 py-1.5 text-xs text-white/50 hover:bg-white/[0.05] hover:text-white/80 transition">
                    No folder (unfolder)
                  </button>
                  <div className="mx-2 my-0.5 h-px bg-white/[0.06]" />
                  {folders.map(f => (
                    <button key={f.id} onClick={() => handleBulkMove(f.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-white/50 hover:bg-white/[0.05] hover:text-white/80 transition">
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Download zip (files only) */}
          <button
            onClick={handleBulkDownload}
            disabled={isBulkDownloading}
            className="h-7 px-3 text-xs rounded-full border border-white/10 text-white/60 hover:text-white/90 hover:border-white/20 flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <Download className="h-3 w-3" />
            {isBulkDownloading ? "Zipping…" : "Download zip"}
          </button>

          {/* Delete */}
          {!isReadOnly && (
            <button
              onClick={handleBulkDelete}
              className="h-7 px-3 text-xs rounded-full border border-red-500/15 text-red-400/60 hover:text-red-400/90 hover:border-red-500/30 hover:bg-red-500/5 flex items-center gap-1.5 transition"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}

          <div className="w-px h-4 bg-white/[0.08]" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="h-7 w-7 rounded-full border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 flex items-center justify-center transition"
          >
            <X className="h-3 w-3" />
          </button>
        </div>,
        document.body,
      )}

      {/* File preview modal */}
      {previewFileId && (() => {
        const previewFile = files.find(f => f.id === previewFileId);
        if (!previewFile) return null;
        return (
          <FilePreview
            file={previewFile}
            allFiles={files}
            onClose={() => setPreviewFileId(null)}
          />
        );
      })()}

      {/* Version conflict dialog */}
      {conflictState && (
        <VersionConflictDialog
          fileName={conflictState.fileName}
          onResolve={conflictState.resolve}
        />
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <>
        {/* Placeholder so column space is kept */}
        <div className="h-full" />
        <FullscreenOverlay onClose={() => setFullscreen(false)}>
          {content}
        </FullscreenOverlay>
      </>
    );
  }
  return content;
}

// ── Main export ───────────────────────────────────────────────────────────────

interface FilesViewProps {
  projectId: string;
  project:   Project;
  /** Pre-loaded branches — passed to GitSidebar to skip its own fetch. */
  initialBranches?: RepoBranch[];
  /** Pre-loaded contribution data — passed to GitSidebar to skip its own fetch. */
  initialContribs?: { date: string; count: number }[];
  /** Pre-loaded commits — passed to CommitsPanel to skip its own fetch. */
  initialCommits?: RepoCommit[];
}

export function FilesView({ projectId, project, initialBranches, initialContribs, initialCommits }: FilesViewProps) {
  const { getProjectFiles, getLinks } = useProjects();
  const files  = getProjectFiles(projectId);
  const links  = getLinks(projectId);

  const defaultBranch    = project.githubRepo?.defaultBranch ?? "main";
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [folders,        setFolders]        = useState<{ id: string; name: string }[]>([]);
  const [itemMeta,       setItemMeta]       = useState<Record<string, ItemMeta>>({});
  const [commitsFullscreen,  setCommitsFullscreen]  = useState(false);
  const [showCredentials,    setShowCredentials]    = useState(false);
  const [showTrash,          setShowTrash]          = useState(false);
  const [showActivity,       setShowActivity]       = useState(false);

  // ── Load folders from DB on mount ──────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/folders?projectId=${encodeURIComponent(projectId)}`)
      .then(async res => {
        const json = await res.json();
        if (!res.ok) { console.error("[Chronicle] GET /api/folders failed:", json); return; }
        console.log("[Chronicle] folders loaded:", json);
        setFolders((json as { id: string; name: string }[]).map(r => ({ id: r.id, name: r.name })));
      })
      .catch(err => console.error("[Chronicle] folders fetch error:", err));
  }, [projectId]);

  // ── Seed itemMeta from DB-loaded folderId/tags (once files/links arrive) ──
  const metaSeeded = useRef(false);
  useEffect(() => {
    if (metaSeeded.current) return;
    if (files.length === 0 && links.length === 0) return;
    const seed: Record<string, ItemMeta> = {};
    for (const f of files) seed[f.id] = { folderId: f.folderId, tags: f.tags };
    for (const l of links) seed[l.id] = { folderId: l.folderId, tags: l.tags };
    setItemMeta(seed);
    metaSeeded.current = true;
  }, [files, links]);

  // ── Folder CRUD (persisted) ────────────────────────────────────────────────
  function createFolder() {
    // Optimistic: add immediately with a temp ID so the button responds instantly
    const tempId = "fld_" + Math.random().toString(36).slice(2, 9);
    setFolders(prev => [...prev, { id: tempId, name: "New folder" }]);

    dbCreateFolder(projectId, "New folder")
      .then(row => {
        // Swap the temp ID for the real DB UUID
        setFolders(prev => prev.map(f => f.id === tempId ? { id: row.id, name: row.name } : f));
        // Also fix any itemMeta that got assigned to the temp ID during the brief window
        setItemMeta(prev => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(next)) {
            if (v.folderId === tempId) next[k] = { ...v, folderId: row.id };
          }
          return next;
        });
      })
      .catch(err => {
        console.error("[Chronicle] createFolder failed:", err);
        setFolders(prev => prev.filter(f => f.id !== tempId));
      });
  }

  function renameFolder(id: string, name: string) {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    dbRenameFolder(id, projectId, name).catch(console.error);
  }

  function deleteFolder(id: string) {
    // Optimistic: remove folder and un-assign any items that were in it
    setFolders(prev => prev.filter(f => f.id !== id));
    setItemMeta(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v.folderId === id) next[k] = { ...v, folderId: null };
      }
      return next;
    });
    import("@/lib/db/files").then(({ deleteFolder: dbDeleteFolder }) =>
      dbDeleteFolder(id, projectId).catch(console.error)
    );
  }

  // ── Item-meta change (persisted) ──────────────────────────────────────────
  function updateMeta(id: string, patch: Partial<ItemMeta>) {
    setItemMeta(prev => {
      const cur = prev[id] ?? { folderId: null, tags: [] };
      return { ...prev, [id]: { ...cur, ...patch } };
    });
    // Persist folder / tags assignment to DB
    const dbPatch: Record<string, unknown> = {};
    if ("folderId" in patch) dbPatch.folder_id = patch.folderId ?? null;
    if ("tags"     in patch) dbPatch.tags       = patch.tags    ?? [];
    if (Object.keys(dbPatch).length === 0) return;
    const isFile = files.some(f => f.id === id);
    if (isFile) dbUpdateFile(id, projectId, dbPatch as Parameters<typeof dbUpdateFile>[2]).catch(console.error);
    else        dbUpdateLink(id, projectId, dbPatch as Parameters<typeof dbUpdateLink>[2]).catch(console.error);
  }

  return (
    <div className="h-full flex gap-0 min-h-0">

      {/* ── Left: Git sidebar (~20%) ── */}
      <div className="w-[18%] shrink-0 flex flex-col overflow-hidden border-r border-white/[0.05] pr-4">
        <GitSidebar
          project={project}
          files={files}
          links={links}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
          initialBranches={initialBranches}
          initialContribs={initialContribs}
        />
      </div>

      {/* ── Middle: Commits panel (~35%) ── */}
      <div className="w-[35%] shrink-0 flex flex-col overflow-hidden border-r border-white/[0.05] px-4">
        <CommitsPanel
          project={project}
          selectedBranch={selectedBranch}
          isFullscreen={commitsFullscreen}
          onFullscreen={() => setCommitsFullscreen(v => !v)}
          initialCommits={initialCommits}
        />
        {commitsFullscreen && (
          <FullscreenOverlay onClose={() => setCommitsFullscreen(false)}>
            <CommitsPanel
              project={project}
              selectedBranch={selectedBranch}
              isFullscreen={true}
              onFullscreen={() => setCommitsFullscreen(false)}
            />
          </FullscreenOverlay>
        )}
      </div>

      {/* ── Right: Files panel, Credentials, or Trash (~45%) ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden pl-4">
        {showCredentials ? (
          <>
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <button
                onClick={() => setShowCredentials(false)}
                className="h-9 px-4 text-xs font-semibold rounded-full border border-primary/40 text-primary/75 bg-primary/10 flex items-center gap-1.5 transition duration-200"
              >
                <KeyRound className="h-3.5 w-3.5" />Credentials
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <CredentialsPanel project={project} />
            </div>
          </>
        ) : showTrash ? (
          <>
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <button
                onClick={() => setShowTrash(false)}
                className="h-9 px-4 text-xs font-semibold rounded-full border border-red-500/30 text-red-400/70 bg-red-500/8 flex items-center gap-1.5 transition duration-200"
              >
                <Trash2 className="h-3.5 w-3.5" />Trash
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <TrashPanel projectId={projectId} />
            </div>
          </>
        ) : showActivity ? (
          <>
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <button
                onClick={() => setShowActivity(false)}
                className="h-9 px-4 text-xs font-semibold rounded-full border border-primary/40 text-primary/75 bg-primary/10 flex items-center gap-1.5 transition duration-200"
              >
                <Activity className="h-3.5 w-3.5" />Activity
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ActivityPanel projectId={projectId} />
            </div>
          </>
        ) : (
          <RightFilesPanel
            projectId={projectId}
            folders={folders}
            itemMeta={itemMeta}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMetaChange={updateMeta}
            showCredentials={showCredentials}
            onToggleCredentials={() => setShowCredentials(true)}
            onToggleTrash={() => setShowTrash(true)}
            onToggleActivity={() => setShowActivity(true)}
          />
        )}
      </div>

    </div>
  );
}
