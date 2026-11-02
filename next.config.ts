import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.e2b.app"],
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
