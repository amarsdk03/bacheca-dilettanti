import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
  transpilePackages: ["@bacheca/database"],
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Cache-Control", value: "private, no-cache, no-store, must-revalidate, max-age=0" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    }];
  },
};

export default nextConfig;
