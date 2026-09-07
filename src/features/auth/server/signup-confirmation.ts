"use server";

import "server-only";

import {AUTH_EMAIL_FLOW} from "@/features/auth/email-flow";
import {getAuthErrorMessage} from "@/features/auth/errors";
import type {AuthActionState} from "@/features/auth/types";
import {getAuthConfirmUrl} from "@/features/auth/utils";
import {
	getRegistrationEmailIdentity,
	setAuthEmailFlow,
} from "@/features/registrati/server/email-identity";
import {createClient} from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SENT_MESSAGE =
	"Se esiste una registrazione in attesa per questa email, riceverai un nuovo link di verifica.";

export type SendSignupConfirmationResult =
	| {status: "sent"; message: string}
	| {status: "rate_limited" | "error"; message: string};

function normalizeEmail(value: unknown) {
	if (typeof value !== "string") return null;
	const email = value.trim().toLowerCase();
	return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export async function sendSignupConfirmationEmail(
	email: string,
): Promise<SendSignupConfirmationResult> {
	try {
		const identity = await getRegistrationEmailIdentity(email);
		if (identity.status !== "signup_pending") {
			return {status: "sent", message: GENERIC_SENT_MESSAGE};
		}

		await setAuthEmailFlow(identity.authUserId, AUTH_EMAIL_FLOW.ACCOUNT_SIGNUP);

		const supabase = await createClient();
		const {error} = await supabase.auth.resend({
			type: "signup",
			email,
			options: {emailRedirectTo: getAuthConfirmUrl()},
		});

		if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
			return {status: "rate_limited", message: getAuthErrorMessage(error)};
		}
		if (error) {
			console.error("[signup-confirmation] Resend failed", {code: error.code});
			return {status: "error", message: getAuthErrorMessage(error)};
		}

		return {status: "sent", message: GENERIC_SENT_MESSAGE};
	} catch (error) {
		console.error("[signup-confirmation] Resend unavailable", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "Non è stato possibile inviare l’email. Riprova tra poco."};
	}
}

export async function resendSignupConfirmation(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const email = normalizeEmail(formData.get("email"));
	if (!email) {
		return {
			status: "error",
			message: "Inserisci un indirizzo email valido.",
			fieldErrors: {email: "Inserisci un indirizzo email valido."},
		};
	}

	const result = await sendSignupConfirmationEmail(email);
	return {
		status: result.status === "sent" ? "success" : "error",
		message: result.message,
		email,
	};
}
