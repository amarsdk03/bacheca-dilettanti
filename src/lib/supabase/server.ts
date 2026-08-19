import {createServerClient} from "@supabase/ssr";
import {cookies} from "next/headers";

import type {Database} from "@/server/supabase";

/**
 * Create one Supabase client for the current request. Never keep this client in
 * module-level state: its cookie store belongs to the request being handled.
 */
export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({name, value, options}) => {
							cookieStore.set(name, value, options);
						});
					} catch {
						// Server Components cannot write cookies. The Proxy refreshes the
						// session and Server Actions/Route Handlers can write them directly.
					}
				},
			},
		},
	);
}
