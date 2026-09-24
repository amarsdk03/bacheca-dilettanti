export const DEFAULT_AUTH_REDIRECT = "/il-tuo-profilo";

export function sanitizeNextPath(
	value: FormDataEntryValue | string | null | undefined,
	fallback = DEFAULT_AUTH_REDIRECT,
) {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
		return fallback;
	}

	try {
		const parsed = new URL(value, "http://localhost");
		if (parsed.origin !== "http://localhost") {
			return fallback;
		}

		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return fallback;
	}
}

export function getSiteUrl() {
	const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
	if (!configuredUrl) {
		throw new Error("NEXT_PUBLIC_SITE_URL is required for Supabase Auth email links.");
	}

	let url: URL;
	try {
		url = new URL(configuredUrl);
	} catch {
		throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute URL.");
	}

	const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
	const localHttp = process.env.NODE_ENV !== "production" && loopback && url.protocol === "http:";
	if (
		(url.protocol !== "https:" && !localHttp)
		|| (process.env.NODE_ENV === "production" && loopback)
		|| url.username
		|| url.password
		|| url.pathname !== "/"
		|| url.search
		|| url.hash
	) {
		throw new Error("NEXT_PUBLIC_SITE_URL must be a trusted site origin (HTTPS outside local development).");
	}

	return url.origin;
}

export function getAuthCallbackUrl() {
	return new URL("/auth/callback", getSiteUrl()).toString();
}

export function getAuthConfirmUrl() {
	return new URL("/auth/confirm", getSiteUrl()).toString();
}
