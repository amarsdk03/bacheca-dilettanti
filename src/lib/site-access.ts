export const SITE_ACCESS_COOKIE = "bd_site_access";

export const SITE_ACCESS_MAX_AGE = 7 * 24 * 60 * 60;

const ACCESS_VERSION = "bd-access-v2";

export function isSiteAccessConfigured() {
	return Boolean(process.env.SITE_ACCESS_PASSWORD && process.env.SITE_ACCESS_SECRET);
}

export function sanitizeSiteAccessNextPath(value: unknown) {
	if (
		typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")
		|| /[\\\u0000-\u001f\u007f]/.test(value)
	) {
		return "/";
	}
	try {
		const url = new URL(value, "https://site-access.invalid");
		const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
		if (url.origin !== "https://site-access.invalid" || pathname === "/accesso" || pathname === "/in-manutenzione") return "/";
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return "/";
	}
}

function toHex(buffer: ArrayBuffer) {
	return Array.from(new Uint8Array(buffer))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function getKey() {
	const secret = process.env.SITE_ACCESS_SECRET;

	if (!secret) {
		throw new Error("SITE_ACCESS_SECRET non configurato");
	}

	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{
			name: "HMAC",
			hash: "SHA-256",
		},
		false,
		["sign", "verify"],
	);
}

export async function createSiteAccessToken() {
	const key = await getKey();
	const expiresAt = Math.floor(Date.now() / 1000) + SITE_ACCESS_MAX_AGE;
	const payload = `${ACCESS_VERSION}.${expiresAt}`;

	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);

	return `${payload}.${toHex(signature)}`;
}

export async function verifySiteAccessToken(token?: string) {
	if (!token || !isSiteAccessConfigured()) {
		return false;
	}

	const match = /^bd-access-v2\.(\d{10})\.([a-f0-9]{64})$/.exec(token);
	if (!match) return false;
	const expiresAt = Number(match[1]);
	const now = Math.floor(Date.now() / 1000);
	if (expiresAt <= now) return false;
	try {
		const signature = Uint8Array.from(match[2].match(/../g)!, (byte) => parseInt(byte, 16));
		return await crypto.subtle.verify(
			"HMAC", await getKey(), signature,
			new TextEncoder().encode(`${ACCESS_VERSION}.${match[1]}`),
		);
	} catch {
		return false;
	}
}
