import "server-only";

import {
	AUTH_EMAIL_FLOW_METADATA_KEY,
	type AuthEmailFlow,
} from "@/features/auth/email-flow";
import {createAdminClient} from "@/lib/supabase/admin";

export type RegistrationEmailIdentity =
	| {status: "new_email"}
	| {status: "recovery_required"; authUserId: string}
	| {status: "signup_pending"; authUserId: string}
	| {status: "registered"; authUserId: string};

export async function getRegistrationEmailIdentity(
	normalizedEmail: string,
): Promise<RegistrationEmailIdentity> {
	const admin = createAdminClient();
	const {data, error} = await admin.rpc("get_registration_email_identity_v1", {
		p_email: normalizedEmail,
	});

	if (error) {
		console.error("[registration-recovery] Email identity lookup failed", {code: error.code});
		throw new Error("REGISTRATION_EMAIL_LOOKUP_FAILED");
	}

	if (!Array.isArray(data) || data.length !== 1) {
		console.error("[registration-recovery] Email identity lookup returned an invalid row count");
		throw new Error("REGISTRATION_EMAIL_LOOKUP_INVALID_RESPONSE");
	}

	const [identity] = data;
	if (identity.identity_status === "new_email" && !identity.auth_user_uuid) {
		return {status: "new_email"};
	}

	if (
		(identity.identity_status === "recovery_required"
			|| identity.identity_status === "signup_pending"
			|| identity.identity_status === "registered")
		&& identity.auth_user_uuid
	) {
		return {status: identity.identity_status, authUserId: identity.auth_user_uuid};
	}

	console.error("[registration-recovery] Email identity lookup returned an invalid payload");
	throw new Error("REGISTRATION_EMAIL_LOOKUP_INVALID_RESPONSE");
}

export async function setAuthEmailFlow(authUserId: string, flow: AuthEmailFlow) {
	const admin = createAdminClient();
	const {data, error: readError} = await admin.auth.admin.getUserById(authUserId);

	if (readError || !data.user) {
		console.error("[auth-email] Could not read Auth user metadata", {code: readError?.code});
		throw new Error("AUTH_EMAIL_METADATA_READ_FAILED");
	}

	if (data.user.user_metadata?.[AUTH_EMAIL_FLOW_METADATA_KEY] === flow) return;

	const {error: updateError} = await admin.auth.admin.updateUserById(authUserId, {
		user_metadata: {
			...data.user.user_metadata,
			[AUTH_EMAIL_FLOW_METADATA_KEY]: flow,
		},
	});

	if (updateError) {
		console.error("[auth-email] Could not update Auth user metadata", {code: updateError.code});
		throw new Error("AUTH_EMAIL_METADATA_UPDATE_FAILED");
	}
}
