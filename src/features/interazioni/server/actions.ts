"use server";

import "server-only";
import {revalidatePath} from "next/cache";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {type InteractionResult, isInteractionId} from "@/features/interazioni/interaction-model";
import {getOwnProfileId} from "@/features/interazioni/server/queries";
import {loadPublicPrimaryProfiles} from "@/features/profili/server/queries";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

const UNAVAILABLE: InteractionResult = {status: "error", message: "Operazione momentaneamente non disponibile. Riprova."};

export async function setProfileFollow(profileId: string, followed: boolean): Promise<InteractionResult> {
	if (!isInteractionId(profileId) || typeof followed !== "boolean") {
		return {status: "error", message: "Il profilo indicato non è valido."};
	}
	profileId = profileId.toLowerCase();
	try {
		const account = await getAuthenticatedViewer();
		if (!account) return {status: "guest"};
		if (!account.utenteId || !account.registeredAt) return {status: "registration-required"};
		const ownId = await getOwnProfileId(await createClient(), account.utenteId);
		if (!ownId) return UNAVAILABLE;
		if (ownId === profileId) return {status: "error", message: "Non puoi seguire il tuo stesso profilo."};
		// Unfollowing must still work if the target became unavailable.
		if (followed && (await loadPublicPrimaryProfiles([profileId])).length === 0) {
			return {status: "error", message: "Questo profilo non è più disponibile."};
		}
		const admin = createAdminClient();
		const {error} = followed
			? await admin.from("profilo_follow").upsert({uuid_profilo_follower: ownId, uuid_profilo_seguito: profileId}, {
				onConflict: "uuid_profilo_follower,uuid_profilo_seguito", ignoreDuplicates: true,
			})
			: await admin.from("profilo_follow").delete().eq("uuid_profilo_follower", ownId).eq("uuid_profilo_seguito", profileId);
		if (error) {
			console.error("[interactions] Follow mutation failed", {code: error.code});
			return UNAVAILABLE;
		}
		revalidatePath("/il-tuo-profilo");
		revalidatePath("/dettagli-profilo");
		return {status: "success", active: followed};
	} catch (error) {
		console.error("[interactions] Follow failed", {cause: error instanceof Error ? error.message : "unknown"});
		return UNAVAILABLE;
	}
}

export async function setAnnouncementSaved(announcementId: string, saved: boolean): Promise<InteractionResult> {
	if (!isInteractionId(announcementId) || typeof saved !== "boolean") {
		return {status: "error", message: "L’annuncio indicato non è valido."};
	}
	announcementId = announcementId.toLowerCase();
	try {
		const account = await getAuthenticatedViewer();
		if (!account) return {status: "guest"};
		if (!account.utenteId || !account.registeredAt) return {status: "registration-required"};
		const admin = createAdminClient();
		if (saved) {
			const {data, error} = await admin.from("annuncio").select("uuid")
				.eq("uuid", announcementId).eq("stato_annuncio", "pubblicato")
				.eq("nascosto", false).eq("privato", false).maybeSingle();
			if (error) return UNAVAILABLE;
			if (!data) return {status: "error", message: "Questo annuncio non è più disponibile."};
		}
		const {error} = saved
			? await admin.from("annuncio_salvato").upsert({uuid_utente: account.utenteId, uuid_annuncio: announcementId}, {
				onConflict: "uuid_utente,uuid_annuncio", ignoreDuplicates: true,
			})
			: await admin.from("annuncio_salvato").delete().eq("uuid_utente", account.utenteId).eq("uuid_annuncio", announcementId);
		if (error) {
			console.error("[interactions] Bookmark mutation failed", {code: error.code});
			return UNAVAILABLE;
		}
		revalidatePath("/il-tuo-profilo");
		revalidatePath("/dettagli-annuncio");
		return {status: "success", active: saved};
	} catch (error) {
		console.error("[interactions] Bookmark failed", {cause: error instanceof Error ? error.message : "unknown"});
		return UNAVAILABLE;
	}
}
