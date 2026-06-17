"use client";

import { useEffect, useState } from "react";
import { useProjects } from "@/lib/store/projects-context";

/**
 * Shows a subtle "waking up" indicator when the initial Supabase fetch takes
 * longer than DELAY_MS — typical after the free-tier DB has been idle.
 * Fades in after the delay, fades out once data loads.
 */
const DELAY_MS = 3_000;

export function WakeUpBanner() {
  const { loading } = useProjects();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [loading]);

  const visible = slow && loading;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        opacity:    visible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      <div className="mt-3 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/[0.08] backdrop-blur-md shadow-lg">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400/80" />
        </span>
        <span className="text-[11px] text-white/45 tracking-wide">waking up database…</span>
      </div>
    </div>
  );
}
