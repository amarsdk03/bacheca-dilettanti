"use server";

import "server-only";

import {revalidatePath} from "next/cache";
import {randomUUID} from "node:crypto";

import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {isComingSoonProfileType, isProfileType, type ProfileType,} from "@/features/profilo/profile-model";
import {
	isProfileImageScope,
	PROFILE_IMAGE_MEDIA_FORMAT,
	PROFILE_IMAGES_BUCKET,
	type ProfileImageScope,
} from "@/features/profilo/profile-image";
import {optimizeProfileImage} from "@/features/profilo/server/profile-image-processing";
import type {
	ProfileEditorSavePayload,
	ProfileImageMutationResult,
	ProfileMutationResult,
} from "@/features/profilo/types";
import {parseProfileEditorPayload, RegistrationPayloadError,} from "@/features/registrati/server/registration";
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

function revalidateProfileImages() {
	revalidatePath("/il-tuo-profilo");
	revalidatePath("/profili");
	revalidatePath("/annunci");
	revalidatePath("/dettagli-profilo");
}

async function ownedBaseProfile() {
	const account = await getAuthenticatedViewer();
	if (!account?.utenteId) return null;

	const admin = createAdminClient();
	const {data, error} = await admin
		.from("profilo")
		.select("uuid, link_foto_profilo")
		.eq("uuid_utente", account.utenteId)
		.eq("nascosto", false)
		.maybeSingle();
	if (error) throw error;
	return data ? {account, admin, profile: data} : null;
}

async function assertActiveImageScope(
	admin: ReturnType<typeof createAdminClient>,
	profileId: string,
	scope: ProfileImageScope,
) {
	if (scope === "main") return true;
	const {data, error} = await admin
		.from(PROFILE_TABLE_BY_TYPE[scope])
		.select("id")
		.eq("uuid_profilo", profileId)
		.eq("nascosto", false)
		.maybeSingle();
	if (error) throw error;
	return Boolean(data);
}

function imageMetadataQuery(
	admin: ReturnType<typeof createAdminClient>,
	profileId: string,
	scope: ProfileImageScope,
) {
	let query = admin
		.from("media_profilo")
		.select("id, link_media, storage_path")
		.eq("uuid_profilo", profileId)
		.eq("formato_media", PROFILE_IMAGE_MEDIA_FORMAT);
	query = scope === "main"
		? query.is("sottoprofilo", null)
		: query.eq("sottoprofilo", scope);
	return query.maybeSingle();
}

function imageErrorMessage(error: unknown) {
	if (error instanceof Error && error.message === "PROFILE_IMAGE_TOO_LARGE") {
		return "L’immagine ottimizzata supera il limite consentito. Scegli una foto diversa.";
	}
	if (error instanceof Error && error.message === "INVALID_PROFILE_IMAGE") {
		return "Seleziona un’immagine JPEG, PNG o WebP valida di massimo 5 MB.";
	}
	return "Non è stato possibile aggiornare la foto. Riprova.";
}

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

function profileTypeFromUnknown(value: unknown): ProfileType | null {
	return typeof value === "string" && isProfileType(value) ? value : null;
}

