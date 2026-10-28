import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { fileURLToPath } from "node:url";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: ["web", "admin"].map((app) =>
          fileURLToPath(new URL(`./apps/${app}/`, import.meta.url)),
        ),
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".local/**",
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
