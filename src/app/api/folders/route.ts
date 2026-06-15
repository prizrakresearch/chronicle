import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

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
