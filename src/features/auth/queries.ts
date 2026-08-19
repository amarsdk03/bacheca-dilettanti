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
		createdAt: user.created_at,
		lastSignInAt: user.last_sign_in_at ?? null,
	};
}

export const getCurrentViewer = cache(async (): Promise<ViewerDTO | null> => {
	const supabase = await createClient();
	const {data: claimsData, error: claimsError} = await supabase.auth.getClaims();
	const subject = claimsData?.claims?.sub;

	if (claimsError || typeof subject !== "string") {
		return null;
	}

	const {data: {user}, error: userError} = await supabase.auth.getUser();

	if (userError || !user || user.id !== subject) {
		return null;
	}

	return toViewer(user);
});

export async function requireViewer() {
	const viewer = await getCurrentViewer();

	if (!viewer) {
		redirect("/accedi?next=%2Fprofilo");
	}

	return viewer;
}
