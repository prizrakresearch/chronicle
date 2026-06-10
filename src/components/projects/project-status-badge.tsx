import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/utils/constants";
import type { ProjectStatus } from "@/types";

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  size?: "sm" | "default";
}

export function ProjectStatusBadge({ status, size = "default" }: ProjectStatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        colors.bg,
        colors.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}
