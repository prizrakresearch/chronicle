import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/supabase/server";
import { getDownloadUrl } from "@/lib/s3/client";

/**
 * Proxy a file from S3 through our own origin so that Chrome's
 * DownloadURL drag-to-desktop works (Chrome blocks cross-origin DownloadURL).
 *
 * GET /api/files/download?key=<s3Key>&name=<filename>
 *
 * Security: verifies the requesting user is authenticated, not an expired
 * guest, and that the requested S3 key actually exists in project_files
 * (prevents arbitrary S3 key enumeration by authenticated users).
 */
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  // Reject expired guests even if their Clerk session token is still valid
  const meta = (sessionClaims?.metadata ?? {}) as { role?: string; expiresAt?: string };
  if (!meta.role) return new NextResponse("Forbidden", { status: 403 });
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    return new NextResponse("Access expired", { status: 403 });
  }

  const key  = req.nextUrl.searchParams.get("key");
  const name = req.nextUrl.searchParams.get("name") ?? "download";
  if (!key) return new NextResponse("Missing key", { status: 400 });

  // Verify the key belongs to a real, non-deleted file in the database.
  // This prevents any authenticated user from downloading arbitrary S3 objects
  // by guessing or reusing keys they've seen in other projects.
  const { data: fileRow } = await db
    .from("project_files")
    .select("id")
    .eq("storage_path", key)
    .is("deleted_at", null)
    .maybeSingle();

  // Also allow logo keys — check project logos table
  let authorized = !!fileRow;
  if (!authorized) {
    const { data: projectRow } = await db
      .from("projects")
      .select("id")
      .eq("logo_s3_key", key)
      .maybeSingle();
    authorized = !!projectRow;
  }

  if (!authorized) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Fetch via a short-lived presigned URL (60 s is enough for the proxy fetch)
  const s3Url = await getDownloadUrl(key, 60);
  const s3Res = await fetch(s3Url);
  if (!s3Res.ok) return new NextResponse("S3 error", { status: 502 });

  const contentType = s3Res.headers.get("Content-Type") ?? "application/octet-stream";
  const safeName    = name.replace(/[^\w.\-]/g, "_");

  return new NextResponse(s3Res.body, {
    headers: {
      "Content-Type":        contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      ...(s3Res.headers.get("Content-Length")
        ? { "Content-Length": s3Res.headers.get("Content-Length")! }
        : {}),
      "Cache-Control": "no-store",
    },
  });
}
