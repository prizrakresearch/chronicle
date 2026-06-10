import { TimelineEvent } from "./timeline-event";
import type { TimelineEvent as TimelineEventType } from "@/types";

interface TimelineDateGroupProps {
  date: string;
  events: TimelineEventType[];
  isLastGroup: boolean;
}

export function TimelineDateGroup({ date, events, isLastGroup }: TimelineDateGroupProps) {
  return (
    <div>
      <div className="sticky top-0 z-[1] py-2 bg-zinc-950/90 backdrop-blur-sm mb-4">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          {date}
        </span>
      </div>
      <div className="ml-0">
        {events.map((event, idx) => (
          <TimelineEvent
            key={event.id}
            event={event}
            isLast={isLastGroup && idx === events.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
