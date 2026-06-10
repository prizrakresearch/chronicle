"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { FolderOpen, Clock, Map } from "lucide-react";
import { useProjects } from "@/lib/store/projects-context";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { projects, timelineEvents, roadmapItems } = useProjects();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, events, roadmap…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Projects">
          {projects.slice(0, 5).map((p) => (
            <CommandItem
              key={p.id}
              onSelect={() => navigate(`/projects/${p.id}`)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <FolderOpen className="h-4 w-4 text-zinc-400 shrink-0" />
              <span className="flex-1 text-sm">{p.name}</span>
              <ProjectStatusBadge status={p.status} size="sm" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Timeline">
          {timelineEvents.slice(0, 5).map((e) => {
            const project = projects.find((p) => p.id === e.projectId);
            return (
              <CommandItem
                key={e.id}
                onSelect={() => navigate(`/projects/${e.projectId}?tab=timeline`)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{e.title}</p>
                  {project && (
                    <p className="text-xs text-zinc-500 truncate">{project.name}</p>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Roadmap">
          {roadmapItems.slice(0, 5).map((r) => {
            const project = projects.find((p) => p.id === r.projectId);
            return (
              <CommandItem
                key={r.id}
                onSelect={() => navigate(`/projects/${r.projectId}?tab=roadmap`)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Map className="h-4 w-4 text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{r.title}</p>
                  {project && (
                    <p className="text-xs text-zinc-500 truncate">{project.name}</p>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
