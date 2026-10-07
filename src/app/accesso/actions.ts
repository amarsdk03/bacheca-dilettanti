"use server";

import "server-only";
import {createHash, timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {
	createSiteAccessToken,
	isSiteAccessConfigured,
	sanitizeSiteAccessNextPath,
	SITE_ACCESS_COOKIE,
	SITE_ACCESS_MAX_AGE,
} from "@/lib/site-access";

export type SiteAccessState = {message: string; passwordInvalid?: boolean};

export async function unlockSite(
	_previousState: SiteAccessState,
	formData: FormData,
): Promise<SiteAccessState> {
	if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") redirect("/in-manutenzione");
	if (process.env.SITE_ACCESS_RESTRICTED !== "true") redirect("/");
	if (!isSiteAccessConfigured()) {
		return {message: "Accesso temporaneamente non disponibile. Riprova più tardi."};
	}
	const password = formData.get("password");
	if (typeof password !== "string" || !password || password.length > 1024) {
		return {message: "Inserisci una password valida.", passwordInvalid: true};
	}
	const supplied = createHash("sha256").update(password).digest();
	const expected = createHash("sha256").update(process.env.SITE_ACCESS_PASSWORD!).digest();
	if (!timingSafeEqual(supplied, expected)) {
		return {message: "Password non corretta. Riprova.", passwordInvalid: true};
	}
	try {
		const token = await createSiteAccessToken();
		(await cookies()).set(SITE_ACCESS_COOKIE, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: SITE_ACCESS_MAX_AGE,
		});
	} catch {
		return {message: "Accesso temporaneamente non disponibile. Riprova più tardi."};
	}
	redirect(sanitizeSiteAccessNextPath(formData.get("next")));
}
