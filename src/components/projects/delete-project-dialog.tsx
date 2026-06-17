"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DeleteProjectDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  projectName:  string;
  onConfirm:    () => void;
}

export function DeleteProjectDialog({ open, onOpenChange, projectName, onConfirm }: DeleteProjectDialogProps) {
  const [nameInput,   setNameInput]   = useState("");
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => {
    if (!open) { setNameInput(""); setDeleteInput(""); }
  }, [open]);

  const valid = nameInput === projectName && deleteInput.toLowerCase() === "delete";

  function handleConfirm() {
    if (!valid) return;
    onConfirm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2.5 text-red-400/90">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Delete project
        </DialogTitle>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400/80 leading-relaxed">
          This action is permanent. All files, links, notes, roadmap items, and timeline events will be deleted and <strong className="text-red-400">cannot be recovered</strong>.
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-white/40">
              Type the project name <span className="text-white/60 font-medium">{projectName}</span> to confirm
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleConfirm(); }}
              placeholder={projectName}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-white/25 transition duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-white/40">
              Type <span className="text-white/60 font-medium">delete</span> to confirm
            </label>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleConfirm(); }}
              placeholder="delete"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-white/25 transition duration-150"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-full border border-white/10 text-white/40 text-sm font-semibold hover:text-white/70 hover:border-white/20 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!valid}
            className={cn(
              "flex-1 h-11 rounded-full text-sm font-semibold transition duration-200",
              "border border-red-500/40 text-red-400/80 hover:bg-red-500/10",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
          >
            Delete project
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
