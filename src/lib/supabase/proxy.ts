import {createServerClient} from "@supabase/ssr";
import {NextResponse, type NextRequest} from "next/server";

import type {Database} from "@/server/supabase";

export async function updateSession(request: NextRequest) {
	let response = NextResponse.next({request});

	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({name, value}) => request.cookies.set(name, value));
					response = NextResponse.next({request});
					cookiesToSet.forEach(({name, value, options}) => {
						response.cookies.set(name, value, options);
					});
				},
			},
		},
	);

	// Keep this call immediately after client creation. It validates the token
	// and refreshes expired cookies for both Server Components and the browser.
	await supabase.auth.getClaims();

	return response;
}
