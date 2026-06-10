import { RoadmapItem } from "./roadmap-item";
import { AddRoadmapItemForm } from "./add-roadmap-item-form";
import { ROADMAP_STATUS_LABELS } from "@/lib/utils/constants";
import type { RoadmapItem as RoadmapItemType, RoadmapStatus } from "@/types";
import { cn } from "@/lib/utils";

const COLUMN_COLORS: Record<RoadmapStatus, string> = {
  planned: "text-zinc-400",
  in_progress: "text-amber-400",
  completed: "text-emerald-400",
};

const COLUMN_DOT: Record<RoadmapStatus, string> = {
  planned: "bg-zinc-500",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-400",
};

interface RoadmapColumnProps {
  status: RoadmapStatus;
  items: RoadmapItemType[];
  projectId: string;
}

export function RoadmapColumn({ status, items, projectId }: RoadmapColumnProps) {
  const sortOrderBase = items.length;

  return (
    <div className="flex flex-col min-h-32">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("w-2 h-2 rounded-full", COLUMN_DOT[status])} />
        <span className={cn("text-xs font-semibold uppercase tracking-wider", COLUMN_COLORS[status])}>
          {ROADMAP_STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-zinc-600 ml-auto">{items.length}</span>
      </div>

      <div className="flex-1 space-y-0.5">
        {items.map((item) => (
          <RoadmapItem key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-2">
        <AddRoadmapItemForm
          projectId={projectId}
          status={status}
          sortOrderBase={sortOrderBase}
        />
      </div>
    </div>
  );
}
