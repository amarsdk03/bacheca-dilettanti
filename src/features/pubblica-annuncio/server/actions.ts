"use server";

import "server-only";

import {createHash} from "node:crypto";
import {revalidatePath} from "next/cache";

import {
	AUTH_EMAIL_FLOW,
	createAuthEmailFlowMetadata,
} from "@/features/auth/email-flow";
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
import {
	ANNOUNCEMENT_IMAGE_MIME_TYPES,
	MAX_ANNOUNCEMENT_IMAGE_BYTES,
} from "@/features/pubblica-annuncio/types/premiumAnnuncio";
import {
	getRegistrationEmailIdentity,
	setAuthEmailFlow,
} from "@/features/registrati/server/email-identity";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import type {Json} from "@/server/supabase";

const TERMS_VERSION = "2026-08-24";
const PRIVACY_VERSION = "2026-08-24";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OTP_PATTERN = /^\d{6}$/;
const REGISTERED_EMAIL_MESSAGE = "Email già registrata, accedi al profilo per pubblicare annunci";
const SIGNUP_PENDING_EMAIL_MESSAGE =
	"Questa email appartiene a una registrazione da confermare. Apri l’email di verifica oppure accedi per richiederne una nuova.";
const ANNOUNCEMENT_IMAGES_BUCKET = "immagini_annunci";

interface PublishRpcResult {
	status?: unknown;
	announcementId?: unknown;
	retryAt?: unknown;
	idempotent?: unknown;
}

interface PublishOtpQuotaRpcResult {
	status?: unknown;
	limit?: unknown;
	retryAt?: unknown;
}

interface UploadedAnnouncementImage {
	path: string;
	mimeType: typeof ANNOUNCEMENT_IMAGE_MIME_TYPES[number];
	newlyUploaded: boolean;
}

function detectedImageType(bytes: Uint8Array): UploadedAnnouncementImage["mimeType"] | null {
	if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
	if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
	return null;
}

