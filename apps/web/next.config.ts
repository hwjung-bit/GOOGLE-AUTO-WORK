import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@google-auto-work/db",
    "@google-auto-work/google-client",
    "@google-auto-work/ai-client",
  ],
};

export default nextConfig;
