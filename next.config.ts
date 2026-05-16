import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*", "mastra", "pdf-parse", "pg"],
};

export default nextConfig;
