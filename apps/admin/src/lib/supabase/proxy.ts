import { createServerClient } from "@supabase/ssr";
import type { Database } from "@bacheca/database";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_OPTIONS, getSupabaseConfig } from "./config";
import { isAdminCookie } from "./cookie-buffer";
import { sessionFetch } from "./session-fetch";

/** Refresh transport only. Every protected entrypoint verifies its own context. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const headers = new Headers({ "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" });
  // Actions handle their own cookies. Never delay logout behind a proxy refresh.
  if (["GET", "HEAD"].includes(request.method) && request.cookies.getAll().some(({ name }) => isAdminCookie(name))) {
    try {
      const { url, publishableKey } = getSupabaseConfig();
      const client = createServerClient<Database>(url, publishableKey, {
        cookieOptions: ADMIN_COOKIE_OPTIONS,
        global: { fetch: sessionFetch },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(updates, headersToSet) {
            // Accumulate batches: rebuilding NextResponse must not lose prior chunks.
            const previous = response.cookies.getAll();
            for (const { name, value } of updates) request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const cookie of previous) response.cookies.set(cookie);
            for (const { name, value, options } of updates) response.cookies.set(name, value, options);
            for (const [name, value] of Object.entries(headersToSet)) headers.set(name, value);
          },
        },
      });
      await client.auth.getClaims();
    } catch {
      // The page/action guard returns a controlled unavailable/anonymous state.
      // Never log raw Auth errors or grant access based on a proxy result.
    }
  }
  headers.forEach((value, name) => response.headers.set(name, value));
  return response;
}
