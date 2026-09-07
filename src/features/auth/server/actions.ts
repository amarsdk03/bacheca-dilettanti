"use server";

import "server-only";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

import {
	AUTH_EMAIL_FLOW,
	createAuthEmailFlowMetadata,
} from "@/features/auth/email-flow";
import {getAuthErrorMessage} from "@/features/auth/errors";
import {sendSignupConfirmationEmail} from "@/features/auth/server/signup-confirmation";
import type {AuthActionState} from "@/features/auth/types";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {getAuthCallbackUrl, getAuthConfirmUrl, sanitizeNextPath} from "@/features/auth/utils";
import {
	hasFieldErrors,
	validateEmailPassword,
	validateNewPassword,
	validateRegistration,
} from "@/features/auth/validation";
import {
	parseRegistrationPayload,
	RegistrationPayloadError,
} from "@/features/registrati/server/registration";
import {getRegistrationEmailIdentity} from "@/features/registrati/server/email-identity";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import type {Json} from "@/server/supabase";

export async function signInWithPassword(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const {email, password, fieldErrors} = validateEmailPassword(formData);

	if (hasFieldErrors(fieldErrors)) {
		return {status: "error", message: "Controlla i dati inseriti.", fieldErrors};
	}

	const supabase = await createClient();
	const {data, error} = await supabase.auth.signInWithPassword({email, password});

	if (error) {
		return {
			status: "error",
			message: getAuthErrorMessage(error),
			email: error.code === "email_not_confirmed" ? email : undefined,
			reason: error.code === "email_not_confirmed" ? "email_not_confirmed" : undefined,
		};
	}

	if (!data.user.email_confirmed_at) {
		await supabase.auth.signOut({scope: "local"});
		return {
			status: "error",
			message: "Conferma prima il tuo indirizzo email.",
			email,
			reason: "email_not_confirmed",
		};
	}

	revalidatePath("/", "layout");
	redirect(sanitizeNextPath(formData.get("next")));
}

