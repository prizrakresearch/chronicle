"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BookOpen, Command } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] flex flex-col z-40 border-r border-border bg-zinc-950">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-[15px] font-semibold text-foreground tracking-tight">Chronicle</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-100",
            isDashboard
              ? "bg-primary/15 text-primary font-medium border border-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Projects</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 ring-1 ring-border">
              <span className="text-xs font-semibold text-primary">A</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">adyothuria</span>
          </div>
          <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" title="⌘K to search">
            <Command className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
