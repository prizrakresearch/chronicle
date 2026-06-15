"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload, GitBranch, Trash2, RotateCcw, Link2, Activity,
} from "lucide-react";
import type { ActivityEntry, ActivityAction } from "@/lib/db/activity";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACTION_META: Record<
  ActivityAction,
  { label: string; Icon: React.ElementType; color: string }
> = {
  file_uploaded:       { label: "uploaded",         Icon: Upload,     color: "text-primary/70" },
  file_new_version:    { label: "uploaded v",        Icon: GitBranch,  color: "text-violet-400/70" },
  file_trashed:        { label: "trashed",           Icon: Trash2,     color: "text-red-400/60" },
  file_restored:       { label: "restored",          Icon: RotateCcw,  color: "text-emerald-400/70" },
  file_deleted_forever:{ label: "permanently deleted", Icon: Trash2,   color: "text-red-400/80" },
  link_added:          { label: "added link",        Icon: Link2,      color: "text-primary/70" },
  link_trashed:        { label: "trashed link",      Icon: Trash2,     color: "text-red-400/60" },
  link_restored:       { label: "restored link",     Icon: RotateCcw,  color: "text-emerald-400/70" },
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)  return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function shortName(name: string, maxLen = 28): string {
  return name.length > maxLen ? `${name.slice(0, maxLen)}…` : name;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ActivityPanel({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { getProjectActivity } = await import("@/lib/db/activity");
      const data = await getProjectActivity(projectId);
      setEntries(data);
    } catch (err) {
      console.error("[ActivityPanel] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-white/25">Loading…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <Activity className="h-5 w-5 text-white/20" />
        </div>
        <p className="text-sm text-white/35">No activity yet</p>
        <p className="text-xs text-white/20">Uploads, deletes, and restores appear here</p>
      </div>
    );
  }

  // Group entries by calendar day
  const groups: { day: string; items: ActivityEntry[] }[] = [];
  for (const e of entries) {
    const day = new Date(e.created_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 pb-6 space-y-5">
      {groups.map(({ day, items }) => (
        <div key={day}>
          <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-1 mb-2">
            {day}
          </p>
          <div className="space-y-0.5">
            {items.map((e) => {
              const meta = ACTION_META[e.action] ?? {
                label: e.action, Icon: Activity, color: "text-white/40",
              };
              const { Icon } = meta;
              const isVersion = e.action === "file_new_version";

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition group"
                >
                  <div className={`w-7 h-7 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 leading-tight">
                      <span className="text-white/80 font-medium">
                        {e.actor_role === "owner" ? "You" : e.actor_name || "Guest"}
                      </span>
                      {" "}{meta.label}
                      {isVersion && e.entity_name ? (
                        <>
                          {" "}<span className="text-white/50">{shortName(e.entity_name)}</span>
                        </>
                      ) : e.entity_name ? (
                        <>
                          {" "}<span className="text-white/50">{shortName(e.entity_name)}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/20 shrink-0 tabular-nums">
                    {timeAgo(e.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
