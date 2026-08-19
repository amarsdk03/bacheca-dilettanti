import {NextResponse, type NextRequest} from "next/server";

import {getSiteUrl, sanitizeNextPath} from "@/features/auth/utils";
import {createClient} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get("code");
	const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

	if (code) {
		const supabase = await createClient();
		const {error} = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			return NextResponse.redirect(new URL(nextPath, getSiteUrl()));
		}
	}

	const errorUrl = new URL("/password-dimenticata", getSiteUrl());
	errorUrl.searchParams.set("errore", "link-scaduto");
	return NextResponse.redirect(errorUrl);
}
