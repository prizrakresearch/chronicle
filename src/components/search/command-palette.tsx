"use client";

import {
  useEffect, useState, useTransition, useMemo,
  useRef, useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Clock, Map as MapIcon, Search } from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { cn } from "@/lib/utils";

// ── types ─────────────────────────────────────────────────────────────────────

interface Result {
  id:       string;
  label:    string;
  sub?:     string;
  href:     string;
  type:     "project" | "timeline" | "roadmap";
}

// ── helpers ───────────────────────────────────────────────────────────────────

function matches(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

// ── main component ────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open,        setOpen]       = useState(false);
  const [filterQuery, setFilterQuery] = useState("");   // drives results only
  const [sel,         setSel]         = useState(0);
  const [,            startTransition] = useTransition();

  // The input is UNCONTROLLED — the browser owns the displayed text so every
  // keystroke renders instantly. We only push into React state (low-priority)
  // for filtering, which can lag behind without affecting what you see.

  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { projects, timelineEvents, roadmapItems } = useProjects();

  // Pre-build a project lookup map so timeline/roadmap items don't call
  // .find() on every render.
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  // Compute filtered results only when filterQuery changes (low-priority).
  const results = useMemo<Result[]>(() => {
    const q = filterQuery.trim();

    const proj: Result[] = projects
      .filter((p) => !q || matches(p.name, q) || matches(p.description ?? "", q))
      .slice(0, 6)
      .map((p) => ({ id: p.id, label: p.name, href: `/projects/${p.id}`, type: "project" }));

    if (!q) return proj; // show only projects when idle

    const tl: Result[] = timelineEvents
      .filter((e) => matches(e.title, q))
      .slice(0, 4)
      .map((e) => ({
        id:    e.id,
        label: e.title,
        sub:   projectMap.get(e.projectId)?.name,
        href:  `/projects/${e.projectId}?tab=timeline`,
        type:  "timeline",
      }));

    const rm: Result[] = roadmapItems
      .filter((r) => matches(r.title, q))
      .slice(0, 4)
      .map((r) => ({
        id:    r.id,
        label: r.title,
        sub:   projectMap.get(r.projectId)?.name,
        href:  `/projects/${r.projectId}?tab=roadmap`,
        type:  "roadmap",
      }));

    return [...proj, ...tl, ...rm];
  }, [filterQuery, projects, timelineEvents, roadmapItems, projectMap]);

  // Keep selection in bounds whenever results change.
  useEffect(() => { setSel(0); }, [results]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // Low-priority: update filter state without blocking the input's own render
    startTransition(() => setFilterQuery(val));
  }

  // Open / close.
  const openPalette = useCallback(() => {
    setOpen(true);
    setFilterQuery("");
    setSel(0);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.value = "";
    }, 0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  // Cmd+K / Ctrl+K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            setFilterQuery("");
            setSel(0);
            setTimeout(() => { if (inputRef.current) inputRef.current.value = ""; }, 0);
          }
          return !v;
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Keyboard navigation inside palette.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape")     { closePalette(); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp")    { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); return; }
    if (e.key === "Enter" && results[sel]) {
      router.push(results[sel].href);
      closePalette();
    }
  }

  if (!open) return null;

  return (
    /* Overlay — plain semi-transparent black, no blur */
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closePalette(); }}
    >
      {/* Palette box */}
      <div
        className="w-full max-w-xl mx-4 rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden"
        onKeyDown={onKeyDown}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 border-b border-white/[0.07]">
          <Search className="h-4 w-4 text-white/25 shrink-0" />
          <input
            ref={inputRef}
            defaultValue=""
            onChange={handleInput}
            placeholder="Search projects, timeline, roadmap…"
            className="flex-1 py-4 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
          />
          {filterQuery && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                if (inputRef.current) inputRef.current.value = "";
                startTransition(() => setFilterQuery(""));
                inputRef.current?.focus();
              }}
              className="text-[10px] text-white/25 hover:text-white/50 transition"
            >
              clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="py-1.5 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-white/25">No results</p>
          ) : (
            results.map((r, i) => (
              <ResultRow
                key={r.id}
                result={r}
                selected={i === sel}
                project={r.type === "project" ? projects.find((p) => p.id === r.id) : undefined}
                onHover={() => setSel(i)}
                onClick={() => { router.push(r.href); closePalette(); }}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-white/[0.07]">
          <span className="text-[10px] text-white/20">↑↓ navigate</span>
          <span className="text-[10px] text-white/20">↵ open</span>
          <span className="text-[10px] text-white/20">esc close</span>
        </div>
      </div>
    </div>
  );
}

// ── Result row ────────────────────────────────────────────────────────────────

const TYPE_ICON = {
  project:  FolderOpen,
  timeline: Clock,
  roadmap:  MapIcon,
} as const;

const TYPE_COLOR = {
  project:  "text-white/30",
  timeline: "text-blue-400/50",
  roadmap:  "text-lime-400/50",
} as const;

function ResultRow({
  result, selected, project, onHover, onClick,
}: {
  result:   Result;
  selected: boolean;
  project?: { status: string } | undefined;
  onHover:  () => void;
  onClick:  () => void;
}) {
  const Icon = TYPE_ICON[result.type];

  return (
    <button
      onMouseEnter={onHover}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75",
        selected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", TYPE_COLOR[result.type])} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-white/75 truncate">{result.label}</span>
        {result.sub && (
          <span className="block text-xs text-white/30 truncate mt-0.5">{result.sub}</span>
        )}
      </span>
      {result.type === "project" && project && (
        <ProjectStatusBadge status={project.status as never} size="sm" />
      )}
    </button>
  );
}
