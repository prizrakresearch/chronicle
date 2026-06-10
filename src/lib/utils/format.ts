import { format, formatDistanceToNow, isToday, isYesterday, isSameYear } from "date-fns";
import type { TimelineEvent } from "@/types";

export function formatRelativeDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatEventDate(date: Date): string {
  if (isSameYear(date, new Date())) {
    return format(date, "MMMM d");
  }
  return format(date, "MMMM d, yyyy");
}

export function formatGroupDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isSameYear(date, new Date())) {
    return format(date, "MMMM d");
  }
  return format(date, "MMMM d, yyyy");
}

export function formatShortDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatLastSynced(date: Date | null): string {
  if (!date) return "Never synced";
  return `Synced ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function groupEventsByDate(events: TimelineEvent[]): [string, TimelineEvent[]][] {
  const sorted = [...events].sort(
    (a, b) => b.eventDate.getTime() - a.eventDate.getTime()
  );

  const map = new Map<string, TimelineEvent[]>();
  for (const event of sorted) {
    const key = format(event.eventDate, "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  }

  return Array.from(map.entries()).map(([key, evts]) => [
    formatGroupDate(new Date(key + "T12:00:00")),
    evts,
  ]);
}
