import React from "react";
import { createRequire } from "node:module";
import { adminServerLoader } from "./admin-server-loader.mjs";
const require = createRequire(import.meta.url);
export function homeUiLoader(dependencies = {}) {
  const deps = { react: React, "react/jsx-runtime": require("react/jsx-runtime"),
    "next/link": { __esModule: true, default: ({ href, children, ...props }) => { delete props.prefetch; return React.createElement("a", { href, ...props }, children); } },
    "next/navigation": { redirect(href) { throw new Error("REDIRECT:" + href); } }, ...dependencies };
  for (const name of ["@base-ui/react/button", "@base-ui/react/toggle", "@base-ui/react/toggle-group", "@base-ui/react/merge-props", "@base-ui/react/use-render", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"]) if (!(name in deps)) deps[name] = require(name);
  return adminServerLoader({ dependencies: deps });
}
/** Resolve async RSC wrappers explicitly; React DOM alone is not an RSC runtime. */
export async function resolveHomeServerTree(node) {
  if (Array.isArray(node)) return Promise.all(node.map(resolveHomeServerTree));
  if (!React.isValidElement(node)) return node;
  if (node.type.constructor?.name === "AsyncFunction") return resolveHomeServerTree(await node.type(node.props));
  if (!("children" in node.props)) return node;
  return React.cloneElement(node, undefined, await resolveHomeServerTree(node.props.children));
}
