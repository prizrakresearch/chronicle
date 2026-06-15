"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Link } from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

const PRESET_LABELS = ["frontend", "backend", "mobile", "desktop", "api", "shared", "docs"];

// ── Initials avatar ───────────────────────────────────────────────────────────

function ProjectAvatar({ project }: { project: Project }) {
  if (project.logoUrl) {
    return (
      <img
        src={project.logoUrl}
        alt=""
        className="w-5 h-5 rounded-full object-cover shrink-0"
      />
    );
  }
  const initials = project.name.slice(0, 2).toUpperCase();
  const hue = [...project.id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
      style={{ background: `hsl(${hue} 50% 25%)`, color: `hsl(${hue} 60% 70%)` }}
    >
      {initials}
    </span>
  );
}

// ── Single chip ───────────────────────────────────────────────────────────────

function RelatedChip({
  related,
  onNavigate,
  onUnlink,
  isReadOnly,
}: {
  related: Project;
  onNavigate: () => void;
  onUnlink: () => void;
  isReadOnly: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05] transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ProjectAvatar project={related} />

      <button
        onClick={onNavigate}
        className="text-[12px] text-white/60 hover:text-white/90 transition-colors leading-none"
      >
        {related.name}
      </button>

      {!isReadOnly && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnlink(); }}
          className="ml-0.5 text-white/25 hover:text-red-400/70 transition-colors"
          title="Unlink"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Link dialog ───────────────────────────────────────────────────────────────

function LinkDialog({
  currentProject,
  available,
  onLink,
  onClose,
}: {
  currentProject: Project;
  available: Project[];
  onLink: (relatedId: string, label: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<string | null>(null);
  const [label, setLabel]         = useState("");
  const [customLabel, setCustom]  = useState("");

  const filtered = available.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const effectiveLabel = label === "__custom__" ? customLabel.trim() : label;

  function handleConfirm() {
    if (!selected) return;
    onLink(selected, effectiveLabel || null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[400px] bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Link className="h-4 w-4 text-white/30" />
            Link a related project
          </h3>
          <p className="text-xs text-white/30 mt-1">
            Linking to <span className="text-white/50">{currentProject.name}</span>
          </p>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-white/20"
          />
        </div>

        {/* Project list */}
        <div className="px-4 pt-3 pb-2 max-h-48 overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-white/25 text-center py-4">No projects available</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id === selected ? null : p.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors",
                selected === p.id
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-white/[0.04] border border-transparent"
              )}
            >
              <ProjectAvatar project={p} />
              <span className="text-sm text-white/70">{p.name}</span>
              <span className={cn(
                "ml-auto text-[10px] px-1.5 py-0.5 rounded",
                p.status === "active"   ? "bg-green-500/10 text-green-400/70"  :
                p.status === "paused"   ? "bg-yellow-500/10 text-yellow-400/70" :
                "bg-white/[0.05] text-white/30"
              )}>
                {p.status}
              </span>
            </button>
          ))}
        </div>

        {/* Label picker */}
        {selected && (
          <div className="px-4 pt-2 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">
              Label (optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setLabel("")}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  label === "" ? "border-primary/40 bg-primary/10 text-primary/80" : "border-white/[0.08] text-white/35 hover:border-white/20"
                )}
              >
                none
              </button>
              {PRESET_LABELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLabel(l)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                    label === l ? "border-primary/40 bg-primary/10 text-primary/80" : "border-white/[0.08] text-white/35 hover:border-white/20"
                  )}
                >
                  {l}
                </button>
              ))}
              <button
                onClick={() => setLabel("__custom__")}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  label === "__custom__" ? "border-primary/40 bg-primary/10 text-primary/80" : "border-white/[0.08] text-white/35 hover:border-white/20"
                )}
              >
                custom…
              </button>
            </div>
            {label === "__custom__" && (
              <input
                autoFocus
                type="text"
                value={customLabel}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="e.g. design, infra, docs…"
                className="mt-2 w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-white/20"
                maxLength={32}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="px-4 py-1.5 rounded-full text-xs font-medium bg-white/90 text-zinc-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Link project
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function LinkedProjectsSection({ project }: { project: Project }) {
  const { projects, linkProjects, unlinkProjects, isReadOnly } = useProjects();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const linkedIds = new Set(project.linkedProjects.map((r) => r.relatedId));

  const linkedList = project.linkedProjects
    .map((r) => {
      const p = projects.find((x) => x.id === r.relatedId);
      return p ? { project: p, label: r.label } : null;
    })
    .filter((x): x is { project: Project; label: string | null } => x !== null);

  const available = projects.filter((p) => p.id !== project.id && !linkedIds.has(p.id));

  if (isReadOnly && linkedList.length === 0) return null;

  // Group by label; null/empty → unlabeled bucket shown without a header
  const groups = linkedList.reduce<Record<string, typeof linkedList>>((acc, item) => {
    const key = item.label ?? "";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  const unlabeled = groups[""] ?? [];
  const labeledGroups = Object.entries(groups).filter(([k]) => k !== "");

  const addBtn = !isReadOnly && (
    <button
      onClick={() => setDialogOpen(true)}
      disabled={available.length === 0}
      title={available.length === 0 ? "No other projects to link" : "Link a related project"}
      className={cn(
        "w-7 h-7 rounded-full border flex items-center justify-center transition-colors shrink-0",
        available.length === 0
          ? "border-dashed border-white/[0.06] text-white/15 cursor-not-allowed"
          : "border-dashed border-white/[0.12] text-white/30 hover:border-white/30 hover:text-white/60"
      )}
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        Related
      </p>

      {linkedList.length === 0 ? (
        <div className="flex items-center gap-3">
          {addBtn}
          <span className="text-xs text-white/20 italic">None yet — click + to link</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Unlabeled chips — no header */}
          {unlabeled.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {unlabeled.map(({ project: related }) => (
                <RelatedChip
                  key={related.id}
                  related={related}
                  onNavigate={() => router.push(`/projects/${related.id}`)}
                  onUnlink={() => unlinkProjects(project.id, related.id)}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          )}

          {/* Labeled groups — each under its own header */}
          {labeledGroups.map(([label, items]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1.5">
                {label}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {items.map(({ project: related }) => (
                  <RelatedChip
                    key={related.id}
                    related={related}
                    onNavigate={() => router.push(`/projects/${related.id}`)}
                    onUnlink={() => unlinkProjects(project.id, related.id)}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Add button below all groups */}
          {addBtn && <div>{addBtn}</div>}
        </div>
      )}

      {dialogOpen && (
        <LinkDialog
          currentProject={project}
          available={available}
          onLink={(relatedId, label) => linkProjects(project.id, relatedId, label)}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
