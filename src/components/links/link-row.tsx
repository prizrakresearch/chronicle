"use client";

import { useState } from "react";
import { GitBranch, FileText, Globe, Palette, Link2, Copy, Check, Trash2, ExternalLink } from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";
import { LINK_TYPE_LABELS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import type { ProjectLink } from "@/types";

const LINK_ICONS = {
  github: GitBranch,
  docs: FileText,
  production: Globe,
  design: Palette,
  other: Link2,
};

const LINK_ICON_COLORS = {
  github: "text-zinc-300",
  docs: "text-blue-400",
  production: "text-emerald-400",
  design: "text-violet-400",
  other: "text-zinc-400",
};

interface LinkRowProps {
  link: ProjectLink;
}

export function LinkRow({ link }: LinkRowProps) {
  const { deleteLink } = useProjects();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const Icon = LINK_ICONS[link.type];

  async function handleCopy() {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors duration-150 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
        <Icon className={cn("h-4 w-4", LINK_ICON_COLORS[link.type])} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate">{link.title}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">{link.url}</p>
      </div>

      <div className={cn("flex items-center gap-1 transition-opacity", hovered ? "opacity-100" : "opacity-0")}>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={() => deleteLink(link.id)}
          className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
