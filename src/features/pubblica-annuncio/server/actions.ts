"use server";

import "server-only";

import {revalidatePath} from "next/cache";

import {getAuthErrorMessage} from "@/features/auth/errors";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import type {
	PublishAnnouncementPayload,
	PublishAnnouncementResult,
	PublishOtpActionInput,
	RequestPublishEmailOtpResult,
	VerifyPublishEmailOtpResult,
	VerifyPublishOtpActionInput,
} from "@/features/pubblica-annuncio/publish-model";
import {
	parsePublishPayload,
	PublishPayloadError,
} from "@/features/pubblica-annuncio/server/validation";
import {EMAIL_PATTERN} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import type {Json} from "@/server/supabase";

const TERMS_VERSION = "2026-08-24";
const PRIVACY_VERSION = "2026-08-24";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OTP_PATTERN = /^\d{6}$/;
const REGISTERED_EMAIL_MESSAGE = "Email già registrata, accedi al profilo per pubblicare annunci";

interface PublishRpcResult {
	status?: unknown;
	announcementId?: unknown;
	retryAt?: unknown;
	idempotent?: unknown;
}

function normalizeEmail(value: unknown) {
	if (typeof value !== "string") return null;
	const email = value.trim().toLowerCase();
	return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

function validSubmissionId(value: unknown): value is string {
	return typeof value === "string" && UUID_PATTERN.test(value);
}

async function isRegisteredEmail(email: string) {
	const admin = createAdminClient();
	const {data, error} = await admin
		.from("utente")
		.select("utente_uuid")
		.eq("indirizzo_email", email)
		.not("auth_user_uuid", "is", null)
		.not("registrato_il", "is", null)
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error("[publish-otp] Registered email lookup failed", {code: error.code});
		throw new Error("REGISTERED_EMAIL_LOOKUP_FAILED");
	}

	return Boolean(data);
}

export async function requestPublishEmailOtp(
	input: PublishOtpActionInput,
): Promise<RequestPublishEmailOtpResult> {
	if (!validSubmissionId(input?.submissionId)) {
		return {status: "error", message: "Aggiorna la pagina e riprova."};
	}

	const email = normalizeEmail(input.email);
	if (!email) {
		return {status: "error", message: "Inserisci un indirizzo email valido."};
	}

	try {
		const account = await getAuthenticatedViewer();
		if (account?.registeredAt) {
			return {status: "already_registered", message: REGISTERED_EMAIL_MESSAGE};
		}

		const registeredEmail = await isRegisteredEmail(email);
		const supabase = await createClient();

		// The page can still have `authenticated=false` after the first OTP has
		// established a publish-only session. Changing the editable verification
		// address must replace that local session before starting a new challenge.
		if (account) {
			const {error: signOutError} = await supabase.auth.signOut({scope: "local"});
			if (signOutError) {
				return {status: "error", message: "Non è stato possibile cambiare l’indirizzo email. Riprova."};
			}
		}

		if (registeredEmail) {
			return {status: "already_registered", message: REGISTERED_EMAIL_MESSAGE};
		}

		const {error} = await supabase.auth.signInWithOtp({
			email,
			options: {
				shouldCreateUser: true,
			},
		});

		if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
			return {status: "rate_limited", message: getAuthErrorMessage(error)};
		}
		if (error) {
			return {status: "error", message: getAuthErrorMessage(error)};
		}

		return {
			status: "sent",
			message: "Ti abbiamo inviato un codice di verifica a 6 cifre.",
		};
	} catch (error) {
		console.error("[publish-otp] OTP request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "Non è stato possibile inviare il codice. Riprova tra poco."};
	}
}

export async function verifyPublishEmailOtp(
	input: VerifyPublishOtpActionInput,
): Promise<VerifyPublishEmailOtpResult> {
	if (!validSubmissionId(input?.submissionId)) {
		return {status: "error", message: "Aggiorna la pagina e riprova."};
	}

	const email = normalizeEmail(input.email);
	if (!email) {
		return {status: "invalid", message: "Inserisci un indirizzo email valido."};
	}

	const code = typeof input.code === "string" ? input.code.trim() : "";
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

		if (await isRegisteredEmail(email)) {
			await supabase.auth.signOut({scope: "local"});
			return {status: "already_registered", message: REGISTERED_EMAIL_MESSAGE};
		}

		return {status: "verified", message: "Indirizzo email verificato."};
	} catch (error) {
		console.error("[publish-otp] OTP verification failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "Non è stato possibile verificare il codice. Riprova."};
	}
}