export async function saveProfileImage(
	rawScope: unknown,
	formData: FormData,
): Promise<ProfileImageMutationResult> {
	if (!isProfileImageScope(rawScope)) {
		return {status: "error", message: "La tipologia di profilo non è valida."};
	}
	if (!(formData instanceof FormData)) {
		return {status: "error", message: "Seleziona una foto da caricare."};
	}
	const file = formData.get("image");
	if (!(file instanceof File)) {
		return {status: "error", message: "Seleziona una foto da caricare."};
	}

	let uploadedPath: string | null = null;
	try {
		const owned = await ownedBaseProfile();
		if (!owned) return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
		const {admin, profile} = owned;
		if (!await assertActiveImageScope(admin, profile.uuid, rawScope)) {
			return {status: "error", message: "Il sottoprofilo selezionato non è più disponibile."};
		}

		const bytes = await optimizeProfileImage(file);
		const previousResult = await imageMetadataQuery(admin, profile.uuid, rawScope);
		if (previousResult.error) throw previousResult.error;
		const previous = previousResult.data;
		const scopePath = rawScope === "main" ? "principale" : rawScope;
		uploadedPath = `${profile.uuid}/${scopePath}/${randomUUID()}.webp`;
		const bucket = admin.storage.from(PROFILE_IMAGES_BUCKET);
		const {error: uploadError} = await bucket.upload(uploadedPath, bytes, {
			contentType: "image/webp",
			cacheControl: "31536000",
			upsert: false,
		});
		if (uploadError) throw uploadError;
		const imageUrl = bucket.getPublicUrl(uploadedPath).data.publicUrl;

		let metadataError: {message: string} | null = null;
		let insertedMetadataId: number | null = null;
		if (previous) {
			const {error} = await admin
				.from("media_profilo")
				.update({link_media: imageUrl, storage_path: uploadedPath})
				.eq("id", previous.id);
			metadataError = error;
		} else {
			const {data, error} = await admin
				.from("media_profilo")
				.insert({
					uuid_profilo: profile.uuid,
					formato_media: PROFILE_IMAGE_MEDIA_FORMAT,
					sottoprofilo: rawScope === "main" ? null : rawScope,
					link_media: imageUrl,
					storage_path: uploadedPath,
				})
				.select("id")
				.single();
			metadataError = error;
			insertedMetadataId = data?.id ?? null;
		}
		if (metadataError) throw metadataError;

		if (rawScope === "main") {
			const {error: profileError} = await admin
				.from("profilo")
				.update({link_foto_profilo: imageUrl})
				.eq("uuid", profile.uuid);
			if (profileError) {
				if (previous) {
					await admin.from("media_profilo").update({
						link_media: previous.link_media,
						storage_path: previous.storage_path,
					}).eq("id", previous.id);
				} else if (insertedMetadataId !== null) {
					await admin.from("media_profilo").delete().eq("id", insertedMetadataId);
				}
				throw profileError;
			}
		}

		if (previous?.storage_path && previous.storage_path !== uploadedPath) {
			const {error: cleanupError} = await bucket.remove([previous.storage_path]);
			if (cleanupError) console.error("[profile-images] Previous image cleanup failed", {message: cleanupError.message});
		}
		uploadedPath = null;
		revalidateProfileImages();
		return {status: "success", message: "La foto profilo è stata aggiornata.", imageUrl};
	} catch (error) {
		if (uploadedPath) {
			const {error: cleanupError} = await createAdminClient().storage.from(PROFILE_IMAGES_BUCKET).remove([uploadedPath]);
			if (cleanupError) console.error("[profile-images] Failed upload cleanup failed", {message: cleanupError.message});
		}
		console.error("[profile-images] Upload failed", {cause: error instanceof Error ? error.message : "unknown"});
		return {status: "error", message: imageErrorMessage(error)};
	}
}

