"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GitBranch, FileText, Globe, Palette, Link2 } from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";
import { LINK_TYPE_LABELS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import type { LinkType } from "@/types";

const LINK_TYPES: { value: LinkType; label: string; icon: React.ElementType; color: string; border: string }[] = [
  { value: "github",     label: "GitHub",     icon: GitBranch, color: "text-white/60",    border: "border-white/15"    },
  { value: "docs",       label: "Docs",       icon: FileText,  color: "text-blue-400/70", border: "border-blue-400/25" },
  { value: "production", label: "Production", icon: Globe,     color: "text-emerald-400/70", border: "border-emerald-400/25" },
  { value: "design",     label: "Design",     icon: Palette,   color: "text-violet-400/70", border: "border-violet-400/25" },
  { value: "other",      label: "Other",      icon: Link2,     color: "text-white/40",    border: "border-white/10"    },
];

const FIELD = "w-full bg-white/[0.04] border border-white/10 text-white/80 placeholder:text-white/20 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-white/30 transition duration-150";

interface AddLinkDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLinkDialog({ projectId, open, onOpenChange }: AddLinkDialogProps) {
  const { addLink } = useProjects();
  const [title,   setTitle]   = useState("");
  const [url,     setUrl]     = useState("");
  const [type,    setType]    = useState<LinkType>("other");
  const [loading, setLoading] = useState(false);

  function reset() {
    setTitle("");
    setUrl("");
    setType("other");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 150));
    addLink({ projectId, title: title.trim(), url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`, type, folderId: null, tags: [] });
    setLoading(false);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add link</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {LINK_TYPES.map(({ value, label, icon: Icon, color, border }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    "h-8 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition duration-150",
                    color,
                    border,
                    type === value ? "opacity-100 bg-white/[0.06]" : "opacity-40 hover:opacity-70"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">Label</label>
            <input
              placeholder="e.g. GitHub Repository"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={FIELD}
              autoFocus
            />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">URL</label>
            <input
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={FIELD}
              type="url"
            />
          </div>

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
              disabled={!title.trim() || !url.trim() || loading}
              className="flex-1 h-11 rounded-full border border-primary/75 text-primary/75 text-sm font-semibold hover:bg-primary/10 transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? "Adding…" : "Add link"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