async function uploadAnnouncementImage(
	file: File | null,
	authUserId: string,
	submissionId: string,
): Promise<UploadedAnnouncementImage | null> {
	if (!file || file.size === 0) return null;
	if (file.size > MAX_ANNOUNCEMENT_IMAGE_BYTES || !(ANNOUNCEMENT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
		throw new PublishPayloadError("Seleziona un’immagine PNG, JPEG o WebP di massimo 5 MB.", 3);
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const mimeType = detectedImageType(bytes);
	if (!mimeType || mimeType !== file.type) {
		throw new PublishPayloadError("Il contenuto dell’immagine non corrisponde al formato dichiarato.", 3);
	}

	const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
	const hash = createHash("sha256").update(bytes).digest("hex");
	const directory = `${authUserId}/${submissionId}`;
	const filename = `${hash}.${extension}`;
	const path = `${directory}/${filename}`;
	const admin = createAdminClient();
	const bucket = admin.storage.from(ANNOUNCEMENT_IMAGES_BUCKET);
	const {error} = await bucket.upload(path, bytes, {contentType: mimeType, upsert: false});
	if (!error) return {path, mimeType, newlyUploaded: true};

	const {data: existing, error: listError} = await bucket.list(directory, {limit: 1, search: filename});
	if (!listError && existing?.some(({name}) => name === filename)) {
		return {path, mimeType, newlyUploaded: false};
	}
	console.error("[publish-announcement] Image upload failed", {message: error.message});
	throw new PublishPayloadError("Non è stato possibile caricare l’immagine dell’annuncio.", 3);
}

async function removeUploadedImage(image: UploadedAnnouncementImage | null) {
	if (!image?.newlyUploaded) return;
	const {error} = await createAdminClient().storage.from(ANNOUNCEMENT_IMAGES_BUCKET).remove([image.path]);
	if (error) console.error("[publish-announcement] Image cleanup failed", {message: error.message});
}

async function removeUnreferencedRetryImage(
	image: UploadedAnnouncementImage | null,
	announcementId: string,
) {
	if (!image?.newlyUploaded) return;
	const admin = createAdminClient();
	const {data, error} = await admin
		.from("media_annuncio")
		.select("id")
		.eq("uuid_annuncio", announcementId)
		.eq("link_media", image.path)
		.limit(1);
	if (error) {
		console.error("[publish-announcement] Retry image lookup failed", {code: error.code});
		return;
	}
	if (!data?.length) await removeUploadedImage(image);
}

type PublishOtpQuotaResult =
	| {status: "allowed"; retryAt: string}
	| {status: "rate_limited"; limit: "cooldown" | "daily"; retryAt: string};

function normalizeEmail(value: unknown) {
	if (typeof value !== "string") return null;
	const email = value.trim().toLowerCase();
	return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

function validSubmissionId(value: unknown): value is string {
	return typeof value === "string" && UUID_PATTERN.test(value);
}

function normalizedRetryAt(value: unknown) {
	if (typeof value !== "string") return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function consumePublishOtpQuota(email: string): Promise<PublishOtpQuotaResult> {
	const emailHash = createHash("sha256").update(email, "utf8").digest("hex");
	const admin = createAdminClient();
	const {data, error} = await admin.rpc("consume_publish_email_otp_request_v1", {
		p_email_hash: emailHash,
	});

	if (error) {
		console.error("[publish-otp] Quota RPC failed", {code: error.code});
		throw new Error("PUBLISH_OTP_QUOTA_FAILED");
	}

	const result = data as PublishOtpQuotaRpcResult | null;
	const retryAt = normalizedRetryAt(result?.retryAt);
	if (result?.status === "allowed" && retryAt) {
		return {status: "allowed", retryAt};
	}
	if (
		result?.status === "rate_limited"
		&& (result.limit === "cooldown" || result.limit === "daily")
		&& retryAt
	) {
		return {status: "rate_limited", limit: result.limit, retryAt};
	}

	console.error("[publish-otp] Quota RPC returned an invalid payload");
	throw new Error("PUBLISH_OTP_QUOTA_INVALID_RESPONSE");
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

		const identity = await getRegistrationEmailIdentity(email);
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

		if (identity.status === "registered") {
			return {status: "already_registered", message: REGISTERED_EMAIL_MESSAGE};
		}
		if (identity.status === "signup_pending") {
			return {status: "already_registered", message: SIGNUP_PENDING_EMAIL_MESSAGE};
		}

		const quota = await consumePublishOtpQuota(email);
		if (quota.status === "rate_limited") {
			return {
				status: "rate_limited",
				limit: quota.limit,
				retryAt: quota.retryAt,
				message: quota.limit === "daily"
					? "Hai raggiunto il limite di 5 richieste nelle ultime 24 ore."
					: "Attendi 60 secondi prima di richiedere un nuovo codice.",
			};
		}

		if (identity.status === "recovery_required") {
			await setAuthEmailFlow(identity.authUserId, AUTH_EMAIL_FLOW.ANNOUNCEMENT_OTP);
		}

		const {error} = await supabase.auth.signInWithOtp({
			email,
			options: {
				shouldCreateUser: true,
				data: createAuthEmailFlowMetadata(AUTH_EMAIL_FLOW.ANNOUNCEMENT_OTP),
			},
		});

		if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
			return {
				status: "rate_limited",
				limit: "provider",
				retryAt: quota.retryAt,
				message: getAuthErrorMessage(error),
			};
		}
		if (error) {
			return {status: "error", message: getAuthErrorMessage(error)};
		}

		return {
			status: "sent",
			message: "Ti abbiamo inviato un codice di verifica a 6 cifre.",
			retryAt: quota.retryAt,
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

		const identity = await getRegistrationEmailIdentity(email);
		if (identity.status === "registered" || identity.status === "signup_pending") {
			await supabase.auth.signOut({scope: "local"});
			return {
				status: "already_registered",
				message: identity.status === "signup_pending"
					? SIGNUP_PENDING_EMAIL_MESSAGE
					: REGISTERED_EMAIL_MESSAGE,
			};
		}
		if (identity.status !== "recovery_required" || identity.authUserId !== data.user.id) {
			await supabase.auth.signOut({scope: "local"});
			return {status: "error", message: "L’indirizzo verificato non corrisponde all’account atteso."};
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
	if (message.includes("PROFILE_UPDATE_NOT_ALLOWED") || message.includes("INVALID_PROFILE_PAYLOAD")) {
		return {status: "error", step: 2, message: "Non è stato possibile salvare le modifiche del profilo. Controlla i dati e riprova."};
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
	formData: FormData,
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
		const serializedPayload = formData.get("payload");
		if (typeof serializedPayload !== "string") {
			throw new PublishPayloadError("I dati dell’annuncio sono mancanti.", 3);
		}
		const rawPayload = JSON.parse(serializedPayload) as PublishAnnouncementPayload;
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

	let uploadedImage: UploadedAnnouncementImage | null = null;
	try {
		const supabase = await createClient();
		const {data: authData, error: authError} = await supabase.auth.getUser();
		if (authError || !authData.user) {
			return {status: "error", step: 4, message: "La sessione non è più valida. Accedi o verifica nuovamente l’email."};
		}
		const imageEntry = formData.get("image");
		uploadedImage = await uploadAnnouncementImage(
			imageEntry instanceof File ? imageEntry : null,
			authData.user.id,
			payload.submissionId,
		);
		const rpcPayload = {
			profile_type: payload.profileType,
			announcement_type: payload.announcementType,
			profile_draft: payload.profileDraft,
			profile_locations: payload.profileLocations,
			profile_update: payload.profileUpdate ? {
				profile_type: payload.profileUpdate.type,
				draft: payload.profileUpdate.draft,
				locations: payload.profileUpdate.locations,
			} : null,
			detail: payload.detail,
			announcement_locations: payload.announcementLocations,
			contacts: payload.contacts,
			premium: {
				generic_link: payload.extras.genericLink || null,
				video_highlights: payload.extras.videoHighlights || null,
				image_path: uploadedImage?.path ?? null,
				image_mime: uploadedImage?.mimeType ?? null,
			},
		} as unknown as Json;
		const {data, error} = await supabase.rpc("publish_announcement_v1", {
			p_submission_id: payload.submissionId,
			p_payload: rpcPayload,
			p_terms_version: TERMS_VERSION,
			p_privacy_version: PRIVACY_VERSION,
		});

		if (error) {
			console.error("[publish-announcement] Publish RPC failed", {code: error.code});
			await removeUploadedImage(uploadedImage);
			return rpcErrorMessage(error.message);
		}

		const result = data as PublishRpcResult | null;
		if (result?.status === "rate_limited" && typeof result.retryAt === "string") {
			await removeUploadedImage(uploadedImage);
			return {
				status: "rate_limited",
				retryAt: result.retryAt,
				message: "Con questo indirizzo email è già stato pubblicato un annuncio nelle ultime 24 ore.",
			};
		}
		if (result?.status !== "success" || typeof result.announcementId !== "string") {
			await removeUploadedImage(uploadedImage);
			return {status: "error", message: "La risposta del servizio di pubblicazione non è valida. Riprova."};
		}
		if (result.idempotent === true) {
			await removeUnreferencedRetryImage(uploadedImage, result.announcementId);
		}

		revalidatePath("/il-tuo-profilo");
		return {
			status: "success",
			announcementId: result.announcementId,
			moderationStatus: "in_revisione",
			idempotent: result.idempotent === true,
		};
	} catch (error) {
		if (error instanceof PublishPayloadError) {
			await removeUploadedImage(uploadedImage);
			return {status: "error", step: error.step, message: error.message};
		}
		console.error("[publish-announcement] Publish request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "Il servizio di pubblicazione non è momentaneamente disponibile. Riprova."};
	}
}
