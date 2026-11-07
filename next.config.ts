import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.e2b.app", "*.vercel.app", "ee-platform-jade.vercel.app"],
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
