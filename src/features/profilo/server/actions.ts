"use server";

import "server-only";

import {revalidatePath} from "next/cache";

import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {
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
	return "Non è stato possibile aggiornare il profilo. Riprova.";
}

async function authenticatedUserId() {
	return (await getAuthenticatedViewer())?.userId ?? null;
}

function profileTypeFromUnknown(value: unknown): ProfileType | null {
	return typeof value === "string" && isProfileType(value) ? value : null;
}

export async function saveProfile(
	payload: ProfileEditorSavePayload,
): Promise<ProfileMutationResult> {
	const userId = await authenticatedUserId();
	if (!userId) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}

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
	} catch (error) {
		console.error("[profile-dashboard] Profile save request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		console.log("Error: ", error);
		return {status: "error", message: "Il salvataggio non è momentaneamente disponibile. Riprova."};
	}

	revalidatePath("/il-tuo-profilo");
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
