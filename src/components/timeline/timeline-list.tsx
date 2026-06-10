"use client";

import { useState } from "react";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineDateGroup } from "./timeline-date-group";
import { AddEventSheet } from "./add-event-sheet";
import { groupEventsByDate } from "@/lib/utils/format";
import { useProjects } from "@/lib/store/projects-context";

interface TimelineListProps {
  projectId: string;
}

export function TimelineList({ projectId }: TimelineListProps) {
  const { getTimeline } = useProjects();
  const [sheetOpen, setSheetOpen] = useState(false);
  const events = getTimeline(projectId);
  const grouped = groupEventsByDate(events);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-medium text-zinc-600 tabular-nums">
          {events.length} {events.length === 1 ? "event" : "events"}
        </p>
        <Button
          onClick={() => setSheetOpen(true)}
          size="sm"
          className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 h-7 text-xs gap-1.5 rounded-lg"
        >
          <Plus className="h-3.5 w-3.5" />
          Add event
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
            <Clock className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">No events yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            Record notes, decisions, and milestones
          </p>
          <Button
            onClick={() => setSheetOpen(true)}
            size="sm"
            className="mt-4 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 h-7 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add first event
          </Button>
        </div>
      ) : (
        <div>
          {grouped.map(([date, evts], groupIdx) => (
            <TimelineDateGroup
              key={date}
              date={date}
              events={evts}
              isLastGroup={groupIdx === grouped.length - 1}
            />
          ))}
        </div>
      )}

      <AddEventSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
