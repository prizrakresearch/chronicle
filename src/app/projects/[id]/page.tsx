"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { getAvatarColor, getInitials } from "@/components/projects/project-card";
import { OverviewPanel } from "@/components/overview/overview-panel";
import { TimelineList } from "@/components/timeline/timeline-list";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { LinksList } from "@/components/links/links-list";
import { useProjects } from "@/lib/store/projects-context";
import { cn } from "@/lib/utils";

type TabValue = "overview" | "timeline" | "roadmap" | "files";

const TABS: { value: TabValue; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "roadmap", label: "Roadmap" },
  { value: "files", label: "Files" },
];

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getProject } = useProjects();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabValue>(
    (searchParams.get("tab") as TabValue) ?? "overview"
  );

  const project = getProject(id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 text-center">
        <p className="text-sm text-zinc-400">Project not found.</p>
        <Link href="/" className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 h-14 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm px-6 flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-300 transition-colors rounded-md p-1 -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="w-px h-4 bg-zinc-800" />

        {/* Mini avatar */}
        <div className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 select-none",
          getAvatarColor(project.name)
        )}>
          {getInitials(project.name)}
        </div>

        <h1 className="text-sm font-semibold text-zinc-100 truncate">{project.name}</h1>
        <ProjectStatusBadge status={project.status} size="sm" />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="flex-1 flex flex-col"
      >
        <div className="border-b border-zinc-800/80 px-6 shrink-0">
          <TabsList className="bg-transparent h-11 p-0 gap-0 -mb-px">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 data-[state=active]:text-zinc-100 data-[state=active]:bg-transparent text-zinc-500 hover:text-zinc-300 text-sm px-4 h-11 font-medium transition-colors bg-transparent"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 px-6 py-6">
          <TabsContent value="overview" className="mt-0 outline-none">
            <OverviewPanel project={project} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-0 outline-none">
            <TimelineList projectId={project.id} />
          </TabsContent>
          <TabsContent value="roadmap" className="mt-0 outline-none">
            <RoadmapBoard projectId={project.id} />
          </TabsContent>
          <TabsContent value="files" className="mt-0 outline-none">
            <LinksList projectId={project.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
