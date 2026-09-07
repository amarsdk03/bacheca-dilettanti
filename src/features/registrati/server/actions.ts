"use server";

import "server-only";

import {AUTH_EMAIL_FLOW} from "@/features/auth/email-flow";
import {getAuthErrorMessage} from "@/features/auth/errors";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {sendSignupConfirmationEmail} from "@/features/auth/server/signup-confirmation";
import type {
	RegistrationEmailRecoveryInput,
	RegistrationEmailRecoveryVerificationInput,
	RequestRegistrationEmailRecoveryResult,
	VerifyRegistrationEmailRecoveryResult,
} from "@/features/registrati/registration-recovery";
import {
	getRegistrationEmailIdentity,
	setAuthEmailFlow,
} from "@/features/registrati/server/email-identity";
import {createClient} from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;
const REGISTERED_EMAIL_MESSAGE = "Email già registrata, accedi al profilo per completare la registrazione";

function normalizeEmail(value: unknown) {
	if (typeof value !== "string") return null;
	const email = value.trim().toLowerCase();
	return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

export async function requestRegistrationEmailRecovery(
	input: RegistrationEmailRecoveryInput,
): Promise<RequestRegistrationEmailRecoveryResult> {
	const email = normalizeEmail(input?.email);
	if (!email) {
		return {status: "error", message: "Inserisci un indirizzo email valido."};
	}

	try {
		const account = await getAuthenticatedViewer();
		if (account?.registeredAt) {
			return {status: "already_registered", message: REGISTERED_EMAIL_MESSAGE};
		}
		if (account) {
			if (account.viewer.email.trim().toLowerCase() !== email) {
				return {
					status: "error",
					message: "Usa l’indirizzo email già verificato nella sessione attiva.",
				};
			}
			return {status: "verified", email, message: "Indirizzo email già verificato."};
		}

		const identity = await getRegistrationEmailIdentity(email);
		if (identity.status === "new_email") return {status: "new_email"};
		if (identity.status === "registered") {
			return {status: "already_registered", message: REGISTERED_EMAIL_MESSAGE};
		}
		if (identity.status === "signup_pending") {
			const resendResult = await sendSignupConfirmationEmail(email);
			if (resendResult.status !== "sent") return resendResult;

			return {
				status: "signup_pending",
				email,
				message: resendResult.message,
			};
		}

		await setAuthEmailFlow(identity.authUserId, AUTH_EMAIL_FLOW.ANNOUNCEMENT_OTP);

		const supabase = await createClient();
		const {error} = await supabase.auth.signInWithOtp({
			email,
			options: {shouldCreateUser: false},
		});

		if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
			return {status: "rate_limited", message: getAuthErrorMessage(error)};
		}
		if (error) {
			console.error("[registration-recovery] OTP request failed", {code: error.code});
			return {status: "error", message: getAuthErrorMessage(error)};
		}

		return {
			status: "sent",
			message: "Ti abbiamo inviato un codice di verifica a 6 cifre.",
		};
	} catch (error) {
		console.error("[registration-recovery] OTP request unavailable", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "Non è stato possibile verificare l’indirizzo. Riprova tra poco."};
	}
}

export async function verifyRegistrationEmailRecovery(
	input: RegistrationEmailRecoveryVerificationInput,
): Promise<VerifyRegistrationEmailRecoveryResult> {
	const email = normalizeEmail(input?.email);
	if (!email) {
		return {status: "invalid", message: "Inserisci un indirizzo email valido."};
	}

	const code = typeof input?.code === "string" ? input.code.trim() : "";
	if (!OTP_PATTERN.test(code)) {
		return {status: "invalid", message: "Inserisci il codice a 6 cifre ricevuto via email."};
	}

	try {
		const supabase = await createClient();
		const {data, error} = await supabase.auth.verifyOtp({email, token: code, type: "email"});

		if (error?.code === "over_request_rate_limit") {
			return {status: "rate_limited", message: getAuthErrorMessage(error)};
		}
		if (error?.code === "otp_expired" || error?.code === "flow_state_expired") {
			return {status: "expired", message: getAuthErrorMessage(error)};
		}
		if (error) {
			return {status: "invalid", message: getAuthErrorMessage(error)};
		}

		const verifiedEmail = normalizeEmail(data.user?.email);
		if (
			!data.session
			|| !data.user
			|| !data.user.email_confirmed_at
			|| verifiedEmail !== email
		) {
			await supabase.auth.signOut({scope: "local"});
			return {status: "error", message: "Non è stato possibile verificare l’indirizzo email."};
		}

		const identity = await getRegistrationEmailIdentity(email);
		if (identity.status === "registered") {
			await supabase.auth.signOut({scope: "local"});
			return {status: "already_registered", message: REGISTERED_EMAIL_MESSAGE};
		}
		if (identity.status !== "recovery_required" || identity.authUserId !== data.user.id) {
			await supabase.auth.signOut({scope: "local"});
			return {status: "error", message: "L’indirizzo verificato non corrisponde all’account da recuperare."};
		}

		return {status: "verified", email, message: "Indirizzo email verificato."};
	} catch (error) {
		console.error("[registration-recovery] OTP verification unavailable", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		try {
			const supabase = await createClient();
			await supabase.auth.signOut({scope: "local"});
		} catch {
			// The recovery must fail closed even if the local session cleanup is unavailable.
		}
		return {status: "error", message: "Non è stato possibile verificare il codice. Riprova."};
	}
}
