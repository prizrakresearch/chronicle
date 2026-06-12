"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Plus, LayoutGrid, GitBranch, Paperclip, Link2, Share2, Download, NotebookPen,
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
} from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { getAvatarColor } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { OverviewPanel } from "@/components/overview/overview-panel";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { FilesView } from "@/components/files/files-view";
import { NotesView } from "@/components/notes/notes-view";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

// ── Placeholder icon pool (same as project-row) ──────────────────────────────
const PLACEHOLDER_ICONS = [
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
];
function getProjectIcon(name: string) {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % PLACEHOLDER_ICONS.length;
  return PLACEHOLDER_ICONS[idx];
}

function TopbarAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  const Icon = getProjectIcon(name);
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 select-none", getAvatarColor(name))}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type TabValue = "overview" | "roadmap" | "files" | "notes";

const TABS: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Overview", icon: <LayoutGrid  className="h-3.5 w-3.5" /> },
  { value: "roadmap",  label: "Roadmap",  icon: <GitBranch   className="h-3.5 w-3.5" /> },
  { value: "files",    label: "Files",    icon: <Paperclip   className="h-3.5 w-3.5" /> },
  { value: "notes",    label: "Notes",    icon: <NotebookPen className="h-3.5 w-3.5" /> },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject, updateProject, isReadOnly } = useProjects();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabValue>(
    (searchParams.get("tab") as TabValue) ?? "overview"
  );
  const [createOpen, setCreateOpen] = useState(false);

  const project = getProject(id);

  // Dynamic tab title: "Chronicle - Project Name"
  useEffect(() => {
    if (project) {
      document.title = `Chronicle - ${project.name}`;
    }
    return () => { document.title = "Chronicle"; };
  }, [project?.name]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm text-white/40">Project not found.</p>
        <Link href="/" className="mt-3 text-xs text-white/25 hover:text-white/60 transition-colors duration-200">
          ← Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── Topbar ── */}
      <div className="shrink-0 py-5 px-6 flex items-center z-20 relative">

        {/* Left: Back button + project identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/"
            className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 gap-2 transition duration-200 ease-in-out shrink-0 flex items-center"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>

          {/* Project identity pill */}
          <div className="flex items-center gap-6 pl-1 pr-6 h-11 rounded-full border border-white/10 bg-transparent shrink-0">
            <TopbarAvatar name={project.name} logoUrl={project.logoUrl} />
            <h1 className="text-sm font-semibold text-white">{project.name}</h1>
            <span className="text-xs text-white/45 capitalize">{project.status}</span>
          </div>
        </div>

        {/* Centre: Chronicle wordmark */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-sm font-semibold text-white/80">Chronicle</span>
        </div>

        {/* Right: New project (owner) + UserButton */}
        <div className="flex items-center gap-2 shrink-0">
          {!isReadOnly && (
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-primary/75 border border-primary/75 hover:bg-primary/10 hover:-translate-y-px active:translate-y-0 gap-2 transition duration-200 ease-in-out"
            >
              <Plus className="h-3.5 w-3.5" />
              New project
            </Button>
          )}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
                userButtonPopoverCard: "bg-black border border-white/10",
                userButtonPopoverActionButton: "text-white/70 hover:text-white hover:bg-white/[0.06]",
                userButtonPopoverActionButtonText: "text-white/70",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </div>

      {/* ── Tab pills + status + action buttons ── */}
      <div className="shrink-0 px-6 pb-4 flex items-center">

        {/* Left: Tab pills */}
        <div className="flex items-center gap-1.5 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "group h-11 pl-1 pr-4 rounded-full text-sm font-medium border flex items-center gap-2.5 transition duration-200 ease-in-out",
                activeTab === tab.value
                  ? "text-primary/75 border-transparent"
                  : "text-white/50 border-white/10 hover:border-transparent hover:text-primary/75"
              )}
            >
              <span className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition duration-200 ease-in-out group-hover:scale-110",
                activeTab === tab.value ? "bg-primary/75" : "bg-zinc-800 group-hover:bg-primary/75"
              )}>
                <span className={cn("transition duration-200 ease-in-out group-hover:text-black", activeTab === tab.value && "text-black")}>
                  {tab.icon}
                </span>
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Centre: Status — editable for owner, static badge for guests */}
        {isReadOnly ? (
          <span className={cn(
            "h-11 px-5 text-sm font-semibold capitalize flex items-center rounded-full border border-white/10",
            project.status === "active"   && "text-primary",
            project.status === "paused"   && "text-blue-400",
            project.status === "archived" && "text-white/35",
          )}>
            {project.status}
          </span>
        ) : (
          <Select
            value={project.status}
            onValueChange={(v) => updateProject(project.id, { status: v as ProjectStatus })}
          >
            <SelectTrigger className="!h-11 px-5 !rounded-full !bg-transparent !border-white/10 hover:!border-white/20 text-sm font-semibold hover:-translate-y-px active:translate-y-0 transition duration-200 ease-in-out !w-auto focus-visible:!ring-0 focus-visible:!border-white/20 [&>svg]:text-white/30 [&>svg]:size-3.5">
              <span className={cn(
                "capitalize",
                project.status === "active"   && "text-primary",
                project.status === "paused"   && "text-blue-400",
                project.status === "archived" && "text-white/35",
              )}>
                {project.status}
              </span>
            </SelectTrigger>
            <SelectContent
              align="center"
              alignItemWithTrigger={false}
              className="!rounded-[28px] !bg-black/95 !border !border-white/10 !p-2 !shadow-none !min-w-0"
            >
              <SelectItem value="active"   className="!rounded-full !h-11 !px-5 !py-0 !mb-1.5 text-sm !font-semibold !cursor-pointer !justify-center [&>*:first-child]:!flex-none !border !border-primary/75  !text-primary/75  [&_*]:!text-primary/75  data-[highlighted]:!bg-primary/10  data-[selected]:!bg-primary/90  data-[selected]:!border-primary  data-[selected]:!text-black  [&[data-selected]_*]:!text-black">Active</SelectItem>
              <SelectItem value="paused"   className="!rounded-full !h-11 !px-5 !py-0 !mb-1.5 text-sm !font-semibold !cursor-pointer !justify-center [&>*:first-child]:!flex-none !border !border-blue-400/75 !text-blue-400/75 [&_*]:!text-blue-400/75 data-[highlighted]:!bg-blue-400/10  data-[selected]:!bg-blue-400/90 data-[selected]:!border-blue-400  data-[selected]:!text-black  [&[data-selected]_*]:!text-black">Paused</SelectItem>
              <SelectItem value="archived" className="!rounded-full !h-11 !px-5 !py-0          text-sm !font-semibold !cursor-pointer !justify-center [&>*:first-child]:!flex-none !border !border-white/15  !text-white/40  [&_*]:!text-white/40  data-[highlighted]:!bg-white/5     data-[selected]:!bg-white/40    data-[selected]:!border-white/40  data-[selected]:!text-black    [&[data-selected]_*]:!text-black">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Right: Action buttons — violet complement, same shape as New project */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {[
            { label: "Copy link", icon: <Link2    className="h-3.5 w-3.5" />, onClick: () => { if (project.githubRepo) navigator.clipboard.writeText(`https://github.com/${project.githubRepo.fullName}`); } },
            { label: "Share",     icon: <Share2   className="h-3.5 w-3.5" />, onClick: () => navigator.share?.({ title: project.name, url: window.location.href }) },
            { label: "Download",  icon: <Download className="h-3.5 w-3.5" />, onClick: () => {} },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-violet-400/75 border border-violet-400/75 hover:bg-violet-400/10 hover:-translate-y-px active:translate-y-0 flex items-center gap-2 transition duration-200 ease-in-out"
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── Tab content ── */}
      <div className={cn("flex-1 px-6 py-2 min-h-0", activeTab === "notes" || activeTab === "overview" || activeTab === "files" ? "overflow-hidden" : "overflow-y-auto")}>
        {activeTab === "overview"  && <OverviewPanel project={project} onOpenNotes={() => setActiveTab("notes")} />}
        {activeTab === "roadmap"   && <RoadmapBoard  projectId={project.id} />}
        {activeTab === "files"     && <FilesView     projectId={project.id} project={project} />}
        {activeTab === "notes"     && <NotesView     project={project} />}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