export async function signUpWithPassword(
	_previousState: AuthActionState,
	formData: FormData,
): Promise<AuthActionState> {
	const {email, password, fieldErrors} = validateRegistration(formData);

	if (hasFieldErrors(fieldErrors)) {
		return {status: "error", message: "Controlla i dati inseriti.", fieldErrors, step: 1};
	}

	let payload;
	try {
		payload = parseRegistrationPayload(formData.get("registrationPayload"));
	} catch (error) {
		if (error instanceof RegistrationPayloadError) {
			return {
				status: "error",
				message: error.message,
				step: error.step,
				profileType: error.profileType,
			};
		}
		throw error;
	}

	const existingAccount = await getAuthenticatedViewer();
	if (existingAccount?.registeredAt) {
		return {
			status: "error",
			message: "L’account è già registrato. Accedi al tuo profilo.",
			step: 1,
		};
	}
	if (existingAccount && existingAccount.viewer.email.trim().toLowerCase() !== email) {
		return {
			status: "error",
			message: "Usa l’indirizzo email già verificato per completare la registrazione.",
			fieldErrors: {email: "L’indirizzo non corrisponde alla sessione verificata."},
			step: 1,
		};
	}
	if (!existingAccount) {
		try {
			const identity = await getRegistrationEmailIdentity(email);
			if (identity.status === "registered") {
				return {
					status: "error",
					message: "L’email è già associata a un account registrato. Accedi per continuare.",
					fieldErrors: {email: "Email già registrata."},
					step: 1,
					reason: "already_registered",
				};
			}
			if (identity.status === "signup_pending") {
				const resendResult = await sendSignupConfirmationEmail(email);
				if (resendResult.status !== "sent") {
					return {
						status: "error",
						message: resendResult.message,
						step: 1,
					};
				}

				return {
					status: "success",
					message: resendResult.message,
					email,
				};
			}
			if (identity.status === "recovery_required") {
				return {
					status: "error",
					message: "Verifica nuovamente l’indirizzo email prima di completare la registrazione.",
					fieldErrors: {email: "Richiedi e inserisci il codice inviato a questa email."},
					step: 1,
					reason: "email_verification_required",
				};
			}
		} catch (error) {
			console.error("[registration] Registration identity preflight failed", {
				cause: error instanceof Error ? error.name : "unknown",
			});
			return {
				status: "error",
				message: "Non è stato possibile verificare l’indirizzo email. Riprova.",
				step: 1,
			};
		}
	}

	let admin;
	try {
		admin = createAdminClient();
	} catch (error) {
		console.error("[registration] Supabase server credentials unavailable", error);
		return {
			status: "error",
			message: "La registrazione non è momentaneamente disponibile. Riprova più tardi.",
			step: 3,
		};
	}

	let intentToken: string | null = null;
	let prepareError: {code?: string} | null = null;
	try {
		const result = await admin.rpc(
			"prepare_registration",
			{p_email: email, p_payload: payload as unknown as Json},
		);
		intentToken = result.data;
		prepareError = result.error;
	} catch (error) {
		console.error("[registration] Registration preparation request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
	}

	if (prepareError || typeof intentToken !== "string") {
		console.error("[registration] Could not prepare registration", {
			code: prepareError?.code,
		});
		return {
			status: "error",
			message: "Non è stato possibile salvare i profili. Riprova.",
			step: 3,
		};
	}

	if (existingAccount) {
		try {
			const supabase = await createClient();
			const {error: passwordError} = await supabase.auth.updateUser({
				password,
				data: createAuthEmailFlowMetadata(AUTH_EMAIL_FLOW.ACCOUNT_SIGNUP),
			});
			if (passwordError && passwordError.code !== "same_password") {
				return {
					status: "error",
					message: getAuthErrorMessage(passwordError),
					fieldErrors: {password: getAuthErrorMessage(passwordError)},
					step: 1,
				};
			}

			const {error: completionError} = await supabase.rpc("complete_registration_v1", {
				p_token: intentToken,
			});
			if (completionError) {
				console.error("[registration] Existing account completion failed", {
					code: completionError.code,
				});
				return {
					status: "error",
					message: "Non è stato possibile completare il profilo. Riprova.",
					step: 3,
				};
			}
		} catch (error) {
			console.error("[registration] Existing account completion request failed", {
				cause: error instanceof Error ? error.name : "unknown",
			});
			return {
				status: "error",
				message: "La registrazione non è momentaneamente disponibile. Riprova.",
				step: 3,
			};
		} finally {
			try {
				const {error: cleanupError} = await admin.rpc("cancel_registration", {
					p_token: intentToken,
				});
				if (cleanupError) {
					console.error("[registration] Could not clean up registration intent", {
						code: cleanupError.code,
					});
				}
			} catch (error) {
				console.error("[registration] Registration cleanup request failed", {
					cause: error instanceof Error ? error.name : "unknown",
				});
			}
		}

		revalidatePath("/", "layout");
		revalidatePath("/il-tuo-profilo");
		redirect("/il-tuo-profilo");
	}

	try {
		const supabase = await createClient();
		const {data, error} = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					registration_intent: intentToken,
					...createAuthEmailFlowMetadata(AUTH_EMAIL_FLOW.ACCOUNT_SIGNUP),
				},
				emailRedirectTo: getAuthConfirmUrl(),
			},
		});

		if (error?.code === "email_exists" || error?.code === "user_already_exists") {
			return {
				status: "success",
				message: "Se l’indirizzo può essere registrato, riceverai un’email di conferma.",
			};
		}

		if (error) {
			console.error("[registration] Auth signup failed", {code: error.code});
			console.error("Errore: ", error);
			return {
				status: "error",
				message: "Non è stato possibile completare la registrazione. Riprova.",
				step: 3,
			};
		}

		if (!data.user) {
			return {
				status: "error",
				message: "Non è stato possibile completare la registrazione. Riprova.",
				step: 3,
			};
		}

		if (data.session) {
			await supabase.auth.signOut({scope: "local"});
		}

		return {
			status: "success",
			message: "Controlla la tua email per verificare il profilo prima di accedere.",
		};
	} catch (error) {
		console.error("[registration] Auth signup request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {
			status: "error",
			message: "Non è stato possibile completare la registrazione. Riprova.",
			step: 3,
		};
	} finally {
		try {
			const {error: cleanupError} = await admin.rpc("cancel_registration", {
				p_token: intentToken,
			});
			if (cleanupError) {
				console.error("[registration] Could not clean up registration intent", {
					code: cleanupError.code,
				});
			}
		} catch (error) {
			console.error("[registration] Registration cleanup request failed", {
				cause: error instanceof Error ? error.name : "unknown",
			});
		}
	}
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

export async function requestCurrentUserPasswordReset(
	_previousState: AuthActionState,
	_formData: FormData,
): Promise<AuthActionState> {
	void _previousState;
	void _formData;
	const supabase = await createClient();
	const {data: claimsData, error: claimsError} = await supabase.auth.getClaims();
	const subject = claimsData?.claims?.sub;

	if (claimsError || typeof subject !== "string") {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo e riprova."};
	}

	const {data: {user}, error: userError} = await supabase.auth.getUser();

	if (userError || !user || user.id !== subject || !user.email || !user.email_confirmed_at) {
		return {status: "error", message: "Non è stato possibile verificare l'indirizzo email dell'account."};
	}

	const {error} = await supabase.auth.resetPasswordForEmail(user.email, {
		redirectTo: getAuthCallbackUrl("/reimposta-password"),
	});

	if (error) {
		return {status: "error", message: getAuthErrorMessage(error)};
	}

	return {
		status: "success",
		message: `Abbiamo inviato il link per reimpostare la password a ${user.email}.`,
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
	redirect("/il-tuo-profilo?password=aggiornata");
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut({scope: "local"});
	revalidatePath("/", "layout");
	redirect("/accedi");
}