function rpcErrorMessage(message: string): PublishAnnouncementResult {
	if (message.includes("SUBMISSION_ALREADY_CONSUMED")) {
		return {
			status: "error",
			message: "Questo invio era già stato completato e l’annuncio è stato eliminato. Avvia un nuovo invio.",
		};
	}
	if (message.includes("PROFILE_NOT_ENABLED") || message.includes("REGISTERED_PROFILE_NOT_FOUND")) {
		return {status: "error", step: 1, message: "Il profilo selezionato non è abilitato o è stato nascosto."};
	}
	if (message.includes("PROFILE_TYPE_UNAVAILABLE")) {
		return {status: "error", step: 1, message: "Questa tipologia non può ancora pubblicare annunci."};
	}
	if (message.includes("INVALID_PUBLISH_PAYLOAD")) {
		return {status: "error", step: 3, message: "I dati dell’annuncio non sono validi. Controllali e riprova."};
	}
	if (
		message.includes("AUTH_REQUIRED")
		|| message.includes("EMAIL_VERIFICATION_REQUIRED")
		|| message.includes("EMAIL_ACCOUNT_MISMATCH")
	) {
		return {status: "error", step: 4, message: "La verifica email non è più valida. Richiedi un nuovo codice."};
	}
	return {status: "error", message: "Non è stato possibile pubblicare l’annuncio. Riprova tra poco."};
}

export async function publishAnnouncement(
	rawPayload: PublishAnnouncementPayload,
): Promise<PublishAnnouncementResult> {
	const account = await getAuthenticatedViewer();
	if (!account) {
		return {
			status: "error",
			step: 4,
			message: "Verifica il tuo indirizzo email prima di inviare l’annuncio.",
		};
	}

	let payload;
	try {
		payload = parsePublishPayload(rawPayload, Boolean(account.registeredAt));
	} catch (error) {
		if (error instanceof PublishPayloadError) {
			return {status: "error", step: error.step, message: error.message};
		}
		console.error("[publish-announcement] Payload validation failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", step: 3, message: "I dati dell’annuncio non sono validi."};
	}

	try {
		const supabase = await createClient();
		const rpcPayload = {
			profile_type: payload.profileType,
			announcement_type: payload.announcementType,
			profile_draft: payload.profileDraft,
			profile_locations: payload.profileLocations,
			detail: payload.detail,
			announcement_locations: payload.announcementLocations,
			contacts: payload.contacts,
		} as unknown as Json;
		const {data, error} = await supabase.rpc("publish_announcement_v1", {
			p_submission_id: payload.submissionId,
			p_payload: rpcPayload,
			p_terms_version: TERMS_VERSION,
			p_privacy_version: PRIVACY_VERSION,
		});

		if (error) {
			console.error("[publish-announcement] Publish RPC failed", {code: error.code});
			return rpcErrorMessage(error.message);
		}

		const result = data as PublishRpcResult | null;
		if (result?.status === "rate_limited" && typeof result.retryAt === "string") {
			return {
				status: "rate_limited",
				retryAt: result.retryAt,
				message: "Con questo indirizzo email è già stato pubblicato un annuncio nelle ultime 24 ore.",
			};
		}
		if (result?.status !== "success" || typeof result.announcementId !== "string") {
			return {status: "error", message: "La risposta del servizio di pubblicazione non è valida. Riprova."};
		}

		revalidatePath("/il-tuo-profilo");
		return {
			status: "success",
			announcementId: result.announcementId,
			moderationStatus: "in_revisione",
			idempotent: result.idempotent === true,
		};
	} catch (error) {
		console.error("[publish-announcement] Publish request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "Il servizio di pubblicazione non è momentaneamente disponibile. Riprova."};
	}
}
