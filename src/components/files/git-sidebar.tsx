"use client";

import { useState, useMemo } from "react";
import { GitBranch, User, Calendar, HardDrive, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectFile, ProjectLink } from "@/types";

// ── Seeded random ─────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Branch generator ──────────────────────────────────────────────────────────

export function genBranches(project: Project): { name: string; isDefault: boolean }[] {
  const def  = project.githubRepo?.defaultBranch ?? "main";
  const pool = ["develop", "feature/auth", "feature/dashboard", "fix/header", "fix/mobile", "release/v1.0", "chore/deps"];
  const rand = mkRand(seed(project.id) + 2);
  const extra = pool.filter(() => rand() > 0.55).slice(0, 4);
  return [def, ...extra].map((name, i) => ({ name, isDefault: i === 0 }));
}

// ── Contribution graph generator ──────────────────────────────────────────────

export function genContribs(project: Project): { date: string; count: number }[] {
  const rand  = mkRand(seed(project.id));
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

function ContribGraph({ project }: { project: Project }) {
  const contribs = useMemo(() => genContribs(project), [project.id]);

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
      {/* Flat CSS grid: columns = weeks (1fr each), rows = days of week (7).
          gridAutoFlow column fills week-by-week. aspect-square keeps cells square. */}
      <div
        className="w-full grid gap-[3px]"
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
}

export function GitSidebar({ project, files, links, selectedBranch, onBranchChange }: GitSidebarProps) {
  const branches  = useMemo(() => genBranches(project), [project.id]);
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
      <ContribGraph project={project} />

      {/* Bottom spacer — prevents content from hiding behind the fixed bottom blur */}
      <div className="shrink-0 h-16" />
    </div>
  );
}
