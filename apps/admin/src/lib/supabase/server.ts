import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@bacheca/database";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_OPTIONS, getSupabaseConfig } from "./config";
import { createAdminCookieBuffer } from "./cookie-buffer";
import { sessionFetch } from "./session-fetch";

/** Writable client for Server Actions/Route Handlers. Never use in rendering. */
export async function createClient() {
  const session = await createCookieSession();
  const client = await session.getClient();
  // This factory writes immediately; login must use the staged session instead.
  session.enableImmediateWrites();
  return client;
}

/** Read-only rendering transport. The proxy persists any refreshed cookies. */
export async function createReadClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: ADMIN_COOKIE_OPTIONS,
    global: { fetch: sessionFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      // RSC cannot write cookies. Refresh propagation is owned by src/proxy.ts.
      setAll() {},
    },
  });
}

/** Login/logout use the same SDK client throughout one operation. Config/client
 * creation is lazy so cookie cleanup still works when credentials are missing.
 */
export async function createCookieSession(fresh = false) {
  const store = await cookies();
  const buffer = createAdminCookieBuffer(store.getAll(), (name, value, options) => store.set(name, value, options), fresh);
  let immediate = false;
  let client: ReturnType<typeof createServerClient<Database>> | undefined;
  return {
    async getClient() {
      if (!client) {
        const { url, publishableKey } = getSupabaseConfig();
        client = createServerClient<Database>(url, publishableKey, {
          cookieOptions: ADMIN_COOKIE_OPTIONS,
          global: { fetch: sessionFetch },
          cookies: {
            getAll: buffer.getAll,
            setAll(updates) { buffer.setAll(updates); if (immediate) buffer.commit(); },
          },
        });
      }
      return client;
    },
    commit: buffer.commit,
    clear: buffer.clear,
    enableImmediateWrites() { immediate = true; buffer.commit(); },
  };
}

export async function clearAdminCookies() {
  const session = await createCookieSession();
  session.clear();
}
