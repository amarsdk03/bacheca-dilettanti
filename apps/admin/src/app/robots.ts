import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Allow crawlers to read the noindex directives, including on the future login.
  return { rules: { userAgent: "*", allow: "/" } };
}
