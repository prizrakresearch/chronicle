"use client";

import { useState, useEffect } from "react";
import { GitBranch, User, Calendar, HardDrive, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectFile, ProjectLink } from "@/types";
import { getRepoBranches, getRepoContributions, type RepoBranch } from "@/lib/db/github";

// ── Seeded random (fallback when no GitHub repo connected) ────────────────────

function mkRand(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 17), 0x45d9f3b) | 1;
    s = Math.imul(s ^ (s >>> 11), 0x165667b1) | 1;
    return (s >>> 0) / 0xffffffff;
  };
}
function seedNum(id: string) {
  return id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Mock generators (used when no real GitHub repo is linked) ─────────────────

export function genBranches(project: Project): RepoBranch[] {
  const def  = project.githubRepo?.defaultBranch ?? "main";
  const pool = ["develop", "feature/auth", "feature/dashboard", "fix/header", "fix/mobile", "release/v1.0", "chore/deps"];
  const rand = mkRand(seedNum(project.id) + 2);
  const extra = pool.filter(() => rand() > 0.55).slice(0, 4);
  return [def, ...extra].map((name, i) => ({ name, isDefault: i === 0 }));
}

export function genContribs(project: Project): { date: string; count: number }[] {
  const rand  = mkRand(seedNum(project.id));
  const today = new Date();
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (59 - i));
    const r = rand();
    const count = r < 0.55 ? 0 : r < 0.72 ? 1 : r < 0.84 ? 2 : r < 0.93 ? 3 : 4;
    return { date: d.toISOString().slice(0, 10), count };
  });
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-3 w-3 text-white/20 shrink-0" />
      <span className="text-[11px] text-white/30 shrink-0">{label}</span>
      <span className="text-[11px] text-white/60 ml-auto truncate text-right">{value}</span>
    </div>
  );
}

const INTENSITY = [
  "bg-white/[0.07]",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/65",
  "bg-primary/85",
] as const;

