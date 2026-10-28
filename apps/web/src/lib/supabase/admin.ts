import "server-only";

import {createClient as createSupabaseClient} from "@supabase/supabase-js";

import type {Database} from "@/server/supabase";
import {createAuthDiagnosticFetch} from "@/lib/supabase/auth-fetch";

export function createAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const secretKey = process.env.SUPABASE_SECRET_KEY;

	if (!url || !secretKey) {
		throw new Error("Supabase server credentials are not configured.");
	}

	return createSupabaseClient<Database>(url, secretKey, {
		global: {fetch: createAuthDiagnosticFetch(url, (input, init) => fetch(input, {...init, cache: "no-store"}))},
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});
}
