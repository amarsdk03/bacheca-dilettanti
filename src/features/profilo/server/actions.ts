"use server";

import "server-only";

import {revalidatePath} from "next/cache";

import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {
	isLimitedProfileType,
	isProfileType,
	type ProfileType,
} from "@/features/profilo/profile-model";
import type {
	ProfileEditorSavePayload,
	ProfileMutationResult,
} from "@/features/profilo/types";
import {
	parseProfileEditorPayload,
	RegistrationPayloadError,
} from "@/features/registrati/server/registration";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import type {Json} from "@/server/supabase";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANNOUNCEMENT_IMAGES_BUCKET = "immagini_annunci";
const PROFILE_TABLE_BY_TYPE = {
	giocatore: "profilo_giocatore",
	squadra: "profilo_squadra",
	"staff-sportivo": "profilo_staff_sportivo",
	"professionisti-studi": "profilo_professionista_studente",
	arbitro: "profilo_arbitro",
	creators: "profilo_creator",
	"torneo-evento": "profilo_torneo_evento",
	"campi-impianti-sportivi": "profilo_campi_impianti",
} as const satisfies Record<ProfileType, string>;

function profileRpcErrorMessage(message: string) {
	if (message.includes("PROFILE_LIMIT_REACHED")) {
		return "Hai già raggiunto il limite massimo di cinque sottoprofili.";
	}
	if (message.includes("PROFILE_TYPE_UNAVAILABLE")) {
		return "Questa tipologia non può essere abilitata al momento.";
	}
	if (message.includes("LAST_PROFILE_REQUIRED")) {
		return "Deve rimanere attivo almeno un sottoprofilo.";
	}
	if (message.includes("PROFILE_NOT_FOUND")) {
		return "Il sottoprofilo richiesto non è più disponibile.";
	}
	if (message.includes("BASE_PROFILE_NOT_FOUND")) {
		return "Il profilo principale dell’account non è disponibile.";
	}

	console.log("Errore: ", message);
	return "Non è stato possibile aggiornare il profilo. Riprova.";
}

async function authenticatedUserId() {
	return (await getAuthenticatedViewer())?.authUserId ?? null;
}

async function ownedSubprofileExists(
	profileUserId: string,
	type: ProfileType,
) {
	const admin = createAdminClient();
	const {data: profile, error: profileError} = await admin
		.from("profilo")
		.select("uuid")
		.eq("uuid_utente", profileUserId)
		.maybeSingle();
	if (profileError) throw profileError;
	if (!profile) return false;

	const {data: subprofile, error: subprofileError} = await admin
		.from(PROFILE_TABLE_BY_TYPE[type])
		.select("id")
		.eq("uuid_profilo", profile.uuid)
		.maybeSingle();
	if (subprofileError) throw subprofileError;

	return Boolean(subprofile);
}

async function syncPlayerHighlights(
	profileUserId: string,
	draft: Record<string, Json>,
) {
	const videoHighlights = draft.video_highlights;
	if (typeof videoHighlights !== "string") {
		return "INVALID_PROFILE_VIDEO_LINK";
	}

	const admin = createAdminClient();
	const {data: profile, error: profileError} = await admin
		.from("profilo")
		.select("uuid")
		.eq("uuid_utente", profileUserId)
		.maybeSingle();
	if (profileError || !profile) {
		return profileError?.code ?? "PROFILE_NOT_FOUND";
	}

	const link = videoHighlights.trim();
	if (!link) {
		const {error} = await admin
			.from("media_profilo")
			.delete()
			.eq("uuid_profilo", profile.uuid)
			.eq("formato_media", "video_highlights");
		return error?.code ?? null;
	}

	const {data: existingMedia, error: lookupError} = await admin
		.from("media_profilo")
		.select("id")
		.eq("uuid_profilo", profile.uuid)
		.eq("formato_media", "video_highlights")
		.maybeSingle();
	if (lookupError) return lookupError.code;

	if (existingMedia) {
		const {error} = await admin
			.from("media_profilo")
			.update({link_media: link})
			.eq("id", existingMedia.id);
		return error?.code ?? null;
	}

	const {error: insertError} = await admin
		.from("media_profilo")
		.insert({
			uuid_profilo: profile.uuid,
			formato_media: "video_highlights",
			link_media: link,
		});
	if (insertError?.code !== "23505") return insertError?.code ?? null;

	const {error: updateError} = await admin
		.from("media_profilo")
		.update({link_media: link})
		.eq("uuid_profilo", profile.uuid)
		.eq("formato_media", "video_highlights");
	return updateError?.code ?? null;
}

function profileTypeFromUnknown(value: unknown): ProfileType | null {
	return typeof value === "string" && isProfileType(value) ? value : null;
}

export async function saveProfile(
	payload: ProfileEditorSavePayload,
): Promise<ProfileMutationResult> {
	const account = await getAuthenticatedViewer();
	if (!account?.utenteId) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}
	const userId = account.authUserId;

	let normalized;
	try {
		normalized = parseProfileEditorPayload(payload);
	} catch (error) {
		if (error instanceof RegistrationPayloadError) {
			return {status: "error", message: error.message};
		}
		throw error;
	}

	try {
		if (
			isLimitedProfileType(normalized.type)
			&& !await ownedSubprofileExists(account.utenteId, normalized.type)
		) {
			return {status: "error", message: "Questa tipologia sarà disponibile prossimamente."};
		}

		const admin = createAdminClient();
		const {error} = await admin.rpc("save_owned_subprofile", {
			p_user_id: userId,
			p_profile_type: normalized.type,
			p_draft: normalized.draft as Json,
			p_locations: normalized.locations as Json,
		});

		if (error) {
			console.error("[profile-dashboard] Profile save failed", {code: error.code});
			return {status: "error", message: profileRpcErrorMessage(error.message)};
		}

		if (normalized.type === "giocatore") {
			// Highlights live in media_profilo, outside the player profile draft.
			const highlightsError = await syncPlayerHighlights(account.utenteId, normalized.draft);
			if (highlightsError) {
				console.error("[profile-dashboard] Player highlights save failed", {
					code: highlightsError,
				});
				return {
					status: "error",
					message: "Il profilo è stato aggiornato, ma non è stato possibile salvare il link degli highlights. Riprova.",
				};
			}
		}
	} catch (error) {
		console.error("[profile-dashboard] Profile save request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		console.log("Error: ", error);
		return {status: "error", message: "Il salvataggio non è momentaneamente disponibile. Riprova."};
	}

	revalidatePath("/il-tuo-profilo");
	revalidatePath("/dettagli-profilo");
	return {status: "success", message: "Il sottoprofilo è stato salvato."};
}

