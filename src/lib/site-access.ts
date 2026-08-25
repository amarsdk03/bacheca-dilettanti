export const SITE_ACCESS_COOKIE = "bd_site_access";

const ACCESS_VALUE = "bacheca-dilettanti-access-v1";

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
		["sign"],
	);
}

export async function createSiteAccessToken() {
	const key = await getKey();

	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(ACCESS_VALUE),
	);

	return toHex(signature);
}

export async function verifySiteAccessToken(token?: string) {
	if (!token) {
		return false;
	}

	const expected = await createSiteAccessToken();

	return token === expected;
}