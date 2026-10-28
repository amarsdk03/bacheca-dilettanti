import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export function proxy(request: NextRequest) { return updateSession(request); }

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|(?:favicon\\.ico|robots\\.txt|banner\\.png|logo\\.png|manifest\\.json|favicon-(?:16x16|32x32)\\.png|apple-touch-icon\\.png|android-chrome-(?:192x192|512x512)\\.png)$).*)",
  ],
};
