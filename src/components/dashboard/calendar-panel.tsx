"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDashboardData,
  saveDashboardEvents,
  type DashboardEvent,
} from "@/lib/db/dashboard";

const DAY_LABELS  = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CalEvent = DashboardEvent;

function toIso(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function fmtShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

export function CalendarPanel() {
  const todayIso = useMemo(() => toIso(new Date()), []);

  const [year,     setYear]     = useState(() => new Date().getFullYear());
  const [month,    setMonth]    = useState(() => new Date().getMonth());
  const [events,   setEvents]   = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft,    setDraft]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted events on mount
  useEffect(() => {
    getDashboardData().then(({ events }) => setEvents(events)).catch(console.error);
  }, []);

  const { offset, daysInMonth } = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    return {
      offset:      (firstDow + 6) % 7,
      daysInMonth: new Date(year, month + 1, 0).getDate(),
    };
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of events) (map[e.date] ??= []).push(e);
    return map;
  }, [events]);

  const upcoming = useMemo(
    () => [...events].filter((e) => e.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date)),
    [events, todayIso],
  );

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const selectDay = (iso: string) => {
    setSelected(iso);
    setDraft("");
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const addEvent = () => {
    const title = draft.trim();
    if (!selected || !title) return;
    const next = [...events, { id: crypto.randomUUID(), date: selected, title }];
    setEvents(next);
    setDraft("");
    saveDashboardEvents(next).catch(console.error);
  };

  const deleteEvent = (id: string) => {
    const next = events.filter((e) => e.id !== id);
    setEvents(next);
    saveDashboardEvents(next).catch(console.error);
  };

  return (
    <div className="h-full flex flex-col px-5 pt-5 pb-4 overflow-hidden">

      {/* ── Month nav ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-sm font-semibold text-white/80 tracking-tight">
          {MONTH_NAMES[month]} {year}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center rounded-full text-white/35 hover:text-white/80 hover:bg-white/8 transition duration-200 ease-in-out">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center rounded-full text-white/35 hover:text-white/80 hover:bg-white/8 transition duration-200 ease-in-out">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 shrink-0 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={d} className={cn("text-center text-[10px] font-medium pb-1", i >= 5 ? "text-violet-400/40" : "text-white/20")}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7 gap-y-0.5 shrink-0">
        {Array.from({ length: offset }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday   = iso === todayIso;
          const isSel     = iso === selected;
          const hasEvents = Boolean(eventsByDate[iso]?.length);
          const dow       = (offset + i) % 7;
          const isWeekend = dow >= 5;

          return (
            <button
              key={day}
              onClick={() => selectDay(iso)}
              className={cn(
                "relative mx-auto flex items-center justify-center w-7 h-7 rounded-full",
                "text-xs font-medium transition duration-200 ease-in-out",
                isSel   && "bg-primary/80 text-black",
                isToday && !isSel && "bg-primary/15 text-primary/90",
                !isToday && !isSel && isWeekend  && "text-violet-400/70 hover:bg-violet-400/10 hover:text-violet-400",
                !isToday && !isSel && !isWeekend && "text-white/55 hover:bg-white/8 hover:text-white/90",
              )}
            >
              {day}
              {hasEvents && !isSel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Add-event input ── */}
      <div className="mt-3 shrink-0 flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addEvent()}
          placeholder={selected ? `Event on ${fmtShort(selected)}…` : "Select a date…"}
          disabled={!selected}
          className="flex-1 h-8 px-3 rounded-full text-xs bg-white/5 border border-white/8 text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary/40 disabled:opacity-40 transition duration-200 ease-in-out"
        />
        <button
          onClick={addEvent}
          disabled={!selected || !draft.trim()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/70 text-black hover:bg-primary/90 disabled:opacity-30 transition duration-200 ease-in-out shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Upcoming events ── */}
      <div className="mt-3 flex-1 overflow-y-auto min-h-0 space-y-1.5">
        {upcoming.length === 0 ? (
          <p className="text-[11px] text-white/20 text-center py-2">No upcoming events</p>
        ) : (
          upcoming.map((ev) => (
            <div key={ev.id} className="group flex items-start gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition duration-200 ease-in-out">
              <span className="shrink-0 text-[10px] font-medium text-primary/55 mt-px whitespace-nowrap">
                {fmtShort(ev.date)}
              </span>
              <span className="flex-1 text-[11px] text-white/65 leading-snug">{ev.title}</span>
              <button
                onClick={() => deleteEvent(ev.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0 text-white/25 hover:text-white/65 transition duration-200 ease-in-out"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
