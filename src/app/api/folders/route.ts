import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";
import { assertProjectAccess } from "@/lib/db/auth";

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const meta = (sessionClaims?.metadata ?? {}) as { role?: string; expiresAt?: string };
  if (!meta.role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Access expired" }, { status: 403 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  // Guests must have an explicit project_shares row for this project.
  try {
    await assertProjectAccess(userId, meta.role!, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await db
    .from("folders")
    .select("id, name")
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[api/folders] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
