import "server-only";

import {createAdminClient} from "@/lib/supabase/admin";

export type RegistrationEmailIdentity =
	| {status: "new_email"}
	| {status: "publish_only"; authUserId: string}
	| {status: "registered"; authUserId: string};

export async function getRegistrationEmailIdentity(
	normalizedEmail: string,
): Promise<RegistrationEmailIdentity> {
	const admin = createAdminClient();
	const {data, error} = await admin
		.from("utente")
		.select("auth_user_uuid, registrato_il")
		.eq("indirizzo_email", normalizedEmail)
		.maybeSingle();

	if (error) {
		console.error("[registration-recovery] Public user lookup failed", {code: error.code});
		throw new Error("REGISTRATION_EMAIL_LOOKUP_FAILED");
	}

	if (!data) return {status: "new_email"};
	if (!data.auth_user_uuid) {
		console.error("[registration-recovery] Public user has no Auth identity");
		throw new Error("REGISTRATION_AUTH_IDENTITY_MISSING");
	}

	return data.registrato_il
		? {status: "registered", authUserId: data.auth_user_uuid}
		: {status: "publish_only", authUserId: data.auth_user_uuid};
}
