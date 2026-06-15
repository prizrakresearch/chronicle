"use client";

import { useState, useEffect } from "react";
import JSZip from "jszip";

// ── Types ──────────────────────────────────────────────────────────────────────

type ThumbState =
  | { kind: "loading" }
  | { kind: "img"; src: string }
  | { kind: "text"; lines: string[] }
  | { kind: "csv"; rows: string[][]; hasHeader: boolean }
  | { kind: "placeholder" };

// ── Module-level cache ─────────────────────────────────────────────────────────

const cache = new Map<string, ThumbState>();
const inflight = new Map<string, Promise<ThumbState>>();

// ── Mime helpers ───────────────────────────────────────────────────────────────

const OFFICE_ZIP_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isDocPreviewType(mimeType: string) {
  return (
    OFFICE_ZIP_TYPES.has(mimeType) ||
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "text/plain" ||
    mimeType === "text/xml" ||
    mimeType === "application/xml" ||
    mimeType.startsWith("text/")
  );
}

// ── Fetch + parse logic ────────────────────────────────────────────────────────

async function buildThumb(
  fileId: string,
  mimeType: string,
  url: string,
  size: number,
): Promise<ThumbState> {
  if (cache.has(fileId)) return cache.get(fileId)!;
  if (inflight.has(fileId)) return inflight.get(fileId)!;

  const p = (async (): Promise<ThumbState> => {
    // Don't bother fetching very large files
    if (size > 25_000_000) return { kind: "placeholder" };

    try {
      // ── Office XML (DOCX / PPTX / XLSX) ─────────────────────────────────────
      if (OFFICE_ZIP_TYPES.has(mimeType)) {
        const res = await fetch(url);
        if (!res.ok) return { kind: "placeholder" };
        const buf = await res.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);

        for (const name of [
          "docProps/thumbnail.jpeg",
          "docProps/thumbnail.jpg",
          "docProps/thumbnail.png",
        ]) {
          const f = zip.file(name);
          if (!f) continue;
          const blob = await f.async("blob");
          return { kind: "img", src: URL.createObjectURL(blob) };
        }

        // XLSX without embedded thumbnail → spreadsheet grid placeholder
        if (mimeType.includes("spreadsheet")) return { kind: "csv", rows: [], hasHeader: false };
        // DOCX/PPTX without thumbnail → line placeholder
        return { kind: "placeholder" };
      }

      // ── CSV ──────────────────────────────────────────────────────────────────
      if (mimeType === "text/csv" || mimeType === "application/csv") {
        const text = await (await fetch(url)).text();
        const rows = text
          .split("\n")
          .slice(0, 8)
          .map((r) =>
            r
              .split(",")
              .slice(0, 6)
              .map((c) => c.replace(/^["']|["']$/g, "").trim()),
          )
          .filter((r) => r.some(Boolean));
        return rows.length > 0
          ? { kind: "csv", rows, hasHeader: true }
          : { kind: "placeholder" };
      }

      // ── Plain text / XML / code ──────────────────────────────────────────────
      if (mimeType.startsWith("text/") || mimeType.includes("xml")) {
        const text = await (await fetch(url)).text();
        const lines = text.split("\n").slice(0, 30).filter((l) => l.trim());
        return lines.length > 0 ? { kind: "text", lines } : { kind: "placeholder" };
      }

      return { kind: "placeholder" };
    } catch {
      return { kind: "placeholder" };
    }
  })();

  inflight.set(fileId, p);
  const result = await p;
  cache.set(fileId, result);
  inflight.delete(fileId);
  return result;
}

// ── Sub-renders ────────────────────────────────────────────────────────────────

function TextPreview({ lines, compact }: { lines: string[]; compact: boolean }) {
  if (compact) {
    return (
      <div className="w-full h-full flex flex-col justify-center gap-[2px] px-1.5 py-1">
        {[100, 80, 95, 65, 85].map((w, i) => (
          <div
            key={i}
            className="h-[2px] rounded-full bg-white/25"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-[#0c0c0c] overflow-hidden p-2.5">
      <pre className="text-[5.5px] leading-[8px] text-white/50 font-mono whitespace-pre-wrap break-all">
        {lines.join("\n")}
      </pre>
    </div>
  );
}

function CsvPreview({
  rows,
  hasHeader,
  compact,
}: {
  rows: string[][];
  hasHeader: boolean;
  compact: boolean;
}) {
  // Fallback grid when rows are empty (e.g. XLSX placeholder)
  const displayRows =
    rows.length > 0
      ? rows
      : [
          ["A", "B", "C", "D"],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
        ];
  const cols = Math.min(Math.max(...displayRows.map((r) => r.length)), compact ? 4 : 6);

  if (compact) {
    return (
      <div className="w-full h-full p-0.5 overflow-hidden">
        <div
          className="w-full h-full grid gap-[1px]"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(4, 1fr)` }}
        >
          {displayRows.slice(0, 4).map((row, ri) =>
            Array.from({ length: cols }).map((_, ci) => (
              <div
                key={`${ri}-${ci}`}
                className={`rounded-[1px] ${
                  ri === 0 ? "bg-emerald-500/30" : "bg-white/[0.09]"
                }`}
              />
            )),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0c0c0c] overflow-hidden">
      <table className="w-full table-fixed border-collapse">
        <tbody>
          {displayRows.slice(0, 10).map((row, ri) => (
            <tr
              key={ri}
              className={
                ri === 0 && hasHeader
                  ? "bg-emerald-500/10"
                  : ri % 2 === 1
                  ? "bg-white/[0.02]"
                  : ""
              }
            >
              {Array.from({ length: cols }).map((_, ci) => (
                <td
                  key={ci}
                  className="border-[0.5px] border-white/[0.07] px-1 py-0.5 text-[5px] leading-[7px] text-white/45 font-mono truncate max-w-0"
                >
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Placeholder({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="w-full h-full flex flex-col justify-center gap-[2px] px-1.5 py-1">
        {[90, 70, 85, 50, 75].map((w, i) => (
          <div
            key={i}
            className="h-[2px] rounded-full bg-white/15"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col justify-center items-center gap-2 bg-white/[0.02]">
      <div className="relative w-10 h-12 bg-white/[0.06] rounded border border-white/[0.08] flex items-end justify-center pb-2">
        <div className="absolute top-0 right-0 w-3 h-3 border-b border-l border-white/[0.10] bg-white/[0.04] rounded-bl" />
        <div className="flex flex-col gap-[2px] w-5">
          {[100, 80, 90].map((w, i) => (
            <div key={i} className="h-[1.5px] rounded-full bg-white/20" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Public component ───────────────────────────────────────────────────────────

export function DocThumbnail({
  fileId,
  mimeType,
  url,
  size,
  compact = false,
  className = "",
}: {
  fileId: string;
  mimeType: string;
  url: string;
  size: number;
  compact?: boolean;
  className?: string;
}) {
  const [thumb, setThumb] = useState<ThumbState>(
    () => cache.get(fileId) ?? { kind: "loading" },
  );

  useEffect(() => {
    if (thumb.kind !== "loading") return;
    let active = true;
    buildThumb(fileId, mimeType, url, size).then((s) => {
      if (active) setThumb(s);
    });
    return () => {
      active = false;
    };
  }, [fileId, mimeType, url, size, thumb.kind]);

  const base = `${className} w-full h-full`;

  if (thumb.kind === "loading") {
    return <div className={`${base} bg-white/[0.03] animate-pulse`} />;
  }

  if (thumb.kind === "img") {
    return (
      <img
        src={thumb.src}
        alt=""
        className={`${base} object-cover`}
      />
    );
  }

  if (thumb.kind === "text") {
    return <TextPreview lines={thumb.lines} compact={compact} />;
  }

  if (thumb.kind === "csv") {
    return <CsvPreview rows={thumb.rows} hasHeader={thumb.hasHeader} compact={compact} />;
  }

  return <Placeholder compact={compact} />;
}
