"use client";

import { useState, useRef } from "react";
import {
  Plus, Link2, Upload, GitBranch, FileText, Globe, Palette,
  Image, Video, Music, Archive, Code2, File,
  Copy, Check, Trash2, ExternalLink, Download,
} from "lucide-react";
import { AddLinkDialog } from "./add-link-dialog";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { ProjectLink, ProjectFile } from "@/types";

// ── Link helpers ───────────────────────────────────────────────────────────────

const LINK_ICONS = {
  github:     GitBranch,
  docs:       FileText,
  production: Globe,
  design:     Palette,
  other:      Link2,
};
const LINK_ICON_COLORS = {
  github:     "text-zinc-300",
  docs:       "text-blue-400",
  production: "text-emerald-400",
  design:     "text-violet-400",
  other:      "text-zinc-400",
};

// ── File helpers ───────────────────────────────────────────────────────────────

function fileIcon(mimeType: string): React.ElementType {
  if (mimeType.startsWith("image/"))  return Image;
  if (mimeType.startsWith("video/"))  return Video;
  if (mimeType.startsWith("audio/"))  return Music;
  if (mimeType.startsWith("text/") || mimeType.includes("javascript") || mimeType.includes("json")) return Code2;
  if (mimeType.includes("pdf"))       return FileText;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar") || mimeType.includes("gzip")) return Archive;
  return File;
}

function fileIconColor(mimeType: string): string {
  if (mimeType.startsWith("image/"))  return "text-pink-400";
  if (mimeType.startsWith("video/"))  return "text-orange-400";
  if (mimeType.startsWith("audio/"))  return "text-yellow-400";
  if (mimeType.includes("pdf"))       return "text-red-400";
  if (mimeType.startsWith("text/") || mimeType.includes("javascript") || mimeType.includes("json")) return "text-blue-400";
  if (mimeType.includes("zip") || mimeType.includes("tar")) return "text-amber-400";
  return "text-zinc-400";
}

function formatSize(bytes: number): string {
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LinkRow({ link }: { link: ProjectLink }) {
  const { deleteLink } = useProjects();
  const [copied, setCopied] = useState(false);
  const Icon = LINK_ICONS[link.type];

  async function handleCopy() {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition duration-150 group">
      <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className={cn("h-4 w-4", LINK_ICON_COLORS[link.type])} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 truncate">{link.title}</p>
        <p className="text-xs text-white/25 truncate mt-0.5">{link.url}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={handleCopy}
          className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150 ml-0.5"
        >
          {copied ? <Check className="h-3 w-3 text-primary/80" /> : <Copy className="h-3 w-3" />}
        </button>
        <button
          onClick={() => deleteLink(link.id)}
          className="h-7 w-7 rounded-full border border-red-500/10 text-red-400/30 hover:text-red-400/80 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center transition duration-150 ml-0.5"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function FileRow({ file }: { file: ProjectFile }) {
  const { deleteProjectFile } = useProjects();
  const Icon = fileIcon(file.mimeType);

  function handleDownload() {
    const a = document.createElement("a");
    a.href     = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleOpen() {
    window.open(file.dataUrl, "_blank");
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition duration-150 group">
      <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className={cn("h-4 w-4", fileIconColor(file.mimeType))} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
        <p className="text-xs text-white/25 mt-0.5">
          {formatSize(file.size)} · {formatDate(file.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
        <button
          onClick={handleOpen}
          className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150"
        >
          <ExternalLink className="h-3 w-3" />
        </button>
        <button
          onClick={handleDownload}
          className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 flex items-center justify-center transition duration-150 ml-0.5"
        >
          <Download className="h-3 w-3" />
        </button>
        <button
          onClick={() => deleteProjectFile(file.id)}
          className="h-7 w-7 rounded-full border border-red-500/10 text-red-400/30 hover:text-red-400/80 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center transition duration-150 ml-0.5"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

interface LinksListProps {
  projectId: string;
}

export function LinksList({ projectId }: LinksListProps) {
  const { getLinks, getProjectFiles, uploadFile } = useProjects();
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const links = getLinks(projectId);
  const files = getProjectFiles(projectId);
  const empty = links.length === 0 && files.length === 0;

  // ── File ingestion ──────────────────────────────────────────────────────────

  async function ingestFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setUploading(true);
    try {
      await Promise.all(arr.map((f) => uploadFile(f, projectId)));
    } catch (err) {
      console.error("[links-list] upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) ingestFiles(e.target.files);
    e.target.value = "";
  }

  const dragCounter = useRef(0);
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files) ingestFiles(e.dataTransfer.files);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="h-full flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <button
          onClick={() => setAddLinkOpen(true)}
          className="h-11 px-5 text-sm font-semibold rounded-full border border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 flex items-center gap-2 transition duration-200"
        >
          <Link2 className="h-3.5 w-3.5" />
          Add link
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-11 px-5 text-sm font-semibold rounded-full border border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 flex items-center gap-2 transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload file"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleFileInput}
        />
        {(links.length > 0 || files.length > 0) && (
          <span className="ml-auto text-[11px] text-white/20">
            {links.length > 0 && `${links.length} link${links.length !== 1 ? "s" : ""}`}
            {links.length > 0 && files.length > 0 && " · "}
            {files.length > 0 && `${files.length} file${files.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      {/* Drag-over overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="rounded-[28px] border-2 border-dashed border-primary/60 bg-primary/5 px-12 py-8 text-center">
            <Upload className="h-8 w-8 text-primary/60 mx-auto mb-2" />
            <p className="text-sm font-semibold text-primary/80">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Plus className="h-5 w-5 text-white/20" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/40">Nothing here yet</p>
            <p className="text-xs text-white/20 mt-1">Add links or upload files — or drag files onto this page</p>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setAddLinkOpen(true)}
              className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/35 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 flex items-center gap-1.5 transition duration-200"
            >
              <Link2 className="h-3 w-3" />
              Add link
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/35 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 flex items-center gap-1.5 transition duration-200"
            >
              <Upload className="h-3 w-3" />
              Upload file
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Links section */}
          {links.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-2 px-1">
                Links
              </p>
              <div className="space-y-1.5">
                {links.map((link) => <LinkRow key={link.id} link={link} />)}
              </div>
            </section>
          )}

          {/* Files section */}
          {files.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-2 px-1">
                Uploaded files
              </p>
              <div className="space-y-1.5">
                {files.map((file) => <FileRow key={file.id} file={file} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <AddLinkDialog projectId={projectId} open={addLinkOpen} onOpenChange={setAddLinkOpen} />
    </div>
  );
}
