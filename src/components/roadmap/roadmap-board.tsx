"use client";

import { RoadmapColumn } from "./roadmap-column";
import { useProjects } from "@/lib/store/projects-context";
import type { RoadmapStatus } from "@/types";

const COLUMNS: RoadmapStatus[] = ["planned", "in_progress", "completed"];

interface RoadmapBoardProps {
  projectId: string;
}

export function RoadmapBoard({ projectId }: RoadmapBoardProps) {
  const { getRoadmapItems } = useProjects();
  const allItems = getRoadmapItems(projectId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {COLUMNS.map((status) => {
        const items = allItems
          .filter((item) => item.status === status)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return (
          <div key={status} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <RoadmapColumn status={status} items={items} projectId={projectId} />
          </div>
        );
      })}
    </div>
  );
}
