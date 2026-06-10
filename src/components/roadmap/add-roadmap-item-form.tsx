"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { RoadmapStatus } from "@/types";

interface AddRoadmapItemFormProps {
  projectId: string;
  status: RoadmapStatus;
  sortOrderBase: number;
}

export function AddRoadmapItemForm({ projectId, status, sortOrderBase }: AddRoadmapItemFormProps) {
  const { addRoadmapItem } = useProjects();
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function activate() {
    setActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function save() {
    const v = value.trim();
    if (v) {
      addRoadmapItem({
        projectId,
        title: v,
        description: null,
        status,
        sortOrder: sortOrderBase,
      });
    }
    setValue("");
    setActive(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") {
      setValue("");
      setActive(false);
    }
  }

  if (!active) {
    return (
      <button
        onClick={activate}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 rounded-md transition-colors duration-150"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </button>
    );
  }

  return (
    <div className="px-2 py-1.5">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder="New item…"
        className="w-full bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 rounded-md px-2 py-1.5 outline-none border border-zinc-700 focus:border-zinc-600"
      />
    </div>
  );
}
