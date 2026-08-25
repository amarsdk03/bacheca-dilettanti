import {NextResponse, type NextRequest} from "next/server";

import {getSiteUrl} from "@/features/auth/utils";
import {createClient} from "@/lib/supabase/server";

function redirectWithoutCache(path: string) {
	const response = NextResponse.redirect(new URL(path, getSiteUrl()));
	response.headers.set("Cache-Control", "private, no-store");
	response.headers.set("Expires", "0");
	response.headers.set("Pragma", "no-cache");
	return response;
}

export async function GET(request: NextRequest) {
	const tokenHash = request.nextUrl.searchParams.get("token_hash");
	const type = request.nextUrl.searchParams.get("type");
	const code = request.nextUrl.searchParams.get("code");
	const supabase = await createClient();

	const verification = tokenHash && type === "email"
		? await supabase.auth.verifyOtp({token_hash: tokenHash, type: "email"})
		: code
			? await supabase.auth.exchangeCodeForSession(code)
			: null;

	if (!verification || verification.error) {
		return redirectWithoutCache("/accedi?errore=verifica-email");
	}

	const {data: {user}, error: userError} = await supabase.auth.getUser();

	if (userError || !user?.email_confirmed_at) {
		await supabase.auth.signOut({scope: "local"});
		return redirectWithoutCache("/accedi?errore=verifica-email");
	}

	return redirectWithoutCache("/il-tuo-profilo");
}
