"use client";

import { use, useState, useEffect, useRef } from "react";
import { Download, LayoutGrid, Paperclip,
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
} from "lucide-react";
import {
  getPublicProject,
  getPublicRepoBranches,
  getPublicRepoContributions,
  getPublicRepoCommits,
} from "@/lib/db/public";
import type { PublicProjectData } from "@/lib/db/public";
import { ReadOnlyProjectsProvider } from "@/lib/store/readonly-project-context";
import { OverviewPanel } from "@/components/overview/overview-panel";
import { FilesView } from "@/components/files/files-view";
import { DitherBackground } from "@/components/layout/dither-background";
import { SplashScreen } from "@/components/layout/splash-screen";
import { getAvatarColor } from "@/components/projects/project-card";
import { cn } from "@/lib/utils";
import type { RepoBranch, RepoCommit } from "@/lib/db/github";

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_SPLASH_MS = 2500;

// ── Avatar (same pool as project-row) ────────────────────────────────────────
const PLACEHOLDER_ICONS = [
  Rocket, Globe, Terminal, Database, Layers, Cpu,
  Compass, Flame, Code2, Boxes, Radio, Wand2, Satellite, FlaskConical, Binary,
];
function getProjectIcon(name: string) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % PLACEHOLDER_ICONS.length;
  return PLACEHOLDER_ICONS[idx];
}
function ProjectAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) return <img src={logoUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  const Icon = getProjectIcon(name);
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 select-none", getAvatarColor(name))}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "overview" | "files";
const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Overview", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { value: "files",    label: "Files",    icon: <Paperclip  className="h-3.5 w-3.5" /> },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Phase: "splash" → show splash + load in bg; "ready" → show content
  const [phase, setPhase]   = useState<"splash" | "ready">("splash");
  const [tab,   setTab]     = useState<Tab>("overview");

  // Project data
  const [data,  setData]  = useState<PublicProjectData | null | "loading">("loading");

  // Pre-loaded GitHub data
  const [initBranches, setInitBranches] = useState<RepoBranch[] | undefined>(undefined);
  const [initContribs, setInitContribs] = useState<{ date: string; count: number }[] | undefined>(undefined);
  const [initCommits,  setInitCommits]  = useState<RepoCommit[] | undefined>(undefined);

  // Track when both data loaded AND min splash time have elapsed
  const dataReadyRef   = useRef(false);
  const splashDoneRef  = useRef(false);
  const transitionRef  = useRef<(() => void) | null>(null);

  function maybeTransition() {
    if (dataReadyRef.current && splashDoneRef.current) {
      setPhase("ready");
    }
  }

  // Load all data in parallel as soon as the page mounts
  useEffect(() => {
    const startMs = Date.now();

    // Minimum splash hold timer
    const minTimer = setTimeout(() => {
      splashDoneRef.current = true;
      maybeTransition();
    }, MIN_SPLASH_MS);

    async function load() {
      // Fetch project data + GitHub data all at once
      const [projectData, branches, contribs] = await Promise.all([
        getPublicProject(id),
        getPublicRepoBranches(id),
        getPublicRepoContributions(id),
      ]);

      setData(projectData);

      if (branches.length > 0) {
        setInitBranches(branches);
        setInitContribs(contribs);

        // Fetch commits for default branch
        const defaultBranch = projectData?.project.githubRepo?.defaultBranch ?? "main";
        try {
          const commits = await getPublicRepoCommits(id, defaultBranch);
          setInitCommits(commits);
        } catch {
          // non-fatal — CommitsPanel will fetch on its own
        }
      }

      dataReadyRef.current = true;
      maybeTransition();
    }

    // Store the transition fn so the splash's onDone can call it
    transitionRef.current = () => {
      splashDoneRef.current = true;
      maybeTransition();
    };

    load().catch(err => {
      console.error("[share] load error:", err);
      dataReadyRef.current = true;
      maybeTransition();
    });

    return () => clearTimeout(minTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Update page title
  useEffect(() => {
    if (data && data !== "loading") {
      document.title = `${data.project.name} — Chronicle`;
    }
    return () => { document.title = "Chronicle"; };
  }, [data]);

  // ── Splash phase ──────────────────────────────────────────────────────────
  if (phase === "splash") {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        {/* Static dither background — waveSpeed=0 means no animation */}
        <DitherBackground waveSpeed={0} />
        {/* Dark overlay to keep text legible */}
        <div className="absolute inset-0 bg-black/80 pointer-events-none" />
        {/* Chronicle-only splash (anonymous skips "Hi, Name") */}
        <SplashScreen
          anonymous
          onDone={() => {
            splashDoneRef.current = true;
            maybeTransition();
          }}
        />
      </div>
    );
  }

  // ── Error / not-found ─────────────────────────────────────────────────────
  if (!data || data === "loading") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
        <p className="text-white/40 text-sm">This project doesn't exist or is no longer shared.</p>
        <span className="text-xs text-white/20">Chronicle</span>
      </div>
    );
  }

  const { project, roadmapItems, timelineEvents, links, projectFiles } = data;

  function handleDownload() {
    if (!project.githubRepo) return;
    const { fullName, defaultBranch } = project.githubRepo;
    window.open(
      `https://github.com/${fullName}/archive/refs/heads/${defaultBranch}.zip`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <ReadOnlyProjectsProvider
      project={project}
      roadmapItems={roadmapItems}
      timelineEvents={timelineEvents}
      links={links}
      projectFiles={projectFiles}
    >
      <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">

        {/* Static dither background — persists on content page too */}
        <div className="fixed inset-0 pointer-events-none">
          <DitherBackground waveSpeed={0} />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        {/* ── Topbar ── */}
        <div className="shrink-0 py-5 px-6 flex items-center z-20 relative">

          {/* Left: identity pill */}
          <div className="flex items-center gap-3 pl-2 pr-5 h-11 rounded-full border border-white/10 shrink-0">
            <ProjectAvatar name={project.name} logoUrl={project.logoUrl} />
            <h1 className="text-sm font-semibold text-white">{project.name}</h1>
          </div>

          {/* Centre: wordmark */}
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
            <span className="text-sm font-semibold text-white/80">Chronicle</span>
          </div>

          {/* Right: Download (only if repo linked) */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {project.githubRepo && (
              <button
                onClick={handleDownload}
                title={`Download ${project.githubRepo.defaultBranch}.zip`}
                className="h-11 px-5 text-sm font-semibold rounded-full bg-transparent text-violet-400/75 border border-violet-400/75 hover:bg-violet-400/10 hover:-translate-y-px active:translate-y-0 flex items-center gap-2 transition duration-200 ease-in-out"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            )}
          </div>
        </div>

        {/* ── Tab strip ── */}
        <div className="shrink-0 px-6 pb-4 flex items-center gap-1.5 z-20 relative">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "group h-11 pl-1 pr-4 rounded-full text-sm font-medium border flex items-center gap-2.5 transition duration-200 ease-in-out",
                tab === t.value
                  ? "text-primary/75 border-transparent"
                  : "text-white/50 border-white/10 hover:border-transparent hover:text-primary/75"
              )}
            >
              <span className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition duration-200 ease-in-out group-hover:scale-110",
                tab === t.value ? "bg-primary/75" : "bg-zinc-800 group-hover:bg-primary/75"
              )}>
                <span className={cn("transition duration-200 ease-in-out group-hover:text-black", tab === t.value && "text-black")}>
                  {t.icon}
                </span>
              </span>
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            <span className="text-[11px] text-white/30 font-medium">Shared view</span>
          </div>
        </div>

        {/* ── Content ── */}
        <div className={cn("flex-1 px-6 py-2 min-h-0 z-10 relative", tab === "overview" || tab === "files" ? "overflow-hidden" : "overflow-y-auto")}>
          {tab === "overview" && <OverviewPanel project={project} onOpenNotes={() => {}} />}
          {tab === "files"    && (
            <FilesView
              projectId={project.id}
              project={project}
              initialBranches={initBranches}
              initialContribs={initContribs}
              initialCommits={initCommits}
            />
          )}
        </div>

      </div>
    </ReadOnlyProjectsProvider>
  );
}
