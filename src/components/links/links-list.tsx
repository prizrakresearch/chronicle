"use client";

import { useState } from "react";
import { Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkRow } from "./link-row";
import { AddLinkDialog } from "./add-link-dialog";
import { useProjects } from "@/lib/store/projects-context";

interface LinksListProps {
  projectId: string;
}

export function LinksList({ projectId }: LinksListProps) {
  const { getLinks } = useProjects();
  const [addOpen, setAddOpen] = useState(false);
  const links = getLinks(projectId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-600 tabular-nums">
          {links.length} {links.length === 1 ? "link" : "links"}
        </p>
        <Button
          onClick={() => setAddOpen(true)}
          size="sm"
          className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 h-7 text-xs gap-1.5 rounded-lg"
        >
          <Plus className="h-3.5 w-3.5" />
          Add link
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
            <Link2 className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">No links yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            Store useful URLs — GitHub, docs, production, design files
          </p>
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
            className="mt-4 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 h-7 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add first link
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <LinkRow key={link.id} link={link} />
          ))}
        </div>
      )}

      <AddLinkDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}
