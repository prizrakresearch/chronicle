import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Clerk JS bundle — served from Clerk's npm CDN
      {
        source: "/_clerk/npm/:path*",
        destination: "https://npm.clerk.dev/:path*",
      },
      // Clerk Frontend API — all auth calls
      {
        source: "/_clerk/:path*",
        destination: "https://clerk.chornicle.dapdf.com/:path*",
      },
    ];
  },
};

export default nextConfig;
