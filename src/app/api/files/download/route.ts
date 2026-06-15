import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDownloadUrl } from "@/lib/s3/client";

/**
 * Proxy a file from S3 through our own origin so that Chrome's
 * DownloadURL drag-to-desktop works (Chrome blocks cross-origin DownloadURL).
 *
 * GET /api/files/download?key=<s3Key>&name=<filename>
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const key  = req.nextUrl.searchParams.get("key");
  const name = req.nextUrl.searchParams.get("name") ?? "download";
  if (!key) return new NextResponse("Missing key", { status: 400 });

  // Get a fresh presigned S3 GET URL (60 s is plenty for the proxy fetch)
  const s3Url = await getDownloadUrl(key, 60);

  const s3Res = await fetch(s3Url);
  if (!s3Res.ok) {
    return new NextResponse("S3 error", { status: 502 });
  }

  const contentType = s3Res.headers.get("Content-Type") ?? "application/octet-stream";
  const safeName    = name.replace(/[^\w.\-]/g, "_");

  return new NextResponse(s3Res.body, {
    headers: {
      "Content-Type":        contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      // Forward length so the browser knows the file size up front
      ...(s3Res.headers.get("Content-Length")
        ? { "Content-Length": s3Res.headers.get("Content-Length")! }
        : {}),
      // Don't cache — presigned URLs expire
      "Cache-Control": "no-store",
    },
  });
}
