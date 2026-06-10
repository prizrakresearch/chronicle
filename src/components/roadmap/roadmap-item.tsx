"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, Check, Circle, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  planned: Circle,
  in_progress: Clock,
  completed: Check,
};

const STATUS_ICON_COLORS: Record<RoadmapStatus, string> = {
  planned: "text-zinc-500",
  in_progress: "text-amber-400",
  completed: "text-emerald-400",
};

interface RoadmapItemProps {
  item: RoadmapItemType;
}

export function RoadmapItem({ item }: RoadmapItemProps) {
  const { updateRoadmapItem, deleteRoadmapItem } = useProjects();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave() {
    const v = editValue.trim();
    if (v && v !== item.title) {
      updateRoadmapItem(item.id, { title: v });
    } else {
      setEditValue(item.title);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditValue(item.title);
      setEditing(false);
    }
  }

  const StatusIcon = STATUS_ICONS[item.status];

  return (
    <div
      className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-zinc-800/50 group transition-colors duration-150"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Status icon / dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className={cn("shrink-0 p-0.5 rounded hover:bg-zinc-700 transition-colors", STATUS_ICON_COLORS[item.status])}>
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
  );
}
