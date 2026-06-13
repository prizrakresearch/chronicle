"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import {
  getDashboardData,
  saveDashboardNotes,
  type DashboardNote,
} from "@/lib/db/dashboard";

type Note = DashboardNote;

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");

  // Load persisted notes on mount
  useEffect(() => {
    getDashboardData().then(({ notes }) => setNotes(notes)).catch(console.error);
  }, []);

  const addNote = () => {
    const content = draft.trim();
    if (!content) return;
    const next = [
      { id: crypto.randomUUID(), content, createdAt: new Date().toISOString() },
      ...notes,
    ];
    setNotes(next);
    setDraft("");
    saveDashboardNotes(next).catch(console.error);
  };

  const deleteNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    saveDashboardNotes(next).catch(console.error);
  };

  return (
    <div className="h-full flex flex-col px-5 pt-4 pb-5 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-sm font-semibold text-white/80 tracking-tight">Notes</span>
      </div>

      {/* ── Notes list ── */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-3">
        {notes.length === 0 ? (
          <p className="text-[11px] text-white/20 text-center py-4">No notes yet</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="group relative px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition duration-200 ease-in-out"
            >
              <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap pr-5">
                {note.content}
              </p>
              <span className="text-[10px] text-white/20 mt-1 block">
                {new Date(note.createdAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <button
                onClick={() => deleteNote(note.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-white/25 hover:text-white/65 transition duration-200 ease-in-out"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Draft input ── */}
      <div className="shrink-0 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addNote();
            }
          }}
          placeholder="Jot something down… (↵ to save)"
          rows={2}
          className="flex-1 px-3 py-2 rounded-xl text-xs leading-relaxed bg-white/5 border border-white/8 text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary/40 resize-none transition duration-200 ease-in-out"
        />
        <button
          onClick={addNote}
          disabled={!draft.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/70 text-black hover:bg-primary/90 disabled:opacity-30 transition duration-200 ease-in-out shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
}
