"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, FileText, Trash2, Upload, Download, Share2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/store/projects-context";
import type { MarkdownNote, Project } from "@/types";

// ── File-to-plain-text extraction ─────────────────────────────────────────────

function stripRtf(raw: string): string {
  return raw
    .replace(/\{\\[^{}]*\}/g, "")
    .replace(/\\[a-z]+\-?\d*\s?/gi, "")
    .replace(/\\\*\s?/g, "")
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/[{}\\]/g, "")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtml(raw: string): string {
  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    return doc.body.textContent?.trim() ?? "";
  } catch {
    return raw.replace(/<[^>]+>/g, " ").trim();
  }
}

function extractXmlText(raw: string): string {
  const wt = [...raw.matchAll(/<w:t(?:[^>]*)?>([^<]*)<\/w:t>/g)].map(m => m[1]);
  if (wt.length > 0) return wt.join(" ").replace(/\s+/g, " ").trim();
  const odt = [...raw.matchAll(/<text:[ps][^>]*>([^<]*)<\/text:[ps][^>]*>/g)].map(m => m[1]);
  if (odt.length > 0) return odt.join(" ").replace(/\s+/g, " ").trim();
  const generic = [...raw.matchAll(/>([^<]{3,})</g)].map(m => m[1].trim()).filter(Boolean);
  return generic.join(" ").replace(/\s+/g, " ").trim();
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["txt", "md", "markdown", "text", "log", "csv", "tsv", "yaml", "yml", "json"].includes(ext)) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (e) => resolve((e.target?.result as string) ?? "");
      r.readAsText(file);
    });
  }
  if (["html", "htm"].includes(ext)) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (e) => resolve(stripHtml((e.target?.result as string) ?? ""));
      r.readAsText(file);
    });
  }
  if (ext === "rtf") {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (e) => resolve(stripRtf((e.target?.result as string) ?? ""));
      r.readAsText(file);
    });
  }
  if (["docx", "pages", "odt", "doc"].includes(ext)) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
          const raw = Array.from(bytes).map(b => String.fromCharCode(b)).join("");
          resolve(extractXmlText(raw) || "[Could not extract text — try copy-pasting the content]");
        } catch {
          resolve("[Could not read file]");
        }
      };
      r.readAsArrayBuffer(file);
    });
  }
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload  = (e) => resolve((e.target?.result as string) ?? "");
    r.onerror = ()  => resolve("[Could not read file]");
    r.readAsText(file);
  });
}

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() || "Imported note";
}

// ── Export / Share helpers ─────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toPlainText(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .trim();
}

