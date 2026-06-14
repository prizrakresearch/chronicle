import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("./package.json") as { version: string };

// On Vercel: VERCEL_GIT_COMMIT_SHA is injected automatically.
// Locally: fall back to running git directly.
function getGitSha(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("child_process")
      .execSync("git rev-parse --short HEAD")
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const sha = getGitSha();

const nextConfig: NextConfig = {
  env: {
    // e.g. "0.3.3-a1b2c3d" — version from package.json + commit SHA
    NEXT_PUBLIC_APP_VERSION: sha ? `${pkg.version}-${sha}` : pkg.version,
  },
};

export default nextConfig;
