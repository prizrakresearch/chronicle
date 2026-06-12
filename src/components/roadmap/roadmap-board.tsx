"use client";

import { useState, useCallback } from "react";
import { RoadmapColumn } from "./roadmap-column";
import { useProjects } from "@/lib/store/projects-context";
import type { RoadmapStatus } from "@/types";

const COLUMNS: RoadmapStatus[] = ["planned", "in_progress", "completed"];

interface RoadmapBoardProps {
  projectId: string;
}

export function RoadmapBoard({ projectId }: RoadmapBoardProps) {
  const { getRoadmapItems, updateRoadmapItem } = useProjects();
  const allItems = getRoadmapItems(projectId);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  const handleDrop = useCallback((targetStatus: RoadmapStatus, beforeItemId?: string) => {
    if (!draggedId) return;
    const draggedItem = allItems.find(i => i.id === draggedId);
    if (!draggedItem) return;

    // Items currently in the target column (excluding the dragged item itself)
    const targetItems = allItems
      .filter(i => i.status === targetStatus && i.id !== draggedId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (beforeItemId) {
      // Dropped before a specific item — insert at that position
      const insertIdx = targetItems.findIndex(i => i.id === beforeItemId);
      const idx       = insertIdx === -1 ? targetItems.length : insertIdx;

      // Re-pack sort orders: items before idx keep theirs, dragged gets idx, items after shift
      const updates: { id: string; sortOrder: number }[] = [];
      targetItems.slice(0, idx).forEach((it, i) => { if (it.sortOrder !== i) updates.push({ id: it.id, sortOrder: i }); });
      updates.push({ id: draggedId, sortOrder: idx });
      targetItems.slice(idx).forEach((it, i)   => { const so = idx + 1 + i; if (it.sortOrder !== so) updates.push({ id: it.id, sortOrder: so }); });

      updates.forEach(({ id, sortOrder }) =>
        updateRoadmapItem(id, { status: targetStatus, sortOrder })
      );
    } else {
      // Dropped at the bottom of the column
      updateRoadmapItem(draggedId, { status: targetStatus, sortOrder: targetItems.length });
    }

    setDraggedId(null);
  }, [draggedId, allItems, updateRoadmapItem]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {COLUMNS.map((status) => {
        const items = allItems
          .filter(item => item.status === status)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return (
          <RoadmapColumn
            key={status}
            status={status}
            items={items}
            projectId={projectId}
            draggedId={draggedId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
          />
        );
      })}
    </div>
  );
}
