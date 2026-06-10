import type { Project, TimelineEvent, RoadmapItem, ProjectLink } from "@/types";

function d(offsetDays: number): Date {
  const date = new Date("2026-06-10T12:00:00Z");
  date.setDate(date.getDate() - offsetDays);
  return date;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj_chronicle",
    name: "Chronicle",
    description:
      "Personal project operating system — the memory layer for all my projects. Built with Next.js, Tailwind, and Neon PostgreSQL.",
    status: "active",
    logoUrl: null,
    createdAt: d(45),
    updatedAt: d(0),
    githubRepo: {
      id: "repo_chronicle",
      githubId: 1001,
      fullName: "adyothuria/chronicle",
      defaultBranch: "main",
      description: "Personal project OS",
      stars: 12,
      lastSyncedAt: d(0),
    },
    _count: { timelineEvents: 6, roadmapItems: 6 },
  },
  {
    id: "proj_portfolio",
    name: "Portfolio Site",
    description:
      "Personal portfolio with case studies and a blog. Next.js static site deployed on Vercel.",
    status: "paused",
    logoUrl: null,
    createdAt: d(120),
    updatedAt: d(14),
    githubRepo: null,
    _count: { timelineEvents: 4, roadmapItems: 4 },
  },
  {
    id: "proj_kvcli",
    name: "kv-cli",
    description:
      "Simple key-value store CLI written in Go. Archived in favor of Redis.",
    status: "archived",
    logoUrl: null,
    createdAt: d(300),
    updatedAt: d(90),
    githubRepo: {
      id: "repo_kvcli",
      githubId: 1002,
      fullName: "adyothuria/kv-cli",
      defaultBranch: "main",
      description: "Minimal KV store CLI in Go",
      stars: 143,
      lastSyncedAt: d(90),
    },
    _count: { timelineEvents: 5, roadmapItems: 5 },
  },
];

export const MOCK_TIMELINE_EVENTS: TimelineEvent[] = [
  // Chronicle
  {
    id: "evt_c1",
    projectId: "proj_chronicle",
    type: "milestone",
    title: "v0.1 frontend shipped",
    body: "Core UI complete: dashboard, project detail with all four tabs, and global search.",
    eventDate: d(0),
    metadata: null,
  },
  {
    id: "evt_c2",
    projectId: "proj_chronicle",
    type: "git_commit",
    title: "feat: add timeline date grouping",
    body: null,
    eventDate: d(1),
    metadata: {
      sha: "a3f91bc",
      url: "https://github.com/adyothuria/chronicle/commit/a3f91bc",
      authorName: "adyothuria",
    },
  },
  {
    id: "evt_c3",
    projectId: "proj_chronicle",
    type: "decision",
    title: "Use Drizzle ORM over Prisma",
    body: "Drizzle has better edge runtime compatibility and produces cleaner SQL. Prisma's query engine is too heavy for serverless.",
    eventDate: d(7),
    metadata: null,
  },
  {
    id: "evt_c4",
    projectId: "proj_chronicle",
    type: "git_commit",
    title: "chore: scaffold Next.js project",
    body: null,
    eventDate: d(10),
    metadata: {
      sha: "b8c2d4e",
      url: "https://github.com/adyothuria/chronicle/commit/b8c2d4e",
      authorName: "adyothuria",
    },
  },
  {
    id: "evt_c5",
    projectId: "proj_chronicle",
    type: "note",
    title: "Consider adding keyboard shortcuts",
    body: "J/K for navigation between projects, E to add event. Keep it lightweight — don't over-engineer.",
    eventDate: d(14),
    metadata: null,
  },
  {
    id: "evt_c6",
    projectId: "proj_chronicle",
    type: "maintenance",
    title: "Updated shadcn/ui to latest",
    body: "Resolved breaking changes in Dialog and Sheet components.",
    eventDate: d(21),
    metadata: null,
  },

  // Portfolio Site
  {
    id: "evt_p1",
    projectId: "proj_portfolio",
    type: "note",
    title: "Paused to focus on Chronicle",
    body: "Will revisit once Chronicle is in a stable state. Blog section is 80% complete.",
    eventDate: d(14),
    metadata: null,
  },
  {
    id: "evt_p2",
    projectId: "proj_portfolio",
    type: "maintenance",
    title: "Upgraded Next.js 13 → 14",
    body: "Migrated from Pages Router to App Router. Updated all API routes and image components.",
    eventDate: d(45),
    metadata: null,
  },
  {
    id: "evt_p3",
    projectId: "proj_portfolio",
    type: "milestone",
    title: "First version went live",
    body: "Portfolio is now live at adyothuria.com with three case studies.",
    eventDate: d(90),
    metadata: null,
  },
  {
    id: "evt_p4",
    projectId: "proj_portfolio",
    type: "decision",
    title: "Chose Framer Motion for animations",
    body: "After testing CSS transitions vs Framer Motion, Framer gave much smoother page transitions without extra JS overhead.",
    eventDate: d(100),
    metadata: null,
  },

  // kv-cli
  {
    id: "evt_k1",
    projectId: "proj_kvcli",
    type: "decision",
    title: "Archived — switching to Redis",
    body: "The maintenance cost of a custom KV implementation isn't worth it now that we're using Redis in prod.",
    eventDate: d(90),
    metadata: null,
  },
  {
    id: "evt_k2",
    projectId: "proj_kvcli",
    type: "milestone",
    title: "Hit 100 GitHub stars",
    body: "Trending on GitHub Go section for one day.",
    eventDate: d(150),
    metadata: null,
  },
  {
    id: "evt_k3",
    projectId: "proj_kvcli",
    type: "maintenance",
    title: "Added Windows build support",
    body: "CI matrix now builds for linux/amd64, darwin/arm64, and windows/amd64.",
    eventDate: d(200),
    metadata: null,
  },
  {
    id: "evt_k4",
    projectId: "proj_kvcli",
    type: "git_commit",
    title: "fix: handle concurrent write race condition",
    body: null,
    eventDate: d(210),
    metadata: {
      sha: "f1e2d3c",
      url: "https://github.com/adyothuria/kv-cli/commit/f1e2d3c",
      authorName: "adyothuria",
    },
  },
  {
    id: "evt_k5",
    projectId: "proj_kvcli",
    type: "note",
    title: "Benchmark: 50k ops/sec on M1",
    body: "Faster than expected. Pure Go with no CGO dependencies.",
    eventDate: d(250),
    metadata: null,
  },
];

