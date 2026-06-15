"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Download, ChevronLeft, ChevronRight, File, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@/types";

interface FilePreviewProps {
  file: ProjectFile;
  allFiles: ProjectFile[];
  onClose: () => void;
}

export function FilePreview({ file, allFiles, onClose }: FilePreviewProps) {
  const [current, setCurrent]       = useState(file);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const idx     = allFiles.findIndex((f) => f.id === current.id);
  const hasPrev = idx > 0;
  const hasNext = idx < allFiles.length - 1;

  const goTo   = useCallback((f: ProjectFile) => { setCurrent(f); setTextContent(null); }, []);
  const goPrev = useCallback(() => { if (hasPrev) goTo(allFiles[idx - 1]); }, [hasPrev, idx, allFiles, goTo]);
  const goNext = useCallback(() => { if (hasNext) goTo(allFiles[idx + 1]); }, [hasNext, idx, allFiles, goTo]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      { onClose(); return; }
      if (e.key === "ArrowLeft")   goPrev();
      if (e.key === "ArrowRight")  goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    if (!current.mimeType.startsWith("text/")) return;
    setLoadingText(true);
    fetch(current.dataUrl)
      .then((r) => r.text())
      .then(setTextContent)
      .catch(() => setTextContent("Failed to load content."))
      .finally(() => setLoadingText(false));
  }, [current.id, current.dataUrl, current.mimeType]);

  function renderContent() {
    const { mimeType, dataUrl, name } = current;

    if (mimeType.startsWith("image/")) {
      return (
        <img
          src={dataUrl} alt={name} draggable={false}
          className="max-w-full max-h-full object-contain select-none rounded-xl"
        />
      );
    }
    if (mimeType.startsWith("video/")) {
      return (
        <video src={dataUrl} controls className="max-w-full max-h-full rounded-xl" />
      );
    }
    if (mimeType.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-white/[0.06] flex items-center justify-center">
            <Music className="h-10 w-10 text-yellow-400/50" />
          </div>
          <p className="text-sm text-white/50 max-w-xs truncate text-center">{name}</p>
          <audio src={dataUrl} controls className="w-80" />
        </div>
      );
    }
    if (mimeType === "application/pdf") {
      return <iframe src={dataUrl} title={name} className="w-full h-full rounded-xl bg-white" />;
    }
    if (mimeType.startsWith("text/")) {
      if (loadingText) return <p className="text-white/30 text-sm">Loading…</p>;
      return (
        <pre className="text-xs text-white/70 font-mono leading-relaxed whitespace-pre-wrap overflow-auto max-w-full max-h-full p-5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          {textContent}
        </pre>
      );
    }
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-white/[0.06] flex items-center justify-center">
          <File className="h-9 w-9 text-zinc-400/50" />
        </div>
        <p className="text-sm text-white/40">No preview available</p>
        <a
          href={dataUrl} download={name}
          className="h-9 px-4 text-xs font-semibold rounded-full border border-white/10 text-white/50 hover:text-primary/80 hover:border-primary/60 hover:bg-primary/10 flex items-center gap-1.5 transition"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] bg-black/92 backdrop-blur-sm flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium text-white/60 truncate max-w-[60%]">{current.name}</p>
        <div className="flex items-center gap-2">
          <a
            href={current.dataUrl} download={current.name}
            className="h-8 w-8 rounded-full border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 flex items-center justify-center transition"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 flex items-center justify-center transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-16 py-4" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>

      {/* Prev / Next arrows */}
      {allFiles.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            disabled={!hasPrev}
            className={cn(
              "fixed left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border flex items-center justify-center transition bg-black/50 backdrop-blur-sm",
              hasPrev ? "border-white/15 text-white/60 hover:text-white/90 hover:border-white/30" : "border-white/[0.04] text-white/15 cursor-default",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            disabled={!hasNext}
            className={cn(
              "fixed right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border flex items-center justify-center transition bg-black/50 backdrop-blur-sm",
              hasNext ? "border-white/15 text-white/60 hover:text-white/90 hover:border-white/30" : "border-white/[0.04] text-white/15 cursor-default",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot strip */}
      {allFiles.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          {allFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => goTo(f)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                f.id === current.id ? "w-4 bg-white/60" : "w-1.5 bg-white/20 hover:bg-white/40",
              )}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
