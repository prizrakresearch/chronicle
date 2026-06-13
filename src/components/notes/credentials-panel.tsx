"use client";

import { useState, useRef } from "react";
import {
  Plus, Lock, Eye, EyeOff, Check, Pencil, Trash2, X, ChevronDown, ChevronUp, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/store/projects-context";
import type { Credential, CredentialPair, Project } from "@/types";

// ── Copy flash hook ───────────────────────────────────────────────────────────

function useCopyFlash() {
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(key: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFlashKey(key);
    timerRef.current = setTimeout(() => setFlashKey(null), 1400);
  }

  async function copy(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
    flash(key);
  }

  return { flashKey, copy };
}

// ── Key-value pair row ────────────────────────────────────────────────────────

function PairRow({
  pair, credId, revealed, onRevealToggle, onCopy, flashKey,
}: {
  pair:           CredentialPair;
  credId:         string;
  revealed:       boolean;
  onRevealToggle: () => void;
  onCopy:         (text: string, key: string) => void;
  flashKey:       string | null;
}) {
  const keyId = `${credId}::k::${pair.key}`;
  const valId = `${credId}::v::${pair.key}`;

  return (
    <div className="flex items-center gap-2 py-1.5 border-t border-white/[0.04] first:border-t-0">
      {/* Key name — click to copy */}
      <button
        onClick={() => onCopy(pair.key, keyId)}
        title="Click to copy key name"
        className={cn(
          "group/key flex items-center gap-1.5 w-[38%] shrink-0 min-w-0",
          "text-left text-[11px] font-mono rounded px-2 py-1 transition duration-100",
          flashKey === keyId
            ? "text-primary/80 bg-primary/10"
            : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
        )}
      >
        {flashKey === keyId
          ? <Check className="h-2.5 w-2.5 shrink-0 text-primary/70" />
          : <span className="w-2.5 shrink-0" />}
        <span className="truncate">{pair.key}</span>
      </button>

      {/* Value — click to copy */}
      <button
        onClick={() => onCopy(pair.value, valId)}
        title="Click to copy value"
        className={cn(
          "flex-1 min-w-0 flex items-center gap-1.5 text-left text-[11px] font-mono rounded px-2 py-1 transition duration-100",
          flashKey === valId
            ? "text-primary/80 bg-primary/10"
            : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
        )}
      >
        {flashKey === valId
          ? <Check className="h-2.5 w-2.5 shrink-0 text-primary/70" />
          : <span className="w-2.5 shrink-0" />}
        <span className="truncate tracking-wider">
          {revealed ? pair.value : "•".repeat(Math.min(pair.value.length || 12, 18))}
        </span>
      </button>

      {/* Eye toggle */}
      <button
        onClick={onRevealToggle}
        className="h-6 w-6 shrink-0 rounded-full text-white/20 hover:text-white/50 flex items-center justify-center transition duration-150"
      >
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

// ── Credential card ───────────────────────────────────────────────────────────

function CredentialCard({
  cred, onEdit, onDelete,
}: {
  cred:     Credential;
  onEdit:   (c: Credential) => void;
  onDelete: (id: string) => void;
}) {
  const { flashKey, copy } = useCopyFlash();
  const [revealed,  setRevealed]  = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  function toggleReveal(key: string) {
    setRevealed(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Lock className="h-3 w-3 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/80 truncate">{cred.title}</p>
          <p className="text-[10px] text-white/25">
            {cred.pairs.length} {cred.pairs.length === 1 ? "key" : "keys"}
          </p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="h-7 w-7 rounded-full border border-white/10 text-white/25 hover:text-white/55 hover:border-white/20 flex items-center justify-center transition duration-150"
          >
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          <button
            onClick={() => onEdit(cred)}
            className="h-7 w-7 rounded-full border border-white/10 text-white/25 hover:text-white/60 hover:border-white/20 flex items-center justify-center transition duration-150"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(cred.id)}
            className="h-7 w-7 rounded-full border border-red-500/10 text-red-400/25 hover:text-red-400/70 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center transition duration-150"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Key-value pairs */}
      {!collapsed && cred.pairs.length > 0 && (
        <div className="px-4 pb-3">
          {/* Column headers */}
          <div className="flex items-center gap-2 mb-1">
            <span className="w-[38%] shrink-0 text-[9px] font-semibold text-white/20 uppercase tracking-widest px-2">Key</span>
            <span className="flex-1 text-[9px] font-semibold text-white/20 uppercase tracking-widest px-2">Value</span>
            <span className="w-6 shrink-0" />
          </div>
          {cred.pairs.map(pair => (
            <PairRow
              key={pair.key}
              pair={pair}
              credId={cred.id}
              revealed={revealed.has(pair.key)}
              onRevealToggle={() => toggleReveal(pair.key)}
              onCopy={copy}
              flashKey={flashKey}
            />
          ))}
        </div>
      )}

      {!collapsed && cred.pairs.length === 0 && (
        <p className="text-[11px] text-white/20 px-4 pb-3">No keys — click edit to add some.</p>
      )}
    </div>
  );
}

// ── Add / Edit form ───────────────────────────────────────────────────────────

interface FormState {
  title: string;
  pairs: CredentialPair[];
}

function CredentialForm({
  initial, onSave, onCancel,
}: {
  initial?: Credential;
  onSave:   (data: FormState) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]   = useState(initial?.title ?? "");
  const [pairs, setPairs]   = useState<CredentialPair[]>(initial?.pairs ?? [{ key: "", value: "" }]);
  const [reveal, setReveal] = useState<Set<number>>(new Set());

  function addPair() { setPairs(prev => [...prev, { key: "", value: "" }]); }
  function removePair(i: number) { setPairs(prev => prev.filter((_, idx) => idx !== i)); }
  function updatePair(i: number, field: "key" | "value", val: string) {
    setPairs(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  }
  function toggleReveal(i: number) {
    setReveal(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  }

  function handleSave() {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const cleanPairs = pairs.filter(p => p.key.trim());
    onSave({ title: cleanTitle, pairs: cleanPairs });
  }

  return (
    <div className="rounded-[24px] border border-primary/20 bg-primary/[0.03] p-5 flex flex-col gap-4">
      {/* Title */}
      <div>
        <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5 block">
          Platform / API Title
        </label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. GitHub, Stripe, AWS, OpenAI…"
          autoFocus
          className="w-full h-10 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition"
        />
      </div>

      {/* Key-value pairs */}
      <div>
        <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2 block">
          Keys &amp; Values
        </label>
        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={pair.key}
                onChange={e => updatePair(i, "key", e.target.value)}
                placeholder="KEY_NAME"
                className="w-[38%] h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white/70 placeholder:text-white/20 focus:outline-none focus:border-primary/25 transition"
              />
              <div className="flex-1 relative">
                <input
                  value={pair.value}
                  onChange={e => updatePair(i, "value", e.target.value)}
                  placeholder="value"
                  type={reveal.has(i) ? "text" : "password"}
                  className="w-full h-9 pr-9 pl-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white/70 placeholder:text-white/20 focus:outline-none focus:border-primary/25 transition"
                />
                <button
                  type="button"
                  onClick={() => toggleReveal(i)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition"
                >
                  {reveal.has(i) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              <button
                onClick={() => removePair(i)}
                disabled={pairs.length === 1}
                className="h-9 w-9 shrink-0 rounded-xl border border-red-500/10 text-red-400/25 hover:text-red-400/70 hover:border-red-500/30 hover:bg-red-500/5 flex items-center justify-center transition duration-150 disabled:opacity-20 disabled:pointer-events-none"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addPair}
          className="mt-2.5 h-8 px-3 text-[11px] font-semibold rounded-full border border-white/[0.08] text-white/35 hover:text-white/65 hover:border-white/15 flex items-center gap-1.5 transition duration-150"
        >
          <Plus className="h-3 w-3" />
          Add key
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="h-9 px-5 text-xs font-semibold rounded-full bg-primary/15 border border-primary/40 text-primary/80 hover:bg-primary/20 hover:border-primary/60 disabled:opacity-35 disabled:pointer-events-none flex items-center gap-1.5 transition duration-150"
        >
          <Check className="h-3 w-3" />
          {initial ? "Save changes" : "Add credential"}
        </button>
        <button
          onClick={onCancel}
          className="h-9 px-5 text-xs font-semibold rounded-full border border-white/10 text-white/40 hover:text-white/65 hover:border-white/20 flex items-center gap-1.5 transition duration-150"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface CredentialsPanelProps {
  project: Project;
}

export function CredentialsPanel({ project }: CredentialsPanelProps) {
  const { updateProject } = useProjects();
  const credentials: Credential[] = project.credentials ?? [];

  type FormMode = null | { mode: "add" } | { mode: "edit"; cred: Credential };
  const [formMode, setFormMode] = useState<FormMode>(null);

  function saveCredential(data: FormState) {
    const now = new Date().toISOString();

    if (formMode?.mode === "edit") {
      const updated = credentials.map(c =>
        c.id === formMode.cred.id
          ? { ...c, title: data.title, pairs: data.pairs, updatedAt: now }
          : c
      );
      updateProject(project.id, { credentials: updated });
    } else {
      const next: Credential = {
        id:        crypto.randomUUID(),
        title:     data.title,
        pairs:     data.pairs,
        createdAt: now,
        updatedAt: now,
      };
      updateProject(project.id, { credentials: [next, ...credentials] });
    }
    setFormMode(null);
  }

  function deleteCredential(id: string) {
    updateProject(project.id, { credentials: credentials.filter(c => c.id !== id) });
  }

  const empty = credentials.length === 0 && !formMode;

  return (
    <div className="h-full flex flex-col min-w-0 rounded-[28px] border border-border/50 bg-black/50 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <KeyRound className="h-4 w-4 text-primary/50 shrink-0" />
        <h2 className="text-sm font-semibold text-white/70 flex-1">Credentials</h2>
        {!formMode && (
          <button
            onClick={() => setFormMode({ mode: "add" })}
            className="h-8 px-4 text-xs font-semibold rounded-full bg-primary/10 border border-primary/30 text-primary/70 hover:bg-primary/15 hover:border-primary/50 flex items-center gap-1.5 transition duration-150"
          >
            <Plus className="h-3 w-3" />
            Add credential
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
        {/* Add/edit form (shown inline at the top) */}
        {formMode && (
          <CredentialForm
            initial={formMode.mode === "edit" ? formMode.cred : undefined}
            onSave={saveCredential}
            onCancel={() => setFormMode(null)}
          />
        )}

        {/* Empty state */}
        {empty && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pt-16">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Lock className="h-5 w-5 text-white/15" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/30">No credentials yet</p>
              <p className="text-xs text-white/15 mt-1">
                Store API keys, tokens, and secrets for this project
              </p>
            </div>
            <button
              onClick={() => setFormMode({ mode: "add" })}
              className="mt-1 h-9 px-4 text-xs font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 flex items-center gap-1.5 transition duration-200 ease-in-out"
            >
              <Plus className="h-3 w-3" />
              Add credential
            </button>
          </div>
        )}

        {/* Credential cards */}
        {credentials.map(cred => (
          <CredentialCard
            key={cred.id}
            cred={cred}
            onEdit={c => setFormMode({ mode: "edit", cred: c })}
            onDelete={deleteCredential}
          />
        ))}
      </div>
    </div>
  );
}
