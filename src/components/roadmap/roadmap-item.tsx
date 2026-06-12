"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Check, Circle, Clock, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects } from "@/lib/store/projects-context";
import { ROADMAP_STATUS_LABELS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import type { RoadmapItem as RoadmapItemType, RoadmapStatus } from "@/types";

const STATUS_ICONS: Record<RoadmapStatus, React.ElementType> = {
  planned:     Circle,
  in_progress: Clock,
  completed:   Check,
};

const STATUS_ICON_COLORS: Record<RoadmapStatus, string> = {
  planned:     "text-zinc-500",
  in_progress: "text-amber-400",
  completed:   "text-emerald-400",
};

interface RoadmapItemProps {
  item:           RoadmapItemType;
  isDragged:      boolean;
  isDraggingAny:  boolean;
  onDragStart:    (id: string) => void;
  onDragEnd:      () => void;
  /** Fires when another card is dropped just before this one */
  onDropBefore:   (beforeId: string) => void;
}

export function RoadmapItem({
  item, isDragged, isDraggingAny, onDragStart, onDragEnd, onDropBefore,
}: RoadmapItemProps) {
  const { updateRoadmapItem, deleteRoadmapItem } = useProjects();
  const [editing,   setEditing]   = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const [hovered,   setHovered]   = useState(false);
  // Whether another card is dragged over the top-half of this item
  const [dropAbove, setDropAbove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave() {
    const v = editValue.trim();
    if (v && v !== item.title) updateRoadmapItem(item.id, { title: v });
    else setEditValue(item.title);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  handleSave();
    if (e.key === "Escape") { setEditValue(item.title); setEditing(false); }
  }

  // ── Drag source ─────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
    // Safari: give the ghost a moment to render before fading
    setTimeout(() => onDragStart(item.id), 0);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  // ── Drop target (for inserting before this item) ─────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDraggingAny) return;
    e.preventDefault();
    e.stopPropagation(); // don't let the column also handle this
    // Determine which half of the item the cursor is in
    const rect = rowRef.current?.getBoundingClientRect();
    if (rect) {
      const midY = rect.top + rect.height / 2;
      setDropAbove(e.clientY < midY);
    }
  };

  const handleDragLeave = () => {
    setDropAbove(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropAbove(false);
    onDropBefore(item.id); // column will insert before this item in the target column
  };

  const StatusIcon = STATUS_ICONS[item.status];

  return (
    <div className="relative">
      {/* Drop-above indicator */}
      {dropAbove && isDraggingAny && !isDragged && (
        <div className="absolute -top-0.5 left-2 right-2 h-0.5 rounded-full bg-primary/70 pointer-events-none z-10" />
      )}

      <div
        ref={rowRef}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-md hover:bg-zinc-800/50 group transition-all duration-150 cursor-default",
          isDragged      && "opacity-30 scale-[0.98]",
          isDraggingAny  && !isDragged && "cursor-grab",
          !isDraggingAny && "cursor-default",
        )}
      >
        {/* Drag handle */}
        <div className={cn(
          "shrink-0 text-zinc-600 transition-opacity duration-150 cursor-grab active:cursor-grabbing",
          hovered || isDraggingAny ? "opacity-100" : "opacity-0"
        )}>
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Status icon / dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(
            "shrink-0 p-0.5 rounded hover:bg-zinc-700 transition-colors",
            STATUS_ICON_COLORS[item.status]
          )}>
            <StatusIcon className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {(["planned", "in_progress", "completed"] as RoadmapStatus[]).map((s) => {
              const Icon = STATUS_ICONS[s];
              return (
                <DropdownMenuItem
                  key={s}
                  onClick={() => updateRoadmapItem(item.id, { status: s })}
                  className={cn("text-xs gap-2", s === item.status && "bg-zinc-800")}
                >
                  <Icon className={cn("h-3.5 w-3.5", STATUS_ICON_COLORS[s])} />
                  {ROADMAP_STATUS_LABELS[s]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm text-zinc-100 outline-none border-b border-zinc-600 pb-0.5"
            />
          ) : (
            <span
              onClick={() => { setEditing(true); setEditValue(item.title); }}
              className={cn(
                "text-sm cursor-pointer select-none",
                item.status === "completed" ? "line-through text-zinc-500" : "text-zinc-200"
              )}
            >
              {item.title}
            </span>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => deleteRoadmapItem(item.id)}
          className={cn(
            "p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0",
            hovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Drop-below indicator */}
      {!dropAbove && isDraggingAny && !isDragged && (
        <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full bg-primary/70 pointer-events-none z-10 opacity-0 group-hover:opacity-100" />
      )}
    </div>
  );
}
