"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, FileText, Link2, GitBranch, File,
  LayoutDashboard, CheckSquare, X,
} from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";

// ── Result type ───────────────────────────────────────────────────────────────

interface SearchResult {
  id:          string;
  type:        "project" | "roadmap" | "file" | "link" | "event";
  title:       string;
  subtitle:    string;
  projectId:   string;
  projectName: string;
  href?:       string;   // for links that open externally
  tab?:        string;   // ?tab= param for navigation
}

const TYPE_ICON = {
  project:  LayoutDashboard,
  roadmap:  CheckSquare,
  file:     File,
  link:     Link2,
  event:    FileText,
};

const TYPE_COLOR = {
  project:  "text-primary/70",
  roadmap:  "text-sky-400/70",
  file:     "text-violet-400/70",
  link:     "text-emerald-400/70",
  event:    "text-orange-400/70",
};

const TYPE_LABEL = {
  project:  "Project",
  roadmap:  "Roadmap",
  file:     "File",
  link:     "Link",
  event:    "Event",
};

function match(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some(f => f?.toLowerCase().includes(q));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlobalSearch() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const { projects, roadmapItems, projectFiles, links } = useProjects();

  const [open,     setOpen]     = useState(false);
  const [query,    setQuery]    = useState("");
  const [selected, setSelected] = useState(0);

  // ── Open/close ──────────────────────────────────────────────────────────────

  const close = useCallback(() => { setOpen(false); setQuery(""); setSelected(0); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(v => !v); }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  // ── Search results ──────────────────────────────────────────────────────────

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.trim();

    const out: SearchResult[] = [];

    // Projects
    projects.forEach(p => {
      if (match(q, p.name, p.brief, p.description)) {
        out.push({ id: p.id, type: "project", title: p.name, subtitle: p.brief ?? p.status, projectId: p.id, projectName: p.name, tab: "overview" });
      }
    });

    // Roadmap items
    roadmapItems.forEach(item => {
      if (match(q, item.title, item.description)) {
        const proj = projects.find(p => p.id === item.projectId);
        out.push({ id: item.id, type: "roadmap", title: item.title, subtitle: proj?.name ?? "", projectId: item.projectId, projectName: proj?.name ?? "", tab: "roadmap" });
      }
    });

    // Files
    projectFiles.forEach(f => {
      if (match(q, f.name)) {
        const proj = projects.find(p => p.id === f.projectId);
        out.push({ id: f.id, type: "file", title: f.name, subtitle: proj?.name ?? "", projectId: f.projectId, projectName: proj?.name ?? "", tab: "files" });
      }
    });

    // Links
    links.forEach(l => {
      if (match(q, l.title, l.url)) {
        const proj = projects.find(p => p.id === l.projectId);
        out.push({ id: l.id, type: "link", title: l.title, subtitle: l.url, projectId: l.projectId, projectName: proj?.name ?? "", href: l.url });
      }
    });

    return out.slice(0, 12);
  }, [query, projects, roadmapItems, projectFiles, links]);

  // ── Keyboard nav inside results ─────────────────────────────────────────────

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); navigate(results[selected]); }
  }

  // Keep selected result scrolled into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Reset selection when results change
  useEffect(() => { setSelected(0); }, [results]);

  function navigate(result: SearchResult | undefined) {
    if (!result) return;
    if (result.href) { window.open(result.href, "_blank"); }
    else { router.push(`/projects/${result.projectId}${result.tab ? `?tab=${result.tab}` : ""}`); }
    close();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/[0.1] bg-[#0d0d0d] shadow-2xl overflow-hidden">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
          <Search className="h-4 w-4 text-white/30 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, files, roadmap…"
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-white/25 hover:text-white/60 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="text-[10px] text-white/20 border border-white/10 rounded px-1.5 py-0.5 font-mono">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1.5">
          {!query.trim() && (
            <p className="text-xs text-white/20 text-center py-8">Start typing to search…</p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="text-xs text-white/20 text-center py-8">No results for "{query}"</p>
          )}
          {results.map((r, i) => {
            const Icon = TYPE_ICON[r.type];
            return (
              <button
                key={r.id}
                onClick={() => navigate(r)}
                onMouseEnter={() => setSelected(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition duration-100",
                  selected === i ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                )}
              >
                <div className={cn("w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0", TYPE_COLOR[r.type])}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/75 font-medium truncate">{r.title}</p>
                  <p className="text-[11px] text-white/30 truncate">{r.subtitle}</p>
                </div>
                <span className={cn("text-[10px] font-medium shrink-0", TYPE_COLOR[r.type])}>
                  {TYPE_LABEL[r.type]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="border-t border-white/[0.06] px-4 py-2 flex items-center gap-4 text-[10px] text-white/20">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
