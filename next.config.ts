import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/_clerk/:path*",
        destination: "https://clerk.chornicle.dapdf.com/:path*",
      },
    ];
  },
};

export default nextConfig;
