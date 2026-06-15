"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

/**
 * Returns the webcal:// subscribe URL for Apple Calendar.
 * The CALENDAR_TOKEN env var is server-only (no NEXT_PUBLIC_ prefix), so it
 * must never appear in client JS. This action constructs the full URL
 * server-side and returns it — the token is never sent to the browser bundle.
 * Only the owner can subscribe; guests don't get access to the full feed.
 */
export async function getCalendarSubscribeUrl(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string };
  if (meta.role !== "owner") throw new Error("Forbidden");

  const token = process.env.CALENDAR_TOKEN ?? "";
  if (!token) throw new Error("Calendar not configured");

  // Derive the host from the incoming request so this works on any environment.
  const hdrs  = await headers();
  const host  = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const base  = `${proto}://${host}`.replace(/^https?/, "webcal");

  return `${base}/api/calendar?token=${encodeURIComponent(token)}`;
}