export async function removeProfileImage(
	rawScope: unknown,
): Promise<ProfileImageMutationResult> {
	if (!isProfileImageScope(rawScope)) {
		return {status: "error", message: "La tipologia di profilo non è valida."};
	}

	try {
		const owned = await ownedBaseProfile();
		if (!owned) return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
		const {admin, profile} = owned;
		if (!await assertActiveImageScope(admin, profile.uuid, rawScope)) {
			return {status: "error", message: "Il sottoprofilo selezionato non è più disponibile."};
		}

		const previousResult = await imageMetadataQuery(admin, profile.uuid, rawScope);
		if (previousResult.error) throw previousResult.error;
		const previous = previousResult.data;
		if (rawScope === "main") {
			const {error} = await admin.from("profilo").update({link_foto_profilo: null}).eq("uuid", profile.uuid);
			if (error) throw error;
		}
		if (previous) {
			const {error} = await admin.from("media_profilo").delete().eq("id", previous.id);
			if (error) {
				if (rawScope === "main") {
					await admin.from("profilo").update({link_foto_profilo: profile.link_foto_profilo}).eq("uuid", profile.uuid);
				}
				throw error;
			}
		}
		if (previous?.storage_path) {
			const {error} = await admin.storage.from(PROFILE_IMAGES_BUCKET).remove([previous.storage_path]);
			if (error) console.error("[profile-images] Removed image cleanup failed", {message: error.message});
		}

		revalidateProfileImages();
		return {status: "success", message: "La foto profilo è stata rimossa.", imageUrl: null};
	} catch (error) {
		console.error("[profile-images] Removal failed", {cause: error instanceof Error ? error.message : "unknown"});
		return {status: "error", message: "Non è stato possibile rimuovere la foto. Riprova."};
	}
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
		const admin = createAdminClient();
		if (isComingSoonProfileType(normalized.type)) {
			const {data: baseProfile, error: baseProfileError} = await admin
				.from("profilo")
				.select("uuid")
				.eq("uuid_utente", account.utenteId)
				.eq("nascosto", false)
				.maybeSingle();
			if (baseProfileError) throw baseProfileError;

			const {data: existingProfile, error: existingProfileError} = baseProfile
				? await admin
					.from(PROFILE_TABLE_BY_TYPE[normalized.type])
					.select("id")
					.eq("uuid_profilo", baseProfile.uuid)
					.eq("nascosto", false)
					.maybeSingle()
				: {data: null, error: null};
			if (existingProfileError) throw existingProfileError;
			if (!existingProfile) {
				return {status: "error", message: "Questa tipologia sarÃ  disponibile prossimamente."};
			}
		}
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

		const {error: socialLinksError} = await admin.rpc("save_owned_profile_social_links_v1", {
			p_user_id: userId,
			p_profile_type: normalized.type,
			p_social_links: normalized.socialLinks as Json,
		});
		if (socialLinksError) {
			console.error("[profile-dashboard] Profile social links save failed", {code: socialLinksError.code});
			return {
				status: "error",
				message: "Il profilo è stato aggiornato, ma non è stato possibile salvare i link social. Riprova.",
			};
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

	let owned;
	try {
		owned = await ownedBaseProfile();
	} catch {
		owned = null;
	}
	if (!owned) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}

	try {
		const {admin, account, profile} = owned;
		const imageResult = await imageMetadataQuery(admin, profile.uuid, profileType);
		if (imageResult.error) throw imageResult.error;
		const {error} = await admin.rpc("delete_owned_subprofile", {
			p_user_id: account.authUserId,
			p_profile_type: profileType,
		});
		if (error) {
			console.error("[profile-dashboard] Profile removal failed", {code: error.code});
			return {status: "error", message: profileRpcErrorMessage(error.message)};
		}
		if (imageResult.data) {
			const {error: metadataError} = await admin.from("media_profilo").delete().eq("id", imageResult.data.id);
			if (metadataError) {
				console.error("[profile-images] Removed subprofile metadata cleanup failed", {code: metadataError.code});
			} else if (imageResult.data.storage_path) {
				const {error: storageError} = await admin.storage.from(PROFILE_IMAGES_BUCKET).remove([imageResult.data.storage_path]);
				if (storageError) console.error("[profile-images] Removed subprofile storage cleanup failed", {message: storageError.message});
			}
		}
	} catch (error) {
		console.error("[profile-dashboard] Profile removal request failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return {status: "error", message: "La rimozione non è momentaneamente disponibile. Riprova."};
	}

	revalidateProfileImages();
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

export async function setNewsletterSubscription(
	enabled: unknown,
): Promise<ProfileMutationResult> {
	if (typeof enabled !== "boolean") {
		return {status: "error", message: "La preferenza newsletter non è valida."};
	}

	const account = await getAuthenticatedViewer();
	if (!account?.utenteId || !account.registeredAt) {
		return {status: "error", message: "La sessione non è più valida. Accedi di nuovo."};
	}

	const changedAt = new Date().toISOString();
	const {data, error} = await createAdminClient()
		.from("utente")
		.update({
			consenso_newsletter: enabled,
			consenso_newsletter_aggiornato_il: changedAt,
			ultima_modifica_il: changedAt,
		})
		.eq("utente_uuid", account.utenteId)
		.eq("auth_user_uuid", account.authUserId)
		.select("utente_uuid")
		.maybeSingle();

	if (error) {
		console.error("[profile-dashboard] Newsletter preference update failed", {code: error.code});
		return {status: "error", message: "Non è stato possibile aggiornare la preferenza newsletter."};
	}
	if (!data) {
		return {status: "error", message: "L’account non è più disponibile."};
	}

	revalidatePath("/il-tuo-profilo");
	return {
		status: "success",
		message: enabled
			? "Riceverai notizie e newsletter dalla piattaforma."
			: "Non riceverai più notizie e newsletter dalla piattaforma.",
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
