import {NextResponse, type NextRequest} from "next/server";

import {getSiteUrl, sanitizeNextPath} from "@/features/auth/utils";
import {createClient} from "@/lib/supabase/server";

function redirectWithoutCache(url: URL) {
	const response = NextResponse.redirect(url);
	response.headers.set("Cache-Control", "private, no-store");
	response.headers.set("Expires", "0");
	response.headers.set("Pragma", "no-cache");
	return response;
}

export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get("code");
	const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

	if (code) {
		const supabase = await createClient();
		const {error} = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			return redirectWithoutCache(new URL(nextPath, getSiteUrl()));
		}
	}

	const errorUrl = new URL("/password-dimenticata", getSiteUrl());
	errorUrl.searchParams.set("errore", "link-scaduto");
	return redirectWithoutCache(errorUrl);
}
