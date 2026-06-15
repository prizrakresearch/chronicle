"use client";

import { createPortal } from "react-dom";
import { GitBranch, Copy, X } from "lucide-react";

interface Props {
  fileName: string;
  onResolve: (choice: "version" | "duplicate" | "cancel") => void;
}

export function VersionConflictDialog({ fileName, onResolve }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => onResolve("cancel")}
    >
      <div
        className="w-full max-w-sm bg-[#111] border border-white/[0.08] rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-white/85">File already exists</p>
            <p className="text-xs text-white/35 mt-0.5 break-all">
              <span className="text-white/55 font-medium">{fileName}</span> is already in this project.
            </p>
          </div>
          <button
            onClick={() => onResolve("cancel")}
            className="ml-3 shrink-0 h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/60 flex items-center justify-center transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <button
            onClick={() => onResolve("version")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/5 transition group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition">
              <GitBranch className="h-3.5 w-3.5 text-primary/70" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Save as new version</p>
              <p className="text-xs text-white/30 mt-0.5">Keeps the original, adds v2 history</p>
            </div>
          </button>

          <button
            onClick={() => onResolve("duplicate")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04] transition group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <Copy className="h-3.5 w-3.5 text-white/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Save as duplicate</p>
              <p className="text-xs text-white/30 mt-0.5">Uploads as &ldquo;{dupName(fileName)}&rdquo;</p>
            </div>
          </button>

          <button
            onClick={() => onResolve("cancel")}
            className="w-full px-4 py-2.5 rounded-2xl text-xs text-white/30 hover:text-white/50 transition text-center"
          >
            Cancel — don&apos;t upload
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function dupName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return `${filename} (copy)`;
  return `${filename.slice(0, dot)} (copy)${filename.slice(dot)}`;
}
