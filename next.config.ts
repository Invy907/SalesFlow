import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Optional invoice attachments are capped at 5 MB; base64 adds ~33%.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
