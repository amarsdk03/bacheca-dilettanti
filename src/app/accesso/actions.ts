"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
	createSiteAccessToken,
	SITE_ACCESS_COOKIE,
} from "@/lib/site-access";

type AccessState = {
	error?: string;
};

function verifyPassword(input: string, expected: string) {
	const inputHash = createHash("sha256").update(input).digest();
	const expectedHash = createHash("sha256").update(expected).digest();

	return timingSafeEqual(inputHash, expectedHash);
}

export async function unlockSite(
	_previousState: AccessState,
	formData: FormData,
): Promise<AccessState> {
	const password = formData.get("password");
	const next = formData.get("next");

	if (typeof password !== "string") {
		return {
			error: "Inserisci la password.",
		};
	}

	const expectedPassword = process.env.SITE_ACCESS_PASSWORD;

	if (!expectedPassword) {
		throw new Error("SITE_ACCESS_PASSWORD non configurato");
	}

	if (!verifyPassword(password, expectedPassword)) {
		return {
			error: "Password non corretta.",
		};
	}

	const token = await createSiteAccessToken();

	const cookieStore = await cookies();

	cookieStore.set(SITE_ACCESS_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",

		// 14 giorni
		maxAge: 60 * 60 * 24 * 14,
	});

	const destination =
		typeof next === "string" &&
		next.startsWith("/") &&
		!next.startsWith("//")
			? next
			: "/";

	redirect(destination);
}