"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@bacheca/database";
import { ADMIN_COOKIE_OPTIONS, getSupabaseConfig } from "./config";

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: ADMIN_COOKIE_OPTIONS,
  });
}
