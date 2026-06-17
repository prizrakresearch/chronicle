"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut, UserCog, GitBranch as GithubIcon, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GithubTokenModal } from "./github-token-modal";
import { AccessDialog } from "./access-dialog";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";

// ── Role helpers ──────────────────────────────────────────────────────────────

type RoleVariant = "master" | "user" | "temp";

interface RoleInfo {
  label: string;
  variant: RoleVariant;
}

function getRoleInfo(
  meta: { role?: string; expiresAt?: string } | undefined
): RoleInfo {
  if (meta?.role === "owner") return { label: "Master",           variant: "master" };
  if (meta?.expiresAt)        return { label: "Temporary access", variant: "temp"   };
  return                             { label: "User",             variant: "user"   };
}

const CHIP_CLASS: Record<RoleVariant, string> = {
  master: "bg-primary/15 text-primary/80",
  temp:   "bg-orange-500/15 text-orange-400/80",
  user:   "bg-white/10 text-white/50",
};

const DOT_CLASS: Record<RoleVariant, string> = {
  master: "bg-primary/80",
  temp:   "bg-orange-400/80",
  user:   "bg-white/40",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function UserBadge() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { hasGithubToken, isReadOnly } = useProjects();
  const [githubOpen,  setGithubOpen]  = useState(false);
  const [accessOpen,  setAccessOpen]  = useState(false);

  if (!isLoaded || !user) return null;

  const meta      = user.publicMetadata as { role?: string; expiresAt?: string } | undefined;
  const isOwner   = meta?.role === "owner";
  const { label, variant } = getRoleInfo(meta);

  const firstName       = user.firstName ?? user.username ?? "User";
  const fullName        = user.fullName  ?? user.username ?? "User";
  const initials        = ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase();
  const fallbackInitial = firstName[0]?.toUpperCase() ?? "?";
  const emailOrUser     = user.primaryEmailAddress?.emailAddress ?? user.username ?? "";

  return (
    <>
    <Popover>
      {/* ── Trigger pill ──────────────────────────────────────────────────── */}
      <PopoverTrigger
        className={cn(
          "flex items-center gap-2 h-11 pl-1.5 pr-3 rounded-full border border-white/10",
          "hover:border-white/20 hover:bg-white/[0.03] bg-transparent",
          "transition duration-200 ease-in-out cursor-pointer"
        )}
      >
        <Avatar>
          <AvatarImage src={user.imageUrl} alt={firstName} />
          <AvatarFallback className="bg-zinc-800 text-white/60 text-xs">
            {initials || fallbackInitial}
          </AvatarFallback>
        </Avatar>

        <span className="text-sm text-white/70 font-medium leading-none">
          {firstName}
        </span>

        <span className={cn(
          "text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none",
          CHIP_CLASS[variant]
        )}>
          {label}
        </span>
      </PopoverTrigger>

      {/* ── Popover panel ─────────────────────────────────────────────────── */}
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-60 p-0 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl"
      >
        {/* Avatar + name + email */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <Avatar size="lg">
            <AvatarImage src={user.imageUrl} alt={fullName} />
            <AvatarFallback className="bg-zinc-800 text-white/60 text-sm">
              {initials || fallbackInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/85 truncate">{fullName}</p>
            {emailOrUser && (
              <p className="text-[11px] text-white/35 truncate mt-0.5">{emailOrUser}</p>
            )}
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 pb-3">
          <span className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
            CHIP_CLASS[variant]
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_CLASS[variant])} />
            {label}
          </span>
        </div>

        {/* Actions */}
        <div className="border-t border-white/[0.06] p-2 space-y-0.5">
          <button
            onClick={() => openUserProfile()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition duration-150 ease-in-out"
          >
            <UserCog className="h-3.5 w-3.5 shrink-0" />
            Edit profile
          </button>
          {!isReadOnly && (
            <button
              onClick={() => setGithubOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition duration-150 ease-in-out"
            >
              <GithubIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left">GitHub</span>
              {hasGithubToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shrink-0" />}
            </button>
          )}
          {/* Owner-only: manage guest access */}
          {isOwner && (
            <button
              onClick={() => setAccessOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition duration-150 ease-in-out"
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              Manage access
            </button>
          )}
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-red-400/70 hover:bg-red-500/[0.05] transition duration-150 ease-in-out"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
    <GithubTokenModal open={githubOpen} onOpenChange={setGithubOpen} />
    <AccessDialog     open={accessOpen} onOpenChange={setAccessOpen} />
</>
  );
}
