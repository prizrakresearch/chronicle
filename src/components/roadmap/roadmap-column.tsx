"use client";

import { useState, useRef } from "react";
import { RoadmapItem } from "./roadmap-item";
import { AddRoadmapItemForm } from "./add-roadmap-item-form";
import { ROADMAP_STATUS_LABELS } from "@/lib/utils/constants";
import type { RoadmapItem as RoadmapItemType, RoadmapStatus } from "@/types";
import { cn } from "@/lib/utils";

const COLUMN_COLORS: Record<RoadmapStatus, string> = {
  planned:     "text-zinc-400",
  in_progress: "text-amber-400",
  completed:   "text-emerald-400",
};

const COLUMN_DOT: Record<RoadmapStatus, string> = {
  planned:     "bg-zinc-500",
  in_progress: "bg-amber-400",
  completed:   "bg-emerald-400",
};

const COLUMN_OVER: Record<RoadmapStatus, string> = {
  planned:     "border-zinc-500/60 bg-zinc-500/5",
  in_progress: "border-amber-400/60 bg-amber-400/5",
  completed:   "border-emerald-400/60 bg-emerald-400/5",
};

interface RoadmapColumnProps {
  status:       RoadmapStatus;
  items:        RoadmapItemType[];
  projectId:    string;
  draggedId:    string | null;
  onDragStart:  (id: string) => void;
  onDragEnd:    () => void;
  onDrop:       (status: RoadmapStatus, beforeItemId?: string) => void;
}

export function RoadmapColumn({
  status, items, projectId, draggedId, onDragStart, onDragEnd, onDrop,
}: RoadmapColumnProps) {
  const [isOver, setIsOver] = useState(false);
  const dragCounter = useRef(0); // tracks nested enter/leave events

  const isDragging = draggedId !== null;
  const sortOrderBase = items.length;

  // ── drag-over handlers ──────────────────────────────────────────────────────

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsOver(false);
    onDrop(status); // drop at bottom; item-level handlers can pass beforeItemId
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "rounded-xl border transition-all duration-150 p-4 flex flex-col min-h-32",
        isOver
          ? COLUMN_OVER[status]
          : "border-zinc-800/80 bg-zinc-900/40"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("w-2 h-2 rounded-full", COLUMN_DOT[status])} />
        <span className={cn("text-xs font-semibold uppercase tracking-wider", COLUMN_COLORS[status])}>
          {ROADMAP_STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-zinc-600 ml-auto">{items.length}</span>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-0.5 min-h-[32px]">
        {items.map((item) => (
          <RoadmapItem
            key={item.id}
            item={item}
            isDragged={draggedId === item.id}
            isDraggingAny={isDragging}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDropBefore={(beforeId) => onDrop(status, beforeId)}
          />
        ))}

        {/* Empty drop zone hint */}
        {items.length === 0 && isDragging && (
          <div className={cn(
            "h-10 rounded-md border-2 border-dashed flex items-center justify-center text-[10px] transition-colors duration-150",
            isOver
              ? cn("border-current", COLUMN_COLORS[status], "opacity-60")
              : "border-zinc-700 text-zinc-600"
          )}>
            Drop here
          </div>
        )}
      </div>

      {/* Add item */}
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