function ContribGraph({ contribs, loading }: {
  contribs: { date: string; count: number }[];
  loading?: boolean;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startDate = new Date(today); startDate.setDate(today.getDate() - 59);
  const padDays = (startDate.getDay() + 6) % 7;
  const gridStart = new Date(startDate); gridStart.setDate(startDate.getDate() - padDays);

  const cMap = Object.fromEntries(contribs.map(c => [c.date, c.count]));
  const cells: { iso: string; count: number; real: boolean }[] = [];
  const cur = new Date(gridStart);
  while (cur <= today) {
    const iso = cur.toISOString().slice(0, 10);
    cells.push({ iso, count: cMap[iso] ?? 0, real: cur >= startDate });
    cur.setDate(cur.getDate() + 1);
  }
  const numWeeks = Math.ceil(cells.length / 7);

  return (
    <div>
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5">
        Git activity · 60 days
      </p>
      <div
        className={cn("w-full grid gap-[3px] transition-opacity duration-300", loading && "opacity-40")}
        style={{
          gridTemplateColumns: `repeat(${numWeeks}, 1fr)`,
          gridTemplateRows: "repeat(7, auto)",
          gridAutoFlow: "column",
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell.real ? `${cell.count} commit${cell.count !== 1 ? "s" : ""} · ${cell.iso}` : ""}
            className={cn(
              "aspect-square rounded-[2px] transition-colors duration-150",
              !cell.real ? "bg-transparent" : INTENSITY[Math.min(cell.count, 4)]
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-[3px] mt-2">
        <span className="text-[9px] text-white/20 mr-1">Less</span>
        {INTENSITY.map((cls, i) => <div key={i} className={cn("w-[8px] h-[8px] rounded-[2px]", cls)} />)}
        <span className="text-[9px] text-white/20 ml-1">More</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface GitSidebarProps {
  project:        Project;
  files:          ProjectFile[];
  links:          ProjectLink[];
  selectedBranch: string;
  onBranchChange: (b: string) => void;
  /** Pre-fetched branches — skips the in-component fetch if provided. */
  initialBranches?: RepoBranch[];
  /** Pre-fetched contribution data — skips the in-component fetch if provided. */
  initialContribs?: { date: string; count: number }[];
}

export function GitSidebar({ project, files, links, selectedBranch, onBranchChange, initialBranches, initialContribs }: GitSidebarProps) {
  const hasRepo = !!project.githubRepo;

  // Real data state (only populated when repo is connected)
  const [realBranches, setRealBranches] = useState<RepoBranch[] | null>(initialBranches ?? null);
  const [realContribs, setRealContribs] = useState<{ date: string; count: number }[] | null>(initialContribs ?? null);
  const [loadingData,  setLoadingData]  = useState(false);

  // Fetch real data when a repo is linked (skip if pre-loaded)
  useEffect(() => {
    if (!project.githubRepo) {
      setRealBranches(null);
      setRealContribs(null);
      return;
    }
    // If we already have pre-fetched data, use it and skip the network call
    if (initialBranches && initialContribs) {
      setRealBranches(initialBranches);
      setRealContribs(initialContribs);
      return;
    }
    const { fullName, defaultBranch } = project.githubRepo;
    setLoadingData(true);

    Promise.all([
      getRepoBranches(fullName, defaultBranch),
      getRepoContributions(fullName),
    ])
      .then(([branches, contribs]) => {
        setRealBranches(branches);
        setRealContribs(contribs);
        // If the currently selected branch doesn't exist in real branches, switch to default
        const names = new Set(branches.map(b => b.name));
        if (!names.has(selectedBranch)) {
          const def = branches.find(b => b.isDefault);
          if (def) onBranchChange(def.name);
        }
      })
      .catch(err => {
        console.warn("[GitSidebar] failed to fetch GitHub data:", err);
        // Fall through to mock data silently
      })
      .finally(() => setLoadingData(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.githubRepo?.fullName]);

  const branches  = realBranches ?? genBranches(project);
  const contribs  = realContribs ?? genContribs(project);
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const author    = project.githubRepo?.fullName.split("/")[0] ?? "you";

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto">

      {/* Project metadata */}
      <div>
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">Project</p>
        <div className="space-y-2.5">
          <MetaRow icon={Calendar}  label="Started"  value={fmtDate(project.createdAt)} />
          <MetaRow icon={User}      label="Author"   value={author} />
          <MetaRow icon={GitBranch} label="Version"  value="v0.1.0" />
          <MetaRow icon={HardDrive} label="Size"     value={fmtSize(totalSize)} />
          <MetaRow icon={FileText}  label="Files"    value={String(files.length)} />
          <MetaRow icon={Link2}     label="Links"    value={String(links.length)} />
        </div>
      </div>

      {/* GitHub repo link (if connected) */}
      {project.githubRepo && (
        <div>
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2">Repo</p>
          <a
            href={`https://github.com/${project.githubRepo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition duration-150 group"
          >
            <GitBranch className="h-3 w-3 text-white/25 shrink-0 group-hover:text-white/50" />
            <span className="text-[11px] text-white/45 truncate group-hover:text-white/70">
              {project.githubRepo.fullName}
            </span>
          </a>
        </div>
      )}

      {/* Branches */}
      <div>
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2">Branches</p>
        <div className="space-y-0.5">
          {branches.map(b => (
            <button
              key={b.name}
              onClick={() => onBranchChange(b.name)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition duration-150",
                selectedBranch === b.name
                  ? "bg-primary/10 text-primary/80"
                  : "text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
              )}
            >
              <GitBranch className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1 text-left">{b.name}</span>
              {b.isDefault && (
                <span className="text-[9px] text-white/20 bg-white/[0.06] rounded px-1.5 py-0.5 shrink-0">default</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contribution graph */}
      <ContribGraph contribs={contribs} loading={loadingData} />

      {/* Bottom spacer — prevents content from hiding behind the fixed bottom blur */}
      <div className="shrink-0 h-16" />
    </div>
  );
}
