"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ImageIcon, Upload, X, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: {
  value: ProjectStatus;
  label: string;
  color: string;
  border: string;
  activeBg: string;
}[] = [
  { value: "active",   label: "Active",   color: "text-primary/80",  border: "border-primary/40",  activeBg: "bg-primary/15"   },
  { value: "paused",   label: "Paused",   color: "text-blue-400/80", border: "border-blue-400/40", activeBg: "bg-blue-400/15"  },
  { value: "archived", label: "Archived", color: "text-white/40",    border: "border-white/15",    activeBg: "bg-white/8"      },
];

const ICON_ACCEPT = ".png,.jpg,.jpeg,.svg,.webp,.ico,.icns,.gif,.avif,.bmp,.tiff,.tif";

const FIELD = [
  "w-full bg-white/[0.04] border border-white/10",
  "text-white/80 placeholder:text-white/20",
  "rounded-2xl px-4 py-2.5 text-sm outline-none",
  "focus:border-white/30 transition duration-150",
].join(" ");

// ── Icon picker sub-component ──────────────────────────────────────────────────

type IconMode = "upload" | "url" | null;

interface IconPickerProps {
  preview:   string;
  onPreview: (url: string, file?: File) => void;
  onClear:   () => void;
}

function IconPicker({ preview, onPreview, onClear }: IconPickerProps) {
  const [mode, setMode]         = useState<IconMode>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  // ── file upload ──
  // Use a stable callback ref so the native listener always calls the latest
  // version of onPreview without needing to re-register.
  const onPreviewRef = useRef(onPreview);
  useEffect(() => { onPreviewRef.current = onPreview; }, [onPreview]);

  const handleFilePick = useCallback((input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onPreviewRef.current(objectUrl, file);
    setMode(null);
    setUrlDraft("");
    // Reset so the same file can be re-selected
    setTimeout(() => { input.value = ""; }, 0);
  }, []);

  // Native listener — bypasses React's synthetic event system and the
  // @base-ui Dialog focus-trap that prevents onChange from firing on macOS.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const listener = () => handleFilePick(input);
    input.addEventListener("change", listener);
    return () => input.removeEventListener("change", listener);
  }, [handleFilePick]);

  // ── URL entry ──
  function handleUrlApply() {
    const u = urlDraft.trim();
    if (!u) return;
    setUrlError(false);
    onPreview(u);
    setMode(null);
  }

  function handleUrlKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleUrlApply(); }
    if (e.key === "Escape") { setMode(null); setUrlDraft(""); }
  }

  // ── clear ──
  function handleClear() {
    onClear();
    setMode(null);
    setUrlDraft("");
    setUrlError(false);
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
        Icon <span className="normal-case text-white/20 text-[10px]">(optional)</span>
      </label>

      <div className="flex items-start gap-4">
        {/* Preview circle */}
        <div
          className={cn(
            "w-16 h-16 rounded-full border-2 shrink-0 overflow-hidden flex items-center justify-center transition duration-200",
            preview ? "border-white/20 bg-transparent" : "border-dashed border-white/15 bg-white/[0.03]"
          )}
        >
          {preview ? (
            <img
              src={preview}
              alt="icon preview"
              className="w-full h-full object-cover"
              onError={() => { setUrlError(true); onClear(); }}
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-white/20" />
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0 space-y-2 pt-1">
          {/* Mode buttons */}
          {mode === null && (
            <div className="flex flex-wrap gap-1.5">
              <div className="relative inline-flex">
                <span className="h-8 px-3 text-xs font-semibold rounded-full border border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/8 flex items-center gap-1.5 transition duration-150 pointer-events-none select-none">
                  <Upload className="h-3 w-3" />
                  Upload
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ICON_ACCEPT}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  tabIndex={-1}
                />
              </div>
              <button
                type="button"
                onClick={() => setMode("url")}
                className="h-8 px-3 text-xs font-semibold rounded-full border border-white/10 text-white/40 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/8 flex items-center gap-1.5 transition duration-150"
              >
                <Link2 className="h-3 w-3" />
                From URL
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-8 px-3 text-xs font-semibold rounded-full border border-red-500/20 text-red-400/50 hover:text-red-400/80 hover:border-red-500/40 hover:bg-red-500/5 flex items-center gap-1.5 transition duration-150"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
          )}

          {/* URL input row */}
          {mode === "url" && (
            <div className="flex gap-2">
              <input
                autoFocus
                placeholder="https://example.com/icon.png"
                value={urlDraft}
                onChange={(e) => { setUrlDraft(e.target.value); setUrlError(false); }}
                onKeyDown={handleUrlKeyDown}
                className={cn(FIELD, "flex-1 py-2 text-xs", urlError && "border-red-500/40")}
              />
              <button
                type="button"
                onClick={handleUrlApply}
                className="h-9 px-3 text-xs font-semibold rounded-full border border-primary/50 text-primary/70 hover:bg-primary/10 shrink-0 transition duration-150"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => { setMode(null); setUrlDraft(""); setUrlError(false); }}
                className="h-9 w-9 rounded-full border border-white/10 text-white/30 hover:text-white/60 flex items-center justify-center shrink-0 transition duration-150"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {urlError && (
            <p className="text-[10px] text-red-400/70">Could not load image from that URL</p>
          )}

          {!preview && mode === null && (
            <p className="text-[10px] text-white/20 leading-relaxed">
              PNG, JPEG, SVG, WebP, ICO, ICNS, GIF · or any image URL
            </p>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject } = useProjects();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState<ProjectStatus>("active");
  const [iconPreview, setIconPreview] = useState(""); // blob: URL for local preview
  const [iconFile,    setIconFile]    = useState<File | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setStatus("active");
    setIconPreview("");
    setIconFile(null);
    setUploadError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    // Pre-generate the project ID so we can use it as the S3 key path
    const projectId = crypto.randomUUID();

    let logoUrl:    string | null = iconPreview.startsWith("blob:") ? null : (iconPreview || null);
    let logoS3Key:  string | null = null;

    // Upload logo to S3 if the user picked a file
    if (iconFile) {
      try {
        const { requestLogoUploadUrl } = await import("@/lib/db/files");
        const { uploadUrl, s3Key } = await requestLogoUploadUrl(
          projectId,
          iconFile.name,
          iconFile.type || "image/png",
        );
        const putRes = await fetch(uploadUrl, {
          method:  "PUT",
          body:    iconFile,
          headers: { "Content-Type": iconFile.type || "image/png" },
        });
        if (!putRes.ok) throw new Error(`S3 PUT failed: ${putRes.status} ${putRes.statusText}`);
        logoS3Key = s3Key;
        // Keep the blob URL as optimistic display — DB will generate presigned URLs on next load
        logoUrl   = iconPreview;
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Logo upload failed — project will be created without it.");
        logoUrl = null;
      }
      URL.revokeObjectURL(iconPreview);
    }

    addProject({
      id:          projectId,
      name:        name.trim(),
      description: description.trim() || null,
      status,
      logoUrl,
      logoS3Key,
    });
    setLoading(false);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
              Name
            </label>
            <input
              placeholder="My Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
              autoFocus
            />
          </div>

          {/* Icon picker */}
          <IconPicker
            preview={iconPreview}
            onPreview={(url, file) => { setIconPreview(url); if (file) setIconFile(file); setUploadError(null); }}
            onClear={() => { setIconPreview(""); setIconFile(null); setUploadError(null); }}
          />

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
              Description{" "}
              <span className="normal-case text-white/20 text-[10px]">(optional)</span>
            </label>
            <textarea
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={cn(FIELD, "resize-none leading-relaxed")}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
              Status
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "flex-1 h-9 rounded-full border text-xs font-semibold transition duration-150",
                    opt.color,
                    opt.border,
                    status === opt.value
                      ? cn("opacity-100", opt.activeBg)
                      : "opacity-40 hover:opacity-70"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload error banner */}
          {uploadError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
              <p className="text-xs text-red-400/80">{uploadError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { reset(); onOpenChange(false); }}
              className="flex-1 h-11 rounded-full border border-white/10 text-white/40 text-sm font-semibold hover:text-white/70 hover:border-white/20 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 h-11 rounded-full border border-primary/75 text-primary/75 text-sm font-semibold hover:bg-primary/10 transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