export const MOCK_ROADMAP_ITEMS: RoadmapItem[] = [
  // Chronicle
  { id: "rd_c1", projectId: "proj_chronicle", title: "Project CRUD", description: null, status: "completed", sortOrder: 0 },
  { id: "rd_c2", projectId: "proj_chronicle", title: "Timeline view with date grouping", description: null, status: "completed", sortOrder: 1 },
  { id: "rd_c3", projectId: "proj_chronicle", title: "Roadmap view", description: null, status: "completed", sortOrder: 2 },
  { id: "rd_c4", projectId: "proj_chronicle", title: "GitHub webhook integration", description: "Handle push events, auto-create timeline entries", status: "in_progress", sortOrder: 0 },
  { id: "rd_c5", projectId: "proj_chronicle", title: "Cmd+K global search", description: null, status: "planned", sortOrder: 0 },
  { id: "rd_c6", projectId: "proj_chronicle", title: "Export timeline to Markdown", description: "One-click export of project history", status: "planned", sortOrder: 1 },

  // Portfolio
  { id: "rd_p1", projectId: "proj_portfolio", title: "Initial launch", description: null, status: "completed", sortOrder: 0 },
  { id: "rd_p2", projectId: "proj_portfolio", title: "Contact form with email", description: null, status: "completed", sortOrder: 1 },
  { id: "rd_p3", projectId: "proj_portfolio", title: "Blog section", description: "MDX-powered, with syntax highlighting", status: "in_progress", sortOrder: 0 },
  { id: "rd_p4", projectId: "proj_portfolio", title: "Dark mode toggle", description: null, status: "planned", sortOrder: 0 },

  // kv-cli
  { id: "rd_k1", projectId: "proj_kvcli", title: "Basic get/set/del commands", description: null, status: "completed", sortOrder: 0 },
  { id: "rd_k2", projectId: "proj_kvcli", title: "Persistent storage (BoltDB)", description: null, status: "completed", sortOrder: 1 },
  { id: "rd_k3", projectId: "proj_kvcli", title: "TTL support for keys", description: null, status: "completed", sortOrder: 2 },
  { id: "rd_k4", projectId: "proj_kvcli", title: "Binary releases via GitHub Actions", description: null, status: "completed", sortOrder: 3 },
  { id: "rd_k5", projectId: "proj_kvcli", title: "JSON value support", description: null, status: "completed", sortOrder: 4 },
];

export const MOCK_LINKS: ProjectLink[] = [
  // Chronicle
  { id: "lnk_c1", projectId: "proj_chronicle", title: "GitHub Repository", url: "https://github.com/adyothuria/chronicle", type: "github" },
  { id: "lnk_c2", projectId: "proj_chronicle", title: "Production", url: "https://chronicle.vercel.app", type: "production" },

  // Portfolio
  { id: "lnk_p1", projectId: "proj_portfolio", title: "Live Site", url: "https://adyothuria.com", type: "production" },
  { id: "lnk_p2", projectId: "proj_portfolio", title: "Figma Design", url: "https://figma.com/file/example", type: "design" },
  { id: "lnk_p3", projectId: "proj_portfolio", title: "Content Docs", url: "https://notion.so/portfolio-content", type: "docs" },

  // kv-cli
  { id: "lnk_k1", projectId: "proj_kvcli", title: "GitHub Repository", url: "https://github.com/adyothuria/kv-cli", type: "github" },
  { id: "lnk_k2", projectId: "proj_kvcli", title: "README / Docs", url: "https://github.com/adyothuria/kv-cli#readme", type: "docs" },
];
