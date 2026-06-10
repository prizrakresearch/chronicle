"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjects } from "@/lib/store/projects-context";
import { EVENT_TYPE_LABELS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import type { EventType } from "@/types";

const EVENT_TYPES: EventType[] = ["note", "decision", "maintenance", "milestone"];

interface AddEventSheetProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEventSheet({ projectId, open, onOpenChange }: AddEventSheetProps) {
  const { addTimelineEvent } = useProjects();
  const [type, setType] = useState<EventType>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setType("note");
    setTitle("");
    setBody("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 200));
    addTimelineEvent({
      projectId,
      type,
      title: title.trim(),
      body: body.trim() || null,
      eventDate: new Date(),
      metadata: null,
    });
    setLoading(false);
    reset();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="bg-zinc-900 border-zinc-800 w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-zinc-100">Add timeline event</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-xs">Type</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 border",
                    type === t
                      ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                      : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
                  )}
                >
                  {EVENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-zinc-300 text-xs">
              Title
            </Label>
            <Input
              id="event-title"
              placeholder={
                type === "note"
                  ? "What's worth remembering?"
                  : type === "decision"
                  ? "What was decided?"
                  : type === "maintenance"
                  ? "What was maintained?"
                  : "What milestone was reached?"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-body" className="text-zinc-300 text-xs">
              Details{" "}
              <span className="text-zinc-500">(optional)</span>
            </Label>
            <Textarea
              id="event-body"
              placeholder="Add context, rationale, or notes…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { reset(); onOpenChange(false); }}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || loading}
              className="bg-zinc-100 text-zinc-900 hover:bg-white"
            >
              {loading ? "Adding…" : "Add event"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
