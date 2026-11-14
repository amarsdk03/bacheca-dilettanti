import "server-only";
import {createClient} from "@supabase/supabase-js";
import type {Database} from "@bacheca/database";
import {sessionFetch} from "./session-fetch";

/** Only call after verifying the Admin session. Reuses Web's public projections;
 * owner-only profile RLS cannot serve a cross-account public profile lookup. */
export function createPublicProfileLookupClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("PUBLIC_PROFILE_LOOKUP_UNAVAILABLE");
  return createClient<Database>(url,key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:sessionFetch},
  });
}
