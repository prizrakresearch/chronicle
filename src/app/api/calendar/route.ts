import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

// ── Token ─────────────────────────────────────────────────────────────────────

function getCalendarToken(): string {
  return process.env.CALENDAR_TOKEN ?? "";
}

// ── iCal formatting helpers ───────────────────────────────────────────────────

function icalDate(iso: string): string {
  // iCal all-day format: YYYYMMDD
  return iso.replace(/-/g, "").slice(0, 8);
}

function icalEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icalNextDay(iso: string): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return d.toISOString().replace(/-/g, "").slice(0, 8);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token || token !== getCalendarToken()) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch all calendar events joined with project names
  type EventRow = { id: string; date: string; title: string; completed: boolean; project_id: string };
  type ProjectRow = { id: string; name: string };

  const { data: events, error } = await db
    .from("calendar_events")
    .select("id, date, title, completed, project_id")
    .order("date", { ascending: true }) as { data: EventRow[] | null; error: unknown };

  const { data: projectRows } = await db
    .from("projects")
    .select("id, name") as { data: ProjectRow[] | null; error: unknown };

  if (error) {
    return new NextResponse("Internal error", { status: 500 });
  }

  const projectMap = new Map((projectRows ?? []).map(p => [p.id, p.name]));

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Prizrak Labs//Chronicle//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Chronicle",
    "X-WR-TIMEZONE:UTC",
    "X-WR-CALDESC:Events from Chronicle",
  ];

  for (const ev of events ?? []) {
    const projectName = projectMap.get(ev.project_id);
    const prefix  = projectName ? `${projectName} · ` : "";
    const summary = `${prefix}${ev.title}${ev.completed ? " ✓" : ""}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:chronicle-${ev.id}@prizraklabs`,
      `DTSTART;VALUE=DATE:${icalDate(ev.date)}`,
      `DTEND;VALUE=DATE:${icalNextDay(ev.date)}`,
      `SUMMARY:${icalEscape(summary)}`,
      `STATUS:${ev.completed ? "COMPLETED" : "CONFIRMED"}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="chronicle.ics"',
      "Cache-Control":       "no-cache, no-store",
    },
  });
}
