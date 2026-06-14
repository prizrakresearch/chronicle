"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserPlus, Clock, Check, X, RefreshCw, Loader2, UserMinus,
  Trash2, ChevronDown, ChevronRight, History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listGuests,
  inviteGuest,
  revokeGuest,
  revokeInvite,
  extendGuest,
  deleteGuest,
  getAccessHistory,
} from "@/lib/actions/access";
import type { GuestUser, PendingInvite, AccessEvent } from "@/lib/actions/access";
import { cn } from "@/lib/utils";

// ── Duration presets ──────────────────────────────────────────────────────────

const DURATIONS = [
  { key: "1d", label: "24 hours" },
  { key: "1w", label: "1 week"   },
  { key: "1m", label: "1 month"  },
] as const;
type DurationKey = (typeof DURATIONS)[number]["key"];

function addDuration(d: DurationKey): string {
  const t = new Date();
  if (d === "1d") t.setDate(t.getDate() + 1);
  if (d === "1w") t.setDate(t.getDate() + 7);
  if (d === "1m") t.setMonth(t.getMonth() + 1);
  return t.toISOString();
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "No expiry";
  const d = new Date(expiresAt);
  if (d.getTime() <= 0) return "Revoked";
  const now = new Date();
  if (d < now) return "Expired";
  const diff = d.getTime() - now.getTime();
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h left`;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days}d left`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function isRevoked(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date(1); // epoch sentinel = revoked
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

function isGone(expiresAt: string | null): boolean {
  // "gone" = either explicitly revoked (epoch) or naturally expired
  return isExpired(expiresAt);
}

const ACTION_LABEL: Record<AccessEvent["action"], string> = {
  granted: "Invited",
  updated: "Access updated",
  revoked: "Revoked",
  removed: "Removed",
};

const ACTION_COLOR: Record<AccessEvent["action"], string> = {
  granted: "text-emerald-400/70",
  updated: "text-sky-400/70",
  revoked: "text-orange-400/60",
  removed: "text-red-400/60",
};

// ── Avatar circle (initials-based) ───────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-300",
  "bg-sky-500/20 text-sky-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-orange-500/20 text-orange-300",
  "bg-pink-500/20 text-pink-300",
];
function avatarColor(s: string) {
  const i = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}
function initials(name: string, email: string): string {
  if (name && name !== "—") {
    const parts = name.split(" ");
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? "?";
}

// ── Main component ────────────────────────────────────────────────────────────

interface AccessDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

export function AccessDialog({ open, onOpenChange }: AccessDialogProps) {
  const [guests,  setGuests]  = useState<GuestUser[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [history, setHistory] = useState<AccessEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Invite form
  const [email,     setEmail]     = useState("");
  const [name,      setName]      = useState("");
  const [duration,  setDuration]  = useState<DurationKey>("1w");
  const [inviting,  setInviting]  = useState(false);
  const [invErr,    setInvErr]    = useState<string | null>(null);
  const [invMode,   setInvMode]   = useState<"invited" | "updated" | null>(null);

  // Per-row action states
  const [revoking,  setRevoking]  = useState<Record<string, boolean>>({});
  const [extending, setExtending] = useState<Record<string, boolean>>({});
  const [deleting,  setDeleting]  = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { guests: g, pending: p } = await listGuests();
      setGuests(g);
      setPending(p);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const events = await getAccessHistory();
      setHistory(events);
    } catch {
      // silently ignore
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Load history when the section is first expanded
  useEffect(() => {
    if (historyOpen && history.length === 0) loadHistory();
  }, [historyOpen, history.length, loadHistory]);

  // ── Invite handler ──────────────────────────────────────────────────────────

  async function handleInvite() {
    const e = email.trim();
    if (!e) return;
    setInviting(true);
    setInvErr(null);
    try {
      const { mode } = await inviteGuest(e, name.trim() || null, addDuration(duration));
      setInvMode(mode);
      setEmail("");
      setName("");
      setTimeout(() => { setInvMode(null); load(); }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("owner account")) setInvErr("That's the owner account — can't change its access.");
      else setInvErr(msg);
    } finally {
      setInviting(false);
    }
  }

  // ── Guest action handlers ───────────────────────────────────────────────────

  async function handleRevoke(userId: string) {
    setRevoking((r) => ({ ...r, [userId]: true }));
    try { await revokeGuest(userId); await load(); }
    finally { setRevoking((r) => ({ ...r, [userId]: false })); }
  }

  async function handleRevokeInvite(inviteId: string) {
    setRevoking((r) => ({ ...r, [inviteId]: true }));
    try { await revokeInvite(inviteId); await load(); }
    finally { setRevoking((r) => ({ ...r, [inviteId]: false })); }
  }

  async function handleExtend(userId: string) {
    setExtending((s) => ({ ...s, [userId]: true }));
    try { await extendGuest(userId, addDuration("1w")); await load(); }
    finally { setExtending((s) => ({ ...s, [userId]: false })); }
  }

  async function handleDelete(userId: string) {
    setDeleting((d) => ({ ...d, [userId]: true }));
    try {
      await deleteGuest(userId);
      // Refresh both lists and history (since deletion creates a log entry)
      await load();
      if (historyOpen) await loadHistory();
    }
    finally { setDeleting((d) => ({ ...d, [userId]: false })); }
  }

  // ── Partitioned guest lists ─────────────────────────────────────────────────

  const activeGuests  = guests.filter((g) => !isGone(g.expiresAt));
  const revokedGuests = guests.filter((g) =>  isGone(g.expiresAt));
  const hasAnyone     = activeGuests.length > 0 || pending.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Manage access</span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />}
            {!loading && (
              <button
                onClick={load}
                className="h-5 w-5 flex items-center justify-center rounded-full text-white/25 hover:text-white/60 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">

          {/* ── Active access ── */}
          <div>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
              People with access
            </p>

            {!hasAnyone && !loading && (
              <p className="text-xs text-white/20 py-4 text-center">Nobody invited yet</p>
            )}

            <div className="space-y-1.5">
              {/* Active guests */}
              {activeGuests.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0", avatarColor(g.email))}>
                    {initials(g.name, g.email)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/75 font-medium leading-none truncate">
                      {g.name !== "—" ? g.name : g.email}
                    </p>
                    {g.name !== "—" && (
                      <p className="text-[11px] text-white/30 truncate mt-0.5">{g.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        g.expiresAt
                          ? "bg-orange-500/10 text-orange-400/70"
                          : "bg-white/[0.06] text-white/35"
                      )}>
                        {fmtExpiry(g.expiresAt)}
                      </span>
                    </div>
                  </div>

                  {/* Revoke */}
                  <button
                    onClick={() => handleRevoke(g.id)}
                    disabled={!!revoking[g.id]}
                    title="Revoke access"
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/20 hover:text-red-400/70 hover:bg-red-500/[0.08] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {revoking[g.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                  </button>
                </div>
              ))}

              {/* Pending invites */}
              {pending.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-dashed border-white/[0.08] bg-transparent"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/[0.04]">
                    <Clock className="h-3.5 w-3.5 text-white/25" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {inv.name && (
                      <p className="text-sm text-white/55 font-medium leading-none truncate">{inv.name}</p>
                    )}
                    <p className="text-[11px] text-white/35 truncate mt-0.5">{inv.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-white/20 font-medium px-1.5 py-0.5 rounded-full bg-white/[0.04]">
                        Pending
                      </span>
                      {inv.expiresAt && (
                        <span className="text-[10px] text-white/20">
                          · {fmtExpiry(inv.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    disabled={revoking[inv.id]}
                    title="Cancel invite"
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/20 hover:text-red-400/70 hover:bg-red-500/[0.08] transition-colors duration-150 disabled:opacity-30"
                  >
                    {revoking[inv.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Revoked / expired ── */}
          {revokedGuests.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-white/20 uppercase tracking-widest mb-2.5">
                Revoked
              </p>
              <div className="space-y-1.5">
                {revokedGuests.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-white/[0.04] bg-white/[0.01] opacity-60"
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 grayscale", avatarColor(g.email))}>
                      {initials(g.name, g.email)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/50 font-medium leading-none truncate">
                        {g.name !== "—" ? g.name : g.email}
                      </p>
                      {g.name !== "—" && (
                        <p className="text-[11px] text-white/25 truncate mt-0.5">{g.email}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400/60">
                          {isRevoked(g.expiresAt) ? "Revoked" : "Expired"}
                        </span>
                        {/* Extend — brings them back */}
                        <button
                          onClick={() => handleExtend(g.id)}
                          disabled={extending[g.id]}
                          className="text-[10px] text-white/20 hover:text-primary/60 transition-colors"
                        >
                          {extending[g.id] ? "Extending…" : "+1 week"}
                        </button>
                      </div>
                    </div>

                    {/* Delete — fully removes from Clerk */}
                    <button
                      onClick={() => handleDelete(g.id)}
                      disabled={!!deleting[g.id]}
                      title="Remove from system"
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/15 hover:text-red-400/60 hover:bg-red-500/[0.08] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {deleting[g.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="border-t border-white/[0.06]" />

          {/* ── Invite form ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">
              Invite someone
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setInvErr(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              placeholder="email@example.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-2xl bg-white/[0.04] border border-white/10 text-white/80 placeholder:text-white/20 outline-none focus:border-white/25 transition-colors"
            />

            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDuration(d.key)}
                  className={cn(
                    "flex-1 h-8 rounded-full text-xs font-medium border transition duration-150",
                    duration === d.key
                      ? "border-primary/50 text-primary/80 bg-primary/10"
                      : "border-white/10 text-white/35 hover:border-white/20 hover:text-white/55"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional — shown on their splash)"
              className="w-full px-3.5 py-2.5 text-sm rounded-2xl bg-white/[0.04] border border-white/10 text-white/80 placeholder:text-white/20 outline-none focus:border-white/25 transition-colors"
            />

            {invErr && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                <p className="text-xs text-red-400/80">{invErr}</p>
              </div>
            )}

            <button
              onClick={handleInvite}
              disabled={!email.trim() || inviting || !!invMode}
              className="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold rounded-full text-primary/75 border border-primary/50 hover:bg-primary/10 transition duration-200 disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {invMode === "invited" ? (
                <><Check className="h-3.5 w-3.5" /> Invite sent!</>
              ) : invMode === "updated" ? (
                <><Check className="h-3.5 w-3.5" /> Access updated!</>
              ) : inviting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
              ) : (
                <><UserPlus className="h-3.5 w-3.5" /> Send invite</>
              )}
            </button>

            <p className="text-[10px] text-white/20 text-center leading-relaxed">
              They'll get an email with a sign-in link · Access expires after {DURATIONS.find(d => d.key === duration)?.label}
            </p>
          </div>

          {/* ── History (collapsible) ── */}
          <div className="border-t border-white/[0.06] pt-4">
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center gap-2 text-[11px] font-semibold text-white/20 uppercase tracking-widest hover:text-white/40 transition-colors"
            >
              {historyOpen
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5" />}
              <History className="h-3 w-3" />
              Access history
              {historyLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
            </button>

            {historyOpen && (
              <div className="mt-3 space-y-1">
                {history.length === 0 && !historyLoading && (
                  <p className="text-xs text-white/20 py-3 text-center">No history yet</p>
                )}
                {history.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2.5 py-1.5 px-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
                      "bg-emerald-400/50": ev.action === "granted",
                      "bg-sky-400/50":     ev.action === "updated",
                      "bg-orange-400/40":  ev.action === "revoked",
                      "bg-red-400/40":     ev.action === "removed",
                    })} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white/45 truncate">
                        {ev.name ? `${ev.name} ` : ""}<span className="text-white/25">{ev.email}</span>
                      </span>
                    </div>
                    <span className={cn("text-[10px] font-medium shrink-0", ACTION_COLOR[ev.action])}>
                      {ACTION_LABEL[ev.action]}
                    </span>
                    <span className="text-[10px] text-white/20 shrink-0">{fmtDate(ev.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