function buildPrintHtml(title: string, md: string): string {
  const esc = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = esc
    .split(/\n{2,}/)
    .map(block => {
      const b = block.trim();
      if (!b) return "";
      for (let n = 6; n >= 1; n--) {
        if (b.startsWith("#".repeat(n) + " ")) return `<h${n}>${b.slice(n + 1)}</h${n}>`;
      }
      if (/^([-*+]|\d+\.) /.test(b)) {
        const isOl  = /^\d+\. /.test(b);
        const tag   = isOl ? "ol" : "ul";
        const items = b.split("\n").filter(l => /^([-*+]|\d+\.) /.test(l))
          .map(l => `<li>${l.replace(/^([-*+]|\d+\.) /, "")}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
      }
      if (b.startsWith("&gt; ")) return `<blockquote>${b.replace(/^&gt;\s+/gm, "")}</blockquote>`;
      return `<p>${b.replace(/\n/g, " ")}</p>`;
    })
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`([^`]+)`/g,     "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"><title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           max-width: 680px; margin: 48px auto; color: #111; line-height: 1.65; }
    h1 { font-size: 2em; margin: 0 0 0.5em; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    h3 { font-size: 1.25em; margin-top: 1.25em; }
    h4,h5,h6 { margin-top: 1em; }
    p { margin: 0.75em 0; }
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    li { margin: 0.25em 0; }
    code { font-family: ui-monospace, monospace; background: #f3f3f3;
           padding: 2px 5px; border-radius: 3px; font-size: 0.875em; }
    pre  { background: #f3f3f3; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1em; color: #555; font-style: italic; }
    a { color: #0070f3; }
    @media print { body { margin: 0; } }
  </style>
</head><body>
  <h1>${title}</h1>${body}
</body></html>`;
}

// ── Misc helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function notePreview(content: string) {
  return content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 80);
}

const PROSE = `w-1/2 overflow-y-auto px-6 py-5
  [&_h1]:text-white/90 [&_h1]:font-bold [&_h1]:text-xl [&_h1]:mb-3 [&_h1]:mt-6 first:[&_h1]:mt-0
  [&_h2]:text-white/80 [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mb-2 [&_h2]:mt-5
  [&_h3]:text-white/70 [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mb-2 [&_h3]:mt-4
  [&_p]:text-white/60 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm
  [&_ul]:text-white/60 [&_ul]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
  [&_ol]:text-white/60 [&_ol]:text-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
  [&_li]:leading-relaxed
  [&_strong]:text-white/80 [&_strong]:font-semibold
  [&_em]:text-white/60 [&_em]:italic
  [&_code]:text-primary/80 [&_code]:bg-primary/8 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
  [&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-white/8 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto
  [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-white/70
  [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-white/40 [&_blockquote]:italic [&_blockquote]:mb-3
  [&_hr]:border-white/10 [&_hr]:mb-4
  [&_a]:text-primary/75 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary`;

// ── Component ──────────────────────────────────────────────────────────────────

interface NotesViewProps {
  project: Project;
}

export function NotesView({ project }: NotesViewProps) {
  const { updateProject, isReadOnly } = useProjects();
  const notes = project.markdownNotes;

  // What's open in the editor
  const [activeNoteId, setActiveNoteId]   = useState<string | null>(notes[0]?.id ?? null);
  // Multi-selection set (for bulk ops)
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  // Anchor for Shift+click range selection
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  const [titleDraft, setTitleDraft]     = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [dirty, setDirty]               = useState(false);
  const [importing, setImporting]       = useState(false);
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const previewRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;
  const isMultiSelect = selectedIds.size > 0;

  // Sync drafts when active note changes
  useEffect(() => {
    if (activeNote) {
      setTitleDraft(activeNote.title);
      setContentDraft(activeNote.content);
      setDirty(false);
    }
  }, [activeNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncScroll = () => {
    if (!textareaRef.current || !previewRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
    const ratio = scrollTop / (scrollHeight - clientHeight || 1);
    const p = previewRef.current;
    p.scrollTop = ratio * (p.scrollHeight - p.clientHeight);
  };

  const save = useCallback(() => {
    if (!activeNote || !dirty) return;
    const updated: MarkdownNote = {
      ...activeNote,
      title:     titleDraft.trim() || "Untitled",
      content:   contentDraft,
      updatedAt: new Date().toISOString(),
    };
    updateProject(project.id, { markdownNotes: notes.map((n) => n.id === activeNote.id ? updated : n) });
    setDirty(false);
  }, [activeNote, dirty, titleDraft, contentDraft, notes, project.id, updateProject]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [dirty, save]);

  // ── Card click: plain / Cmd / Shift ──────────────────────────────────────────

  const handleCardClick = (note: MarkdownNote, e: React.MouseEvent) => {
    if (openMenuId === note.id) return; // click landed inside open export menu

    if (e.shiftKey && lastClickedId) {
      // Range select from lastClickedId to this note (inclusive), adds to set
      const fromIdx = notes.findIndex(n => n.id === lastClickedId);
      const toIdx   = notes.findIndex(n => n.id === note.id);
      const [lo, hi] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      const range = notes.slice(lo, hi + 1).map(n => n.id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        range.forEach(id => next.add(id));
        return next;
      });
      setLastClickedId(note.id);
    } else if (e.metaKey || e.ctrlKey) {
      // Cmd+click: toggle individual
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(note.id)) next.delete(note.id);
        else next.add(note.id);
        return next;
      });
      setLastClickedId(note.id);
      // Open note in editor on first Cmd+click
      if (selectedIds.size === 0) {
        if (dirty) save();
        setActiveNoteId(note.id);
      }
    } else {
      // Plain click: clear selection, open note
      setSelectedIds(new Set());
      setOpenMenuId(null);
      setLastClickedId(note.id);
      if (dirty) save();
      setActiveNoteId(note.id);
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const createNote = () => {
    const now  = new Date().toISOString();
    const note: MarkdownNote = { id: crypto.randomUUID(), title: "Untitled", content: "", createdAt: now, updatedAt: now };
    updateProject(project.id, { markdownNotes: [note, ...notes] });
    setActiveNoteId(note.id);
    setSelectedIds(new Set());
    setOpenMenuId(null);
  };

  const deleteNote = (id: string) => {
    const remaining = notes.filter(n => n.id !== id);
    updateProject(project.id, { markdownNotes: remaining });
    if (activeNoteId === id) setActiveNoteId(remaining[0]?.id ?? null);
    setOpenMenuId(null);
  };

  // ── Bulk ops ──────────────────────────────────────────────────────────────────

  const bulkDelete = () => {
    const remaining = notes.filter(n => !selectedIds.has(n.id));
    updateProject(project.id, { markdownNotes: remaining });
    if (activeNoteId && selectedIds.has(activeNoteId)) {
      setActiveNoteId(remaining[0]?.id ?? null);
    }
    setSelectedIds(new Set());
  };

  const bulkExport = () => {
    const toExport = notes.filter(n => selectedIds.has(n.id));
    // Combine all into one markdown file, separated by horizontal rules
    const combined = toExport
      .map(n => `# ${n.title || "Untitled"}\n\n${n.content}`)
      .join("\n\n---\n\n");
    downloadBlob(
      new Blob([combined], { type: "text/markdown" }),
      `notes-export-${Date.now()}.md`
    );
    setSelectedIds(new Set());
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Import ────────────────────────────────────────────────────────────────────

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImporting(true);
    const now = new Date().toISOString();
    const imported: MarkdownNote[] = await Promise.all(
      files.map(async (file) => ({
        id:        crypto.randomUUID(),
        title:     titleFromFilename(file.name),
        content:   await extractText(file),
        createdAt: now,
        updatedAt: now,
      }))
    );
    updateProject(project.id, { markdownNotes: [...imported, ...notes] });
    setActiveNoteId(imported[0].id);
    setImporting(false);
    e.target.value = "";
  };

  // ── Per-note export & share ───────────────────────────────────────────────────

  const exportNote = (note: MarkdownNote, format: "md" | "txt" | "pdf") => {
    const safeTitle = note.title || "Untitled";
    if (format === "md") {
      downloadBlob(new Blob([note.content], { type: "text/markdown" }), `${safeTitle}.md`);
    } else if (format === "txt") {
      downloadBlob(new Blob([toPlainText(note.content)], { type: "text/plain" }), `${safeTitle}.txt`);
    } else {
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(buildPrintHtml(safeTitle, note.content));
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
    setOpenMenuId(null);
  };

  const shareNote = async (note: MarkdownNote) => {
    const safeTitle = note.title || "Untitled";
    const file = new File([note.content], `${safeTitle}.md`, { type: "text/markdown" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: safeTitle });
      } else if (navigator.share) {
        await navigator.share({ title: safeTitle, text: note.content });
      } else {
        await navigator.clipboard.writeText(note.content);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("Share failed:", err);
    }
    setOpenMenuId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex overflow-hidden gap-4">

      {/* ── Left: sidebar ── */}
      <div className="w-[260px] shrink-0 flex flex-col gap-2 pt-px">

        {/* New / Import — hidden for guests */}
        {!isReadOnly && (
          <div className="flex gap-2">
            <button
              onClick={createNote}
              className="flex-1 h-11 px-4 text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 transition duration-200 ease-in-out"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex-1 h-11 px-4 text-sm font-semibold rounded-full bg-transparent text-white/40 border border-white/10 hover:text-primary/75 hover:border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 transition duration-200 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="h-3.5 w-3.5" />
              {importing ? "Importing…" : "Import"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.markdown,.text,.rtf,.html,.htm,.docx,.doc,.pages,.odt,.csv,.log,.yaml,.yml,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        )}

        {/* ── Bulk action strip (slides in when selection is active) ── */}
        <div className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isMultiSelect ? "max-h-14 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-primary/20 bg-primary/5">
            <span className="text-[11px] font-semibold text-primary/70 flex-1">
              {selectedIds.size} selected
            </span>
            <button
              onClick={bulkExport}
              className="h-7 px-2.5 text-[10px] font-semibold rounded-full border border-primary/30 text-primary/70 hover:bg-primary/15 hover:border-primary/50 flex items-center gap-1 transition duration-150"
            >
              <Download className="h-2.5 w-2.5" />
              Export
            </button>
            {!isReadOnly && (
              <button
                onClick={bulkDelete}
                className="h-7 px-2.5 text-[10px] font-semibold rounded-full border border-red-500/30 text-red-400/70 hover:bg-red-500/8 hover:border-red-500/50 flex items-center gap-1 transition duration-150"
              >
                <Trash2 className="h-2.5 w-2.5" />
                Delete
              </button>
            )}
            <button
              onClick={clearSelection}
              className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 flex items-center justify-center transition duration-150"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {notes.length === 0 ? (
            <p className="text-[11px] text-white/20 text-center py-8">No notes yet</p>
          ) : (
            notes.map((note) => {
              const isActive    = note.id === activeNoteId;
              const isSelected  = selectedIds.has(note.id);
              const isMenuOpen  = openMenuId === note.id;

              return (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleCardClick(note, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCardClick(note, e as unknown as React.MouseEvent);
                    }
                    if (e.key === "Escape") clearSelection();
                  }}
                  className={cn(
                    "w-full text-left px-3.5 pt-3 pb-2.5 rounded-2xl border transition duration-200 ease-in-out group cursor-pointer select-none outline-none",
                    isSelected
                      ? "border-primary/40 bg-primary/10"
                      : isActive
                        ? "border-primary/30 bg-primary/8"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                  )}
                >
                  {/* Title row */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Selection indicator vs file icon */}
                    {isMultiSelect ? (
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition duration-150",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-white/25 bg-transparent group-hover:border-white/40"
                      )}>
                        {isSelected && <Check className="h-2 w-2 text-black" strokeWidth={3.5} />}
                      </div>
                    ) : (
                      <FileText className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary/60" : "text-white/25")} />
                    )}
                    <span className={cn(
                      "text-xs font-semibold truncate",
                      isSelected ? "text-white/90" : isActive ? "text-white/90" : "text-white/55"
                    )}>
                      {note.title || "Untitled"}
                    </span>
                  </div>

                  {/* Preview */}
                  {note.content && (
                    <p className="mt-1 ml-[22px] text-[10px] text-white/25 leading-relaxed line-clamp-2">
                      {notePreview(note.content)}
                    </p>
                  )}

                  {/* Date */}
                  <p className="mt-1.5 ml-[22px] text-[10px] text-white/15">
                    {formatDate(note.updatedAt)}
                  </p>

                  {/* ── Per-card action row (hidden in multi-select mode) ── */}
                  {!isMultiSelect && (
                    <div className={cn(
                      "mt-2.5 pt-2 border-t border-white/[0.05] transition-opacity duration-200",
                      isActive || isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {isMenuOpen ? (
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: ".md",   fn: () => exportNote(note, "md"),  cls: "border-primary/30 text-primary/60 hover:border-primary/60 hover:text-primary/90 hover:bg-primary/8" },
                            { label: ".txt",  fn: () => exportNote(note, "txt"), cls: "border-white/15 text-white/40 hover:border-white/30 hover:text-white/70" },
                            { label: "PDF",   fn: () => exportNote(note, "pdf"), cls: "border-violet-400/30 text-violet-400/60 hover:border-violet-400/60 hover:text-violet-400/90 hover:bg-violet-400/5" },
                            { label: "Share", fn: () => shareNote(note),         cls: "border-blue-400/30 text-blue-400/60 hover:border-blue-400/60 hover:text-blue-400/90 hover:bg-blue-400/5", icon: <Share2 className="h-2.5 w-2.5" /> },
                          ].map(({ label, fn, cls, icon }) => (
                            <button
                              key={label}
                              onClick={(e) => { e.stopPropagation(); fn(); }}
                              className={cn("h-7 px-2.5 text-[10px] font-semibold rounded-full border flex items-center gap-1 transition duration-150", cls)}
                            >
                              {icon}
                              {label}
                            </button>
                          ))}
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                            className="h-7 w-7 rounded-full border border-white/10 text-white/25 hover:text-white/60 hover:border-white/20 flex items-center justify-center transition duration-150"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(note.id); }}
                            className="flex-1 h-8 text-[11px] font-semibold rounded-full border border-white/10 text-white/35 hover:border-white/25 hover:text-white/65 hover:bg-white/[0.04] flex items-center justify-center gap-1.5 transition duration-150"
                          >
                            <Download className="h-3 w-3" />
                            Export
                          </button>
                          {!isReadOnly && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                              className="flex-1 h-8 text-[11px] font-semibold rounded-full border border-red-500/20 text-red-400/50 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center gap-1.5 transition duration-150"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Escape hint when in multi-select */}
        {isMultiSelect && (
          <p className="text-[10px] text-white/15 text-center pb-1">
            Click to toggle · Esc to clear
          </p>
        )}
      </div>

      {/* ── Right: editor / preview ── */}
      <div className="flex-1 flex flex-col min-w-0 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
        {activeNote ? (
          <>
            <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-white/[0.06]">
              <input
                value={titleDraft}
                readOnly={isReadOnly}
                onChange={!isReadOnly ? (e) => { setTitleDraft(e.target.value); setDirty(true); } : undefined}
                className="flex-1 bg-transparent text-sm font-semibold text-white/80 placeholder:text-white/20 focus:outline-none focus:text-white"
                placeholder="Note title"
              />
              {dirty && <span className="text-[10px] text-white/25 shrink-0">Saving…</span>}
            </div>
            <div className="flex-1 flex overflow-hidden">
              <textarea
                ref={textareaRef}
                value={contentDraft}
                readOnly={isReadOnly}
                onChange={!isReadOnly ? (e) => { setContentDraft(e.target.value); setDirty(true); } : undefined}
                onScroll={syncScroll}
                placeholder={"Start writing…\n\n# Heading\n**bold**  *italic*  `code`"}
                className="w-1/2 resize-none bg-transparent px-6 py-5 text-sm text-white/60 leading-relaxed placeholder:text-white/15 focus:outline-none font-mono border-r border-white/[0.06]"
              />
              <div ref={previewRef} className={PROSE}>
                <ReactMarkdown>{contentDraft || ""}</ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-white/10" />
            <p className="text-sm text-white/25">
              {isReadOnly ? "No note selected" : "Select a note or create a new one"}
            </p>
            {!isReadOnly && (
              <button
                onClick={createNote}
                className="mt-1 h-9 px-4 text-xs font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 transition duration-200 ease-in-out flex items-center gap-1.5"
              >
                <Plus className="h-3 w-3" />
                New note
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
