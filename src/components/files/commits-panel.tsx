"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, ArrowLeft, Maximize2, Minimize2, X, GitCommitHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

// ── Seeded random (same pattern as git-sidebar) ───────────────────────────────

function mkRand(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 17), 0x45d9f3b) | 1;
    s = Math.imul(s ^ (s >>> 11), 0x165667b1) | 1;
    return (s >>> 0) / 0xffffffff;
  };
}
function seed(id: string) {
  return id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CommitType = "feat" | "fix" | "chore" | "docs" | "refactor" | "test";

interface Commit {
  sha:     string;
  type:    CommitType;
  scope:   string | null;
  msg:     string;
  body:    string | null;
  author:  string;
  date:    string;
  branch:  string;
  files:   { path: string; additions: number; deletions: number; status: "M" | "A" | "D" }[];
}

// ── Mock generator ────────────────────────────────────────────────────────────

const MSGS: Record<CommitType, string[]> = {
  feat:     ["add dashboard overview panel", "implement drag-and-drop roadmap", "add note export to PDF", "GitHub contribution graph", "pin and hide projects", "add file upload support", "multi-select notes", "project icon picker"],
  fix:      ["resolve null pointer in auth flow", "correct date formatting", "splash screen z-index", "mobile layout overflow", "fix button hover state", "correct API response parsing"],
  chore:    ["update dependencies", "bump Next.js to latest", "clean up unused imports", "update TypeScript config"],
  docs:     ["update README", "add JSDoc to utilities", "document context API"],
  refactor: ["extract shared utilities", "simplify context API", "consolidate type definitions", "split large components"],
  test:     ["add unit tests for utils", "snapshot tests for components"],
};
const SCOPES = ["auth", "dashboard", "roadmap", "notes", "files", "ui", "layout", null];
const AUTHORS = ["adyothuria", "johndoe", "jane-dev"];
const FILE_POOL = [
  "src/app/layout.tsx", "src/components/ui/button.tsx",
  "src/lib/store/projects-context.tsx", "src/types/index.ts",
  "src/components/notes/notes-view.tsx", "src/components/roadmap/roadmap-board.tsx",
  "src/components/files/files-view.tsx", "src/app/projects/[id]/page.tsx",
  "src/components/layout/dither-background.tsx", "src/lib/utils.ts",
];

function genCommits(project: Project, branch: string): Commit[] {
  const rand   = mkRand(seed(project.id) + branch.length * 7);
  const types  = Object.keys(MSGS) as CommitType[];
  const today  = new Date();

  return Array.from({ length: 18 }, (_, i): Commit => {
    const type   = types[Math.floor(rand() * types.length)];
    const msgs   = MSGS[type];
    const msg    = msgs[Math.floor(rand() * msgs.length)];
    const scope  = SCOPES[Math.floor(rand() * SCOPES.length)];
    const author = AUTHORS[Math.floor(rand() * AUTHORS.length)];
    const daysAgo = Math.floor(rand() * 50);
    const d = new Date(today); d.setDate(d.getDate() - daysAgo);
    const sha = Array.from({ length: 7 }, () => "0123456789abcdef"[Math.floor(rand() * 16)]).join("");
    const fileCount = Math.floor(rand() * 4) + 1;
    const files = Array.from({ length: fileCount }, () => {
      const path = FILE_POOL[Math.floor(rand() * FILE_POOL.length)];
      const additions = Math.floor(rand() * 60);
      const deletions = Math.floor(rand() * 30);
      const statusRoll = rand();
      const status: "M" | "A" | "D" = statusRoll < 0.65 ? "M" : statusRoll < 0.88 ? "A" : "D";
      return { path, additions, deletions, status };
    });
    return {
      sha, type, scope, msg,
      body: rand() > 0.65 ? `${scope ? `[${scope}] ` : ""}Reviewed and tested on dev. No breaking changes.` : null,
      author, date: d.toISOString().slice(0, 10),
      branch, files,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Filter pill colours ───────────────────────────────────────────────────────

const TYPE_STYLE: Record<CommitType, string> = {
  feat:     "border-primary/60 text-primary/80 bg-primary/10",
  fix:      "border-red-400/60 text-red-400/80 bg-red-400/10",
  chore:    "border-white/20 text-white/50 bg-white/5",
  docs:     "border-blue-400/60 text-blue-400/80 bg-blue-400/10",
  refactor: "border-violet-400/60 text-violet-400/80 bg-violet-400/10",
  test:     "border-orange-400/60 text-orange-400/80 bg-orange-400/10",
};
const TYPE_DOT: Record<CommitType, string> = {
  feat:     "bg-primary/80",
  fix:      "bg-red-400/80",
  chore:    "bg-white/40",
  docs:     "bg-blue-400/80",
  refactor: "bg-violet-400/80",
  test:     "bg-orange-400/80",
};

// ── Commit detail ─────────────────────────────────────────────────────────────

function CommitDetail({
  commit, isFullscreen, onFullscreen, onBack,
}: {
  commit: Commit;
  isFullscreen: boolean;
  onFullscreen: () => void;
  onBack: () => void;
}) {
  const totalAdd = commit.files.reduce((a, f) => a + f.additions, 0);
  const totalDel = commit.files.reduce((a, f) => a + f.deletions, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <button
          onClick={onBack}
          className="h-8 px-3 rounded-full border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 flex items-center gap-1.5 text-xs transition duration-150"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
        <div className="flex-1" />
        <button
          onClick={onFullscreen}
          className="h-7 w-7 rounded-full border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 flex items-center justify-center transition duration-150"
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pb-16">
        {/* Commit header */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <div className="flex items-start gap-3 mb-3">
            <span className={cn("shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border", TYPE_STYLE[commit.type])}>
              {commit.type}
            </span>
            <p className="text-sm font-medium text-white/85 leading-snug">
              {commit.scope ? <span className="text-white/40">({commit.scope}): </span> : null}
              {commit.msg}
            </p>
          </div>
          {commit.body && (
            <p className="text-xs text-white/35 leading-relaxed mb-3 pl-0 border-t border-white/[0.06] pt-3">{commit.body}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30">
            <span className="font-mono text-white/40">{commit.sha}</span>
            <span>{commit.author}</span>
            <span>{commit.date}</span>
            <span className="font-mono">
              <span className="text-emerald-400/70">+{totalAdd}</span>
              {" / "}
              <span className="text-red-400/60">-{totalDel}</span>
            </span>
          </div>
        </div>

        {/* Files changed */}
        <div>
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2">
            Files changed · {commit.files.length}
          </p>
          <div className="space-y-1.5">
            {commit.files.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <span className={cn(
                  "text-[10px] font-bold w-4 text-center shrink-0",
                  f.status === "A" ? "text-emerald-400" : f.status === "D" ? "text-red-400" : "text-blue-400"
                )}>
                  {f.status}
                </span>
                <span className="flex-1 text-xs text-white/60 font-mono truncate">{f.path}</span>
                <span className="text-[10px] font-mono text-emerald-400/60 shrink-0">+{f.additions}</span>
                <span className="text-[10px] font-mono text-red-400/50 shrink-0">-{f.deletions}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter popover ────────────────────────────────────────────────────────────

const ALL_TYPES: CommitType[] = ["feat", "fix", "chore", "docs", "refactor", "test"];

function FilterPopover({
  activeTypes, onToggle, onClear, onClose,
}: {
  activeTypes: Set<CommitType>;
  onToggle: (t: CommitType) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-full right-0 mt-1 z-50 w-64 rounded-[20px] border border-white/10 bg-black/95 backdrop-blur-sm p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-white/60">Filter by type</p>
        <div className="flex items-center gap-2">
          {activeTypes.size > 0 && (
            <button onClick={onClear} className="text-[10px] text-white/30 hover:text-white/60 transition">Clear</button>
          )}
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map(t => (
          <button
            key={t}
            onClick={() => onToggle(t)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold border transition duration-150",
              activeTypes.has(t)
                ? TYPE_STYLE[t]
                : "border-white/10 text-white/35 hover:text-white/60 hover:border-white/20"
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface CommitsPanelProps {
  project:        Project;
  selectedBranch: string;
  isFullscreen:   boolean;
  onFullscreen:   () => void;
}

export function CommitsPanel({ project, selectedBranch, isFullscreen, onFullscreen }: CommitsPanelProps) {
  const [search,       setSearch]       = useState("");
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [activeTypes,  setActiveTypes]  = useState<Set<CommitType>>(new Set());
  const [selectedCommit, setSelected]   = useState<Commit | null>(null);

  const allCommits = useMemo(() => genCommits(project, selectedBranch), [project.id, selectedBranch]);

  const commits = useMemo(() => {
    let list = allCommits;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.msg.toLowerCase().includes(q) || c.sha.includes(q) || c.author.toLowerCase().includes(q));
    }
    if (activeTypes.size > 0) {
      list = list.filter(c => activeTypes.has(c.type));
    }
    return list;
  }, [allCommits, search, activeTypes]);

  function toggleType(t: CommitType) {
    setActiveTypes(prev => {
      const s = new Set(prev);
      s.has(t) ? s.delete(t) : s.add(t);
      return s;
    });
  }

  // ── Commit detail view ───────────────────────────────────────────────────────
  if (selectedCommit) {
    return (
      <CommitDetail
        commit={selectedCommit}
        isFullscreen={isFullscreen}
        onFullscreen={onFullscreen}
        onBack={() => setSelected(null)}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/25 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commits…"
            className="w-full pl-8 pr-3 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition"
          />
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={cn(
              "h-9 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition duration-150",
              activeTypes.size > 0
                ? "border-primary/40 text-primary/70 bg-primary/8"
                : "border-white/10 text-white/40 hover:text-white/65 hover:border-white/20"
            )}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filters
            {activeTypes.size > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary/70 text-black text-[10px] flex items-center justify-center font-bold">
                {activeTypes.size}
              </span>
            )}
          </button>
          {filterOpen && (
            <FilterPopover
              activeTypes={activeTypes}
              onToggle={toggleType}
              onClear={() => setActiveTypes(new Set())}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>
        <button
          onClick={onFullscreen}
          className="h-9 w-9 rounded-full border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 flex items-center justify-center transition duration-150 shrink-0"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Active type chips */}
      {activeTypes.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
          {[...activeTypes].map(t => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn("h-6 px-2.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition", TYPE_STYLE[t])}
            >
              {t}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}

      {/* Commit list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pb-16">
        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-white/30">No commits found</p>
          </div>
        ) : (
          commits.map(c => (
            <button
              key={c.sha}
              onClick={() => setSelected(c)}
              className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-2xl border border-white/[0.05] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.04] transition duration-150 group"
            >
              <div className="flex items-center justify-center mt-0.5 shrink-0">
                <div className={cn("w-2 h-2 rounded-full mt-1", TYPE_DOT[c.type])} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className={cn("text-[10px] font-bold shrink-0", TYPE_STYLE[c.type].split(" ").find(s => s.startsWith("text-")))}>
                    {c.type}
                  </span>
                  <p className="text-xs text-white/70 truncate leading-snug">
                    {c.scope ? <span className="text-white/35">({c.scope}) </span> : null}{c.msg}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/25">
                  <span className="font-mono">{c.sha}</span>
                  <span>{c.author}</span>
                  <span className="ml-auto">{c.date}</span>
                </div>
              </div>
              <GitCommitHorizontal className="h-3.5 w-3.5 text-white/15 group-hover:text-white/30 transition shrink-0 mt-0.5" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
