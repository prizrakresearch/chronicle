"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/lib/store/projects-context";
import { LINK_TYPE_LABELS } from "@/lib/utils/constants";
import type { LinkType } from "@/types";

const LINK_TYPES: LinkType[] = ["github", "docs", "production", "design", "other"];

interface AddLinkDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLinkDialog({ projectId, open, onOpenChange }: AddLinkDialogProps) {
  const { addLink } = useProjects();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<LinkType>("other");
  const [loading, setLoading] = useState(false);

  function reset() {
    setTitle("");
    setUrl("");
    setType("other");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 150));
    addLink({ projectId, title: title.trim(), url: url.trim(), type });
    setLoading(false);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as LinkType)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {LINK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LINK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-title" className="text-zinc-300 text-xs">
              Label
            </Label>
            <Input
              id="link-title"
              placeholder="e.g. GitHub Repository"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-url" className="text-zinc-300 text-xs">
              URL
            </Label>
            <Input
              id="link-url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
              type="url"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
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
              disabled={!title.trim() || !url.trim() || loading}
              className="bg-zinc-100 text-zinc-900 hover:bg-white"
            >
              {loading ? "Adding…" : "Add link"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
