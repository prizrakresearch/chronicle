import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/_clerk/:path*",
        destination: "https://clerk.chroniclepl.vercel.app/:path*",
      },
    ];
  },
};

export default nextConfig;
