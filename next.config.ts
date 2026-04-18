import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/workspaces", destination: "/clients", permanent: true },
      { source: "/workspaces/:path*", destination: "/clients/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
