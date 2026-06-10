"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, ExternalLink } from "lucide-react";
import { TimelineEventTypeIcon } from "./timeline-event-type-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EVENT_TYPE_LABELS } from "@/lib/utils/constants";
import { useProjects } from "@/lib/store/projects-context";
import type { TimelineEvent as TimelineEventType } from "@/types";
import { cn } from "@/lib/utils";

interface TimelineEventProps {
  event: TimelineEventType;
  isLast: boolean;
}

export function TimelineEvent({ event, isLast }: TimelineEventProps) {
  const { deleteTimelineEvent } = useProjects();
  const [hovered, setHovered] = useState(false);

  const isCommit = event.type === "git_commit";
  const sha = event.metadata?.sha;
  const commitUrl = event.metadata?.url;

  return (
    <div
      className="flex gap-4 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon + connector */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <TimelineEventTypeIcon type={event.type} />
        {!isLast && <div className="w-px flex-1 mt-2 bg-zinc-800 min-h-6" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0", isLast ? "pb-0" : "pb-6")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Label row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                {EVENT_TYPE_LABELS[event.type]}
              </span>
              {isCommit && sha && (
                <a
                  href={commitUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 px-1.5 py-0.5 rounded transition-colors"
                >
                  {sha.slice(0, 7)}
                </a>
              )}
            </div>

            {/* Title */}
            <div className="flex items-center gap-1.5">
              <p className={cn("text-sm font-medium leading-snug", isCommit ? "text-zinc-300 font-mono" : "text-zinc-100")}>
                {event.title}
              </p>
              {isCommit && commitUrl && (
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Body */}
            {event.body && (
              <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed whitespace-pre-line">
                {event.body}
              </p>
            )}
          </div>

          {/* Actions */}
          {!isCommit && (
            <div className={cn("shrink-0 transition-opacity duration-100", hovered ? "opacity-100" : "opacity-0")}>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-6 w-6 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => deleteTimelineEvent(event.id)}
                    className="text-destructive focus:text-destructive text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
