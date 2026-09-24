"use server";

import "server-only";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

import {isEmailLinkCredentialValue, type EmailLinkState} from "@/features/auth/email-link";
import {createClient} from "@/lib/supabase/server";

const INVALID_LINK_MESSAGE = "Il link non è valido oppure è scaduto. Richiedine uno nuovo.";

function readCredential(formData: FormData) {
	const tokenHash = formData.get("token_hash");
	const code = formData.get("code");
	if (isEmailLinkCredentialValue(tokenHash) && code === null) {
		return {kind: "token_hash" as const, value: tokenHash};
	}
	if (isEmailLinkCredentialValue(code) && tokenHash === null) {
		return {kind: "code" as const, value: code};
	}
	return null;
}

async function verifyEmailLink(formData: FormData, kind: "recovery" | "signup"): Promise<EmailLinkState> {
	const credential = readCredential(formData);
	if (!credential) return {status: "error", message: INVALID_LINK_MESSAGE};

	try {
		const supabase = await createClient();
		const result = credential.kind === "token_hash"
			? await supabase.auth.verifyOtp({token_hash: credential.value, type: kind === "recovery" ? "recovery" : "email"})
			: await supabase.auth.exchangeCodeForSession(credential.value);

		if (result.error || !result.data.session || !result.data.user) {
			console.error("[auth-email-link] Verification failed", {kind, code: result.error?.code});
			return {status: "error", message: INVALID_LINK_MESSAGE};
		}

		const {data: {user}, error: userError} = await supabase.auth.getUser();
		if (userError || !user || user.id !== result.data.user.id || !user.email_confirmed_at) {
			await supabase.auth.signOut({scope: "local"});
			console.error("[auth-email-link] Verified session is unavailable", {kind, code: userError?.code});
			return {status: "error", message: "Non è stato possibile aprire la sessione. Richiedi un nuovo link."};
		}
	} catch (error) {
		console.error("[auth-email-link] Verification unavailable", {
			kind,
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "Non è stato possibile verificare il link. Riprova tra poco."};
	}

	revalidatePath("/", "layout");
	redirect(kind === "recovery" ? "/reimposta-password" : "/il-tuo-profilo");
}

export async function completePasswordRecovery(
	_previousState: EmailLinkState,
	formData: FormData,
): Promise<EmailLinkState> {
	return verifyEmailLink(formData, "recovery");
}

export async function completeSignupConfirmation(
	_previousState: EmailLinkState,
	formData: FormData,
): Promise<EmailLinkState> {
	return verifyEmailLink(formData, "signup");
}
