import "server-only";

function safeMessage(value: unknown) {
	if (typeof value !== "string") return undefined;
	return value
		.replace(/https?:\/\/\S+/gi, "[url]")
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
		.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[token]")
		.replace(/\b(password|token(?:_hash)?|access_token|refresh_token|code_verifier)\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)/gi, "$1=[redacted]")
		.slice(0, 500);
}

/** Preserve Auth's original HTTP error details, which auth-js drops for 5xx. */
export function createAuthDiagnosticFetch(supabaseUrl: string, fetcher: typeof fetch = fetch): typeof fetch {
	const origin = new URL(supabaseUrl).origin;
	return async (input, init) => {
		const response = await fetcher(input, init);
		if (response.status < 500) return response;

		const url = new URL(input instanceof Request ? input.url : input.toString());
		if (url.origin !== origin || !url.pathname.startsWith("/auth/v1/")) return response;

		let details: Record<string, unknown> = {};
		try {
			const body: unknown = await response.clone().json();
			if (body && typeof body === "object" && !Array.isArray(body)) details = body as Record<string, unknown>;
		} catch {
			// Gateways can return HTML or an empty body. Keep the original response.
		}
		const code = details.code ?? details.error_code;
		console.error("[supabase-auth] HTTP request failed", {
			path: url.pathname,
			status: response.status,
			requestId: safeMessage(response.headers.get("x-request-id") ?? response.headers.get("sb-request-id")),
			code: typeof code === "string" && /^[a-z0-9_]+$/i.test(code) ? code : undefined,
			message: safeMessage(details.msg ?? details.message ?? details.error_description ?? details.error),
		});
		return response;
	};
}
