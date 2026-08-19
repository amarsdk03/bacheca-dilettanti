export const DEFAULT_AUTH_REDIRECT = "/profilo";

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
	const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

	try {
		return new URL(configuredUrl ?? "http://localhost:3000").origin;
	} catch {
		return "http://localhost:3000";
	}
}

export function getAuthCallbackUrl(nextPath: string) {
	const callback = new URL("/auth/callback", getSiteUrl());
	callback.searchParams.set("next", sanitizeNextPath(nextPath));
	return callback.toString();
}
