import { FileText, Lightbulb, Wrench, Flag, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_COLORS, EVENT_TYPE_BG } from "@/lib/utils/constants";
import type { EventType } from "@/types";

const ICONS: Record<EventType, React.ElementType> = {
  note: FileText,
  decision: Lightbulb,
  maintenance: Wrench,
  milestone: Flag,
  git_commit: GitCommit,
};

interface TimelineEventTypeIconProps {
  type: EventType;
  size?: "sm" | "default";
}

export function TimelineEventTypeIcon({ type, size = "default" }: TimelineEventTypeIconProps) {
  const Icon = ICONS[type];
  return (
    <div
      className={cn(
        "rounded-md flex items-center justify-center shrink-0",
        EVENT_TYPE_BG[type],
        size === "sm" ? "w-6 h-6" : "w-7 h-7"
      )}
    >
      <Icon className={cn(EVENT_TYPE_COLORS[type], size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
    </div>
  );
}