export async function setPrimaryProfile(
	rawProfileType: unknown,
): Promise<ProfileMutationResult> {
	const profileType = profileTypeFromUnknown(rawProfileType);
	if (!profileType) {
		return {status: "error", message: "La tipologia di profilo non è valida."};
	}

	const userId = await authenticatedUserId();
	if (!userId) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}

	try {
		const admin = createAdminClient();
		const {error} = await admin.rpc("set_owned_primary_subprofile", {
			p_user_id: userId,
			p_profile_type: profileType,
		});
		if (error) {
			console.error("[profile-dashboard] Primary profile update failed", {code: error.code});
			return {status: "error", message: profileRpcErrorMessage(error.message)};
		}
	} catch (error) {
		console.error("[profile-dashboard] Primary profile request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "La modifica non è momentaneamente disponibile. Riprova."};
	}

	revalidatePath("/il-tuo-profilo");
	return {status: "success", message: "Il sottoprofilo principale è stato aggiornato."};
}

export async function removeProfile(
	rawProfileType: unknown,
): Promise<ProfileMutationResult> {
	const profileType = profileTypeFromUnknown(rawProfileType);
	if (!profileType) {
		return {status: "error", message: "La tipologia di profilo non è valida."};
	}

	const userId = await authenticatedUserId();
	if (!userId) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}

	try {
		const admin = createAdminClient();
		const {error} = await admin.rpc("delete_owned_subprofile", {
			p_user_id: userId,
			p_profile_type: profileType,
		});
		if (error) {
			console.error("[profile-dashboard] Profile removal failed", {code: error.code});
			return {status: "error", message: profileRpcErrorMessage(error.message)};
		}
	} catch (error) {
		console.error("[profile-dashboard] Profile removal request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "La rimozione non è momentaneamente disponibile. Riprova."};
	}

	revalidatePath("/il-tuo-profilo");
	return {status: "success", message: "Il sottoprofilo è stato rimosso."};
}

export async function setAnnouncementVisibility(
	announcementId: unknown,
	hidden: unknown,
): Promise<ProfileMutationResult> {
	if (typeof announcementId !== "string" || !UUID_PATTERN.test(announcementId) || typeof hidden !== "boolean") {
		return {status: "error", message: "L’annuncio selezionato non è valido."};
	}

	const userId = await authenticatedUserId();
	if (!userId) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}
	void userId;

	const supabase = await createClient();
	const {data, error} = await supabase
		.from("annuncio")
		.update({nascosto: hidden})
		.eq("uuid", announcementId)
		.select("uuid")
		.maybeSingle();

	if (error) {
		console.error("[profile-dashboard] Announcement visibility update failed", {code: error.code});
		return {status: "error", message: "Non è stato possibile aggiornare la visibilità dell’annuncio."};
	}
	if (!data) {
		return {status: "error", message: "L’annuncio non è più disponibile oppure non appartiene al tuo account."};
	}

	revalidatePath("/il-tuo-profilo");
	return {
		status: "success",
		message: hidden ? "L’annuncio è stato nascosto." : "L’annuncio è nuovamente visibile.",
	};
}

export async function removeAnnouncement(
	announcementId: unknown,
): Promise<ProfileMutationResult> {
	if (typeof announcementId !== "string" || !UUID_PATTERN.test(announcementId)) {
		return {status: "error", message: "L’annuncio selezionato non è valido."};
	}

	const userId = await authenticatedUserId();
	if (!userId) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}
	void userId;

	const supabase = await createClient();
	const {data: mediaRows, error: mediaError} = await supabase
		.from("media_annuncio")
		.select("link_media")
		.eq("uuid_annuncio", announcementId);
	if (mediaError) {
		console.error("[profile-dashboard] Announcement media lookup failed", {code: mediaError.code});
	}
	const imagePaths = (mediaRows ?? []).map(({link_media}) => link_media).filter(Boolean);
	const {data, error} = await supabase
		.from("annuncio")
		.delete()
		.eq("uuid", announcementId)
		.select("uuid")
		.maybeSingle();

	if (error) {
		console.error("[profile-dashboard] Announcement removal failed", {code: error.code});
		return {status: "error", message: "Non è stato possibile eliminare l’annuncio."};
	}
	if (!data) {
		return {status: "error", message: "L’annuncio non è più disponibile oppure non appartiene al tuo account."};
	}
	if (imagePaths.length > 0) {
		const {error: storageError} = await createAdminClient().storage
			.from(ANNOUNCEMENT_IMAGES_BUCKET)
			.remove(imagePaths);
		if (storageError) console.error("[profile-dashboard] Announcement image cleanup failed", {message: storageError.message});
	}

	revalidatePath("/il-tuo-profilo");
	return {status: "success", message: "L’annuncio è stato eliminato."};
}
