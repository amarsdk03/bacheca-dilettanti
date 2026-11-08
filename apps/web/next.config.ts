import type {NextConfig} from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
	outputFileTracingRoot: monorepoRoot,
	transpilePackages: ["@bacheca/database", "@bacheca/announcements"],
	turbopack: {
		root: monorepoRoot,
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "6mb",
		},
	},
};

export default nextConfig;
