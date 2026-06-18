"use client";

import { use, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Plus, LayoutGrid, GitBranch, Paperclip, Link2, Share2, Download, NotebookPen,
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
  Pencil, X, ImageIcon, Upload, Loader2, Check,
} from "lucide-react";
import Link from "next/link";
import { UserBadge } from "@/components/layout/user-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAvatarColor } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { OverviewPanel } from "@/components/overview/overview-panel";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { FilesView } from "@/components/files/files-view";
import { NotesView } from "@/components/notes/notes-view";
import { useProjects } from "@/lib/store/projects-context";
import { requestLogoUploadUrl, saveProjectLogoKey } from "@/lib/db/files";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

// ── Placeholder icon pool (same as project-row) ──────────────────────────────
const PLACEHOLDER_ICONS = [
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
];
function getProjectIcon(name: string) {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % PLACEHOLDER_ICONS.length;
  return PLACEHOLDER_ICONS[idx];
}

// ── Editable avatar with logo picker ─────────────────────────────────────────
function TopbarAvatar({
  name, logoUrl, projectId, isReadOnly, onSave,
}: {
  name: string;
  logoUrl: string | null;
  projectId: string;
  isReadOnly: boolean;
  onSave: (url: string | null) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [draft,      setDraft]      = useState(logoUrl ?? "");
  const [imgErr,     setImgErr]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleOpen(o: boolean) {
    if (o) { setDraft(logoUrl ?? ""); setUploadErr(null); }
    setImgErr(false);
    setOpen(o);
  }

  function handleSaveUrl() {
    const trimmed = draft.trim();
    onSave(trimmed || null);
    setOpen(false);
  }

  function handleRemove() {
    onSave(null);
    setOpen(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be picked again
    e.target.value = "";
    setUploading(true);
    setUploadErr(null);
    try {
      // 1. Get presigned PUT URL from server
      const { uploadUrl, s3Key } = await requestLogoUploadUrl(projectId, file.name, file.type);
      // 2. Upload bytes directly to S3
      const putRes = await fetch(uploadUrl, {
        method:  "PUT",
        body:    file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);
      // 3. Save key server-side, get fresh presigned GET URL back
      const freshUrl = await saveProjectLogoKey(projectId, s3Key);
      // 4. Update parent state
      onSave(freshUrl);
      setOpen(false);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Avatar rendering
  const showImg = logoUrl && !imgErr;
  const AvatarNode = showImg ? (
    <img
      src={logoUrl}
      alt={name}
      onError={() => setImgErr(true)}
      className="w-9 h-9 rounded-full object-cover shrink-0"
    />
  ) : (() => {
    const Icon = getProjectIcon(name);
    return (
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 select-none", getAvatarColor(name))}>
        <Icon className="h-4 w-4" />
      </div>
    );
  })();

  // Preview in popover (tracks draft URL while typing)
  const PreviewNode = draft.trim() ? (
    <img
      src={draft.trim()}
      alt="preview"
      className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
      onError={() => {}}
    />
  ) : (() => {
    const Icon = getProjectIcon(name);
    return (
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", getAvatarColor(name))}>
        <Icon className="h-4 w-4" />
      </div>
    );
  })();

  if (isReadOnly) return AvatarNode;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger
        render={
          <button className="relative group shrink-0 focus:outline-none">
            {AvatarNode}
            <span className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Pencil className="h-3 w-3 text-white/80" />
            </span>
          </button>
        }
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 p-3 rounded-2xl bg-zinc-950 border border-white/10 shadow-xl"
      >
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Project icon
        </p>

        {/* Preview row */}
        <div className="flex items-center gap-3 mb-3">
          {PreviewNode}
          <p className="text-xs text-zinc-500 leading-relaxed flex-1">
            Upload an image or paste a URL. Square images look best.
          </p>
        </div>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-9 mb-2 flex items-center justify-center gap-2 text-xs font-medium rounded-xl border border-dashed border-white/15 text-zinc-400 hover:border-white/30 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="h-3.5 w-3.5" /> Upload image</>
          )}
        </button>

        {uploadErr && (
          <p className="text-[11px] text-red-400 mb-2">{uploadErr}</p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">or paste URL</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* URL input */}
        <div className="relative mb-2">
          <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 pointer-events-none" />
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveUrl(); if (e.key === "Escape") setOpen(false); }}
            placeholder="https://…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveUrl}
            disabled={uploading}
            className="flex-1 h-8 text-xs font-semibold rounded-xl bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-40"
          >
            Save URL
          </button>
          {logoUrl && (
            <button
              onClick={handleRemove}
              className="h-8 px-3 text-xs font-medium rounded-xl text-zinc-500 hover:text-red-400 border border-white/10 hover:border-red-400/30 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="h-8 px-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type TabValue = "overview" | "roadmap" | "files" | "notes";

const TABS: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Overview", icon: <LayoutGrid  className="h-3.5 w-3.5" /> },
  { value: "roadmap",  label: "Roadmap",  icon: <GitBranch   className="h-3.5 w-3.5" /> },
  { value: "files",    label: "Files",    icon: <Paperclip   className="h-3.5 w-3.5" /> },
  { value: "notes",    label: "Notes",    icon: <NotebookPen className="h-3.5 w-3.5" /> },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject, updateProject, isReadOnly } = useProjects();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabValue>(
    (searchParams.get("tab") as TabValue) ?? "overview"
  );
  const [createOpen,  setCreateOpen]  = useState(false);
  const [copied,      setCopied]      = useState(false);
  // Share popover state
  const [shareOpen,   setShareOpen]   = useState(false);
  const [shareName,   setShareName]   = useState("");
  const [shareState,  setShareState]  = useState<"idle" | "shared">("idle");

  async function handleShareSubmit() {
    const name = shareName.trim();
    const url  = `${window.location.origin}/share/${id}${name ? `?to=${encodeURIComponent(name)}` : ""}`;

    // 1. Copy link to clipboard
    try { await navigator.clipboard.writeText(url); } catch { /* permission denied */ }

    // 2. Open native share sheet (macOS/iOS/Android)
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: project?.name ?? "Chronicle project", url }); } catch { /* user cancelled */ }
    }

    setShareState("shared");
    setTimeout(() => {
      setShareState("idle");
      setShareOpen(false);
      setShareName("");
    }, 1500);
  }

  function handleCopyLink() {
    if (!project?.githubRepo) return;
    navigator.clipboard.writeText(`https://github.com/${project.githubRepo.fullName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!project?.githubRepo) return;
    const { fullName, defaultBranch } = project.githubRepo;
    window.open(
      `https://github.com/${fullName}/archive/refs/heads/${defaultBranch}.zip`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const project = getProject(id);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft,   setNameDraft]   = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName() {
    if (!project || isReadOnly) return;
    setNameDraft(project.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed && project && trimmed !== project.name) {
      updateProject(project.id, { name: trimmed });
    }
    setEditingName(false);
  }

  // Dynamic tab title: "Chronicle - Project Name"
  useEffect(() => {
    if (project) {
      document.title = `Chronicle - ${project.name}`;
    }
    return () => { document.title = "Chronicle"; };
  }, [project?.name]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm text-white/40">Project not found.</p>
        <Link href="/" className="mt-3 text-xs text-white/25 hover:text-white/60 transition-colors duration-200">
          ← Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── Topbar ── */}
      <div className="shrink-0 pb-5 px-4 md:py-5 md:px-6 flex items-center z-20 relative"
           style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top, 1.25rem))" }}>

        {/* Left: Back button + project identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/"
            className="h-11 px-0 md:px-5 w-11 md:w-auto text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 gap-2 transition duration-200 ease-in-out shrink-0 flex items-center justify-center"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Back</span>
          </Link>

          {/* Project identity pill — hidden on mobile */}
          <div className="hidden md:flex items-center gap-3 pl-1 pr-5 h-11 rounded-full border border-white/10 bg-transparent shrink-0">
            <TopbarAvatar
              name={project.name}
              logoUrl={project.logoUrl}
              projectId={project.id}
              isReadOnly={isReadOnly}
              onSave={(url) => updateProject(project.id, { logoUrl: url })}
            />

            {/* Editable name */}
            {editingName && !isReadOnly ? (
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter")  { e.currentTarget.blur(); }
                  if (e.key === "Escape") { setEditingName(false); }
                }}
                autoFocus
                className="text-sm font-semibold text-white bg-transparent border-b border-white/30 outline-none w-40 focus:border-white/60 transition-colors"
              />
            ) : (
              <h1
                onClick={startEditName}
                title={!isReadOnly ? "Click to rename" : undefined}
                className={cn(
                  "text-sm font-semibold text-white whitespace-nowrap",
                  !isReadOnly && "cursor-text hover:text-white/80 transition-colors"
                )}
              >
                {project.name}
              </h1>
            )}

            <span className="text-xs text-white/30">·</span>
            <span className="text-xs text-white/45 capitalize">{project.status}</span>
          </div>
        </div>

        {/* Centre: Chronicle (tablet/desktop) · project name (mobile) */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none max-w-[40vw] overflow-hidden text-center">
          <span className="hidden md:block text-sm font-semibold text-white/80">Chronicle</span>
          <span className="md:hidden text-sm font-semibold text-white truncate block">{project.name}</span>
        </div>

        {/* Right: New project (owner) + UserBadge */}
        <div className="flex items-center gap-2 shrink-0">
          {!isReadOnly && (
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="hidden md:inline-flex h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 gap-2 transition duration-200 ease-in-out"
            >
              <Plus className="h-3.5 w-3.5" />
              New project
            </Button>
          )}
          <div className="hidden md:block"><UserBadge /></div>
        </div>
      </div>

      {/* ── Tab pills + status + action buttons ── */}
      <div className="shrink-0 px-4 pb-3 md:px-6 md:pb-4 pb-6 flex items-center">

        {/* Mobile: 2×2 pill grid */}
        <div className="md:hidden grid grid-cols-2 gap-2 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "group h-11 pl-1 pr-4 rounded-full text-sm font-medium border flex items-center gap-2.5 transition duration-200 ease-in-out w-full",
                activeTab === tab.value
                  ? "text-primary/75 border-transparent"
                  : "text-white/50 border-white/10 hover:border-transparent hover:text-primary/75"
              )}
            >
              <span className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition duration-200 ease-in-out group-hover:scale-110",
                activeTab === tab.value ? "bg-primary/75" : "bg-zinc-800 group-hover:bg-primary/75"
              )}>
                <span className={cn("transition duration-200 ease-in-out group-hover:text-black", activeTab === tab.value && "text-black")}>
                  {tab.icon}
                </span>
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tablet/desktop: scrollable pill row (untouched) */}
        <div className="hidden md:flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "group h-11 pl-1 pr-4 rounded-full text-sm font-medium border flex items-center gap-2.5 transition duration-200 ease-in-out",
                activeTab === tab.value
                  ? "text-primary/75 border-transparent"
                  : "text-white/50 border-white/10 hover:border-transparent hover:text-primary/75"
              )}
            >
              <span className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition duration-200 ease-in-out group-hover:scale-110",
                activeTab === tab.value ? "bg-primary/75" : "bg-zinc-800 group-hover:bg-primary/75"
              )}>
                <span className={cn("transition duration-200 ease-in-out group-hover:text-black", activeTab === tab.value && "text-black")}>
                  {tab.icon}
                </span>
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Centre: Status — hidden on mobile, editable for owner, static badge for guests */}
        <div className="hidden md:contents">
        {isReadOnly ? (
          <span className={cn(
            "h-11 px-5 text-sm font-semibold capitalize flex items-center rounded-full border border-white/10",
            project.status === "active"   && "text-primary",
            project.status === "paused"   && "text-blue-400",
            project.status === "archived" && "text-white/35",
          )}>
            {project.status}
          </span>
        ) : (
          <Select
            value={project.status}
            onValueChange={(v) => updateProject(project.id, { status: v as ProjectStatus })}
          >
            <SelectTrigger className="!h-11 px-5 !rounded-full !bg-transparent !border-white/10 hover:!border-white/20 text-sm font-semibold hover:-translate-y-px active:translate-y-0 transition duration-200 ease-in-out !w-auto focus-visible:!ring-0 focus-visible:!border-white/20 [&>svg]:text-white/30 [&>svg]:size-3.5">
              <span className={cn(
                "capitalize",
                project.status === "active"   && "text-primary",
                project.status === "paused"   && "text-blue-400",
                project.status === "archived" && "text-white/35",
              )}>
                {project.status}
              </span>
            </SelectTrigger>
            <SelectContent
              align="center"
              alignItemWithTrigger={false}
              className="!rounded-[28px] !bg-black/95 !border !border-white/10 !p-2 !shadow-none !min-w-0"
            >
              <SelectItem value="active"   className="!rounded-full !h-11 !px-5 !py-0 !mb-1.5 text-sm !font-semibold !cursor-pointer !justify-center [&>*:first-child]:!flex-none !border !border-primary/75  !text-primary/75  [&_*]:!text-primary/75  data-[highlighted]:!bg-primary/10  data-[selected]:!bg-primary/90  data-[selected]:!border-primary  data-[selected]:!text-black  [&[data-selected]_*]:!text-black">Active</SelectItem>
              <SelectItem value="paused"   className="!rounded-full !h-11 !px-5 !py-0 !mb-1.5 text-sm !font-semibold !cursor-pointer !justify-center [&>*:first-child]:!flex-none !border !border-blue-400/75 !text-blue-400/75 [&_*]:!text-blue-400/75 data-[highlighted]:!bg-blue-400/10  data-[selected]:!bg-blue-400/90 data-[selected]:!border-blue-400  data-[selected]:!text-black  [&[data-selected]_*]:!text-black">Paused</SelectItem>
              <SelectItem value="archived" className="!rounded-full !h-11 !px-5 !py-0          text-sm !font-semibold !cursor-pointer !justify-center [&>*:first-child]:!flex-none !border !border-white/15  !text-white/40  [&_*]:!text-white/40  data-[highlighted]:!bg-white/5     data-[selected]:!bg-white/40    data-[selected]:!border-white/40  data-[selected]:!text-black    [&[data-selected]_*]:!text-black">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}
        </div>

        {/* Right: Action buttons — hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 flex-1 justify-end">

          {/* Copy repo link */}
          <button
            onClick={handleCopyLink}
            disabled={!project.githubRepo}
            title={!project.githubRepo ? "No GitHub repo linked" : `Copy GitHub link for ${project.githubRepo.fullName}`}
            className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent border flex items-center gap-2 transition duration-200 ease-in-out hover:-translate-y-px active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-violet-400/75 border-violet-400/75 hover:bg-violet-400/10"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy GitHub link"}
          </button>

          {/* Share — opens popover with optional recipient name, copies link + native share sheet */}
          <Popover
            open={shareOpen}
            onOpenChange={(v) => {
              setShareOpen(v);
              if (!v) { setShareName(""); setShareState("idle"); }
            }}
          >
            <PopoverTrigger
              render={
                <button className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-violet-400/75 border border-violet-400/75 hover:bg-violet-400/10 hover:-translate-y-px active:translate-y-0 flex items-center gap-2 transition duration-200 ease-in-out">
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              }
            />
            <PopoverContent
              side="bottom"
              align="end"
              className="w-72 p-4 rounded-2xl bg-zinc-950 border border-white/10 shadow-xl z-50"
            >
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Share project
              </p>

              {/* Optional recipient name */}
              <label className="block text-xs text-white/40 mb-1.5">
                Recipient name <span className="text-white/20">(optional)</span>
              </label>
              <input
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleShareSubmit(); }}
                placeholder="e.g. Alice"
                className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 transition-colors mb-3"
              />

              {/* URL preview */}
              <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.06] mb-3 overflow-hidden">
                <p className="text-[11px] text-zinc-600 truncate font-mono">
                  /share/{id}{shareName.trim() ? `?to=${encodeURIComponent(shareName.trim())}` : ""}
                </p>
              </div>

              {/* Share button */}
              <button
                onClick={handleShareSubmit}
                className="w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold rounded-full text-violet-400/75 border border-violet-400/75 hover:bg-violet-400/10 active:translate-y-px transition duration-200"
              >
                {shareState === "shared"
                  ? <><Check className="h-3.5 w-3.5" /> Shared!</>
                  : <><Share2 className="h-3.5 w-3.5" /> Share</>}
              </button>
            </PopoverContent>
          </Popover>

          {/* Download repo ZIP */}
          <button
            onClick={handleDownload}
            disabled={!project.githubRepo}
            title={!project.githubRepo ? "No GitHub repo linked" : `Download ${project.githubRepo.defaultBranch}.zip`}
            className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent border flex items-center gap-2 transition duration-200 ease-in-out hover:-translate-y-px active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-violet-400/75 border-violet-400/75 hover:bg-violet-400/10"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>

        </div>

      </div>

      {/* ── Tab content ── */}
      <div className={cn(
        "flex-1 px-4 md:px-6 py-2 min-h-0",
        activeTab === "notes" || activeTab === "files"
          ? "overflow-hidden"
          : activeTab === "overview"
          ? "overflow-y-auto md:overflow-hidden"
          : "overflow-y-auto"
      )}>
        {activeTab === "overview"  && <OverviewPanel project={project} onOpenNotes={() => setActiveTab("notes")} />}
        {activeTab === "roadmap"   && <RoadmapBoard  projectId={project.id} />}
        {activeTab === "files"     && <FilesView     projectId={project.id} project={project} />}
        {activeTab === "notes"     && <NotesView     project={project} />}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
