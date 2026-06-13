"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";

export interface DashboardEvent { id: string; date: string; title: string }
export interface DashboardNote  { id: string; content: string; createdAt: string }

export async function getDashboardData(): Promise<{ events: DashboardEvent[]; notes: DashboardNote[] }> {
  const { userId } = await auth();
  if (!userId) return { events: [], notes: [] };

  const { data } = await db
    .from("owner_settings")
    .select("dashboard_events, dashboard_notes")
    .eq("owner_id", userId)
    .maybeSingle();

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: ((data as any)?.dashboard_events as DashboardEvent[]) ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notes:  ((data as any)?.dashboard_notes  as DashboardNote[])  ?? [],
  };
}

export async function saveDashboardEvents(events: DashboardEvent[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from("owner_settings") as any).upsert({
    owner_id:         userId,
    dashboard_events: events,
  });
}

export async function saveDashboardNotes(notes: DashboardNote[]): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from("owner_settings") as any).upsert({
    owner_id:        userId,
    dashboard_notes: notes,
  });
}
