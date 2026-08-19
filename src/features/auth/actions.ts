"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

import {getAuthErrorMessage} from "@/features/auth/errors";
import type {AuthActionState} from "@/features/auth/types";
import {getAuthCallbackUrl, sanitizeNextPath} from "@/features/auth/utils";
import {
	hasFieldErrors,
	validateEmailPassword,
	validateNewPassword,
	validateRegistration,
} from "@/features/auth/validation";
import {createClient} from "@/lib/supabase/server";

export async function signInWithPassword(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const {email, password, fieldErrors} = validateEmailPassword(formData);

	if (hasFieldErrors(fieldErrors)) {
		return {status: "error", message: "Controlla i dati inseriti.", fieldErrors};
	}

	const supabase = await createClient();
	const {error} = await supabase.auth.signInWithPassword({email, password});

	if (error) {
		return {status: "error", message: getAuthErrorMessage(error)};
	}

	revalidatePath("/", "layout");
	redirect(sanitizeNextPath(formData.get("next")));
}

export async function signUpWithPassword(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const {name, email, password, fieldErrors} = validateRegistration(formData);

	if (hasFieldErrors(fieldErrors)) {
		return {status: "error", message: "Controlla i dati inseriti.", fieldErrors};
	}

	const supabase = await createClient();
	const {data, error} = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {full_name: name, name},
		},
	});

	if (error?.code === "email_exists" || error?.code === "user_already_exists") {
		return {status: "error", message: getAuthErrorMessage(error)};
	}

	if (error) {
		return {status: "error", message: getAuthErrorMessage(error)};
	}

	if (!data.session) {
		return {
			status: "error",
			message: "L'account è stato creato, ma l'accesso automatico non è disponibile. Contatta l'assistenza.",
		};
	}

	revalidatePath("/", "layout");
	redirect("/profilo");
}

export async function requestPasswordReset(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const {email, fieldErrors} = validateEmailPassword(formData);
	delete fieldErrors.password;

	if (hasFieldErrors(fieldErrors)) {
		return {status: "error", message: "Controlla l'indirizzo email.", fieldErrors};
	}

	const supabase = await createClient();
	const {error} = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: getAuthCallbackUrl("/reimposta-password"),
	});

	if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
		return {status: "error", message: getAuthErrorMessage(error)};
	}

	return {
		status: "success",
		message: "Se esiste un account associato a questa email, riceverai un link per reimpostare la password.",
	};
}

export async function updatePassword(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const {password, fieldErrors} = validateNewPassword(formData);

	if (hasFieldErrors(fieldErrors)) {
		return {status: "error", message: "Controlla le password inserite.", fieldErrors};
	}

	const supabase = await createClient();
	const {data: claimsData, error: claimsError} = await supabase.auth.getClaims();

	if (claimsError || !claimsData?.claims?.sub) {
		return {status: "error", message: "Il link è scaduto. Richiedine uno nuovo."};
	}

	const {error} = await supabase.auth.updateUser({password});

	if (error) {
		return {status: "error", message: getAuthErrorMessage(error)};
	}

	revalidatePath("/", "layout");
	redirect("/profilo?password=aggiornata");
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut({scope: "local"});
	revalidatePath("/", "layout");
	redirect("/accedi");
}
