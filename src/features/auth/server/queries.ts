import "server-only";

import {cache} from "react";
import {redirect} from "next/navigation";

import type {User} from "@supabase/supabase-js";

import type {ViewerDTO} from "@/features/auth/types";
import {createClient} from "@/lib/supabase/server";

function readMetadataString(user: User, key: string) {
	const value = user.user_metadata?.[key];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getInitials(name: string, email: string) {
	const source = name.trim() || email.split("@")[0] || "Utente";
	return source
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("") || "UT";
}

function getAuthMethod(user: User) {
	const provider = user.app_metadata?.provider;

	if (provider === "email") return "Email";
	if (typeof provider === "string" && provider.trim()) {
		return provider.charAt(0).toUpperCase() + provider.slice(1);
	}

	return "Email";
}

function toViewer(user: User): ViewerDTO {
	const email = user.email ?? "Email non disponibile";
	const fullName = readMetadataString(user, "full_name")
		?? readMetadataString(user, "name")
		?? email.split("@")[0]
		?? "Utente";
	const avatarUrl = readMetadataString(user, "avatar_url")
		?? readMetadataString(user, "picture");
	return {
		fullName,
		email,
		avatarUrl,
		initials: getInitials(fullName, email),
		authMethod: getAuthMethod(user),
		emailConfirmedAt: user.email_confirmed_at ?? null,
		createdAt: user.created_at,
		lastSignInAt: user.last_sign_in_at ?? null,
	};
}

export interface AuthenticatedViewer {
	authUserId: string;
	utenteId: string | null;
	registeredAt: string | null;
	/** @deprecated Prefer authUserId when talking to Supabase Auth. */
	userId: string;
	viewer: ViewerDTO;
}

export const getAuthenticatedViewer = cache(async (): Promise<AuthenticatedViewer | null> => {
	const supabase = await createClient();
	const {data: claimsData, error: claimsError} = await supabase.auth.getClaims();
	const subject = claimsData?.claims?.sub;

	if (claimsError || typeof subject !== "string") {
		return null;
	}

	const {data: {user}, error: userError} = await supabase.auth.getUser();

	if (userError || !user || user.id !== subject || !user.email_confirmed_at) {
		return null;
	}

	const {data: publicUser, error: publicUserError} = await supabase
		.from("utente")
		.select("utente_uuid, registrato_il")
		.eq("auth_user_uuid", user.id)
		.maybeSingle();

	if (publicUserError) {
		console.error("[auth] Public user lookup failed", {code: publicUserError.code});
		return null;
	}

	return {
		authUserId: user.id,
		utenteId: publicUser?.utente_uuid ?? null,
		registeredAt: publicUser?.registrato_il ?? null,
		userId: user.id,
		viewer: toViewer(user),
	};
});

export const getCurrentViewer = cache(async (): Promise<ViewerDTO | null> => {
	return (await getAuthenticatedViewer())?.viewer ?? null;
});

export async function requireAuthenticatedViewer() {
	const account = await getAuthenticatedViewer();

	if (!account) {
		redirect("/accedi?next=%2Fil-tuo-profilo");
	}

	return account;
}

export async function requireViewer() {
	return (await requireAuthenticatedViewer()).viewer;
}
