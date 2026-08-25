import "server-only";

import {createClient as createSupabaseClient} from "@supabase/supabase-js";

import type {Database} from "@/server/supabase";

export function createAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const secretKey = process.env.SUPABASE_SECRET_KEY;

	if (!url || !secretKey) {
		throw new Error("Supabase server credentials are not configured.");
	}

	return createSupabaseClient<Database>(url, secretKey, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false,
		},
	});
}
