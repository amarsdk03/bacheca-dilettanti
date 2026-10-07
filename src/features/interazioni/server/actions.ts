"use server";

import "server-only";
import {revalidatePath} from "next/cache";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {type InteractionResult, type InteractionTarget, isInteractionId} from "@/features/interazioni/interaction-model";
import {isProfileType, type ProfileType} from "@/features/profilo/profile-model";
import {createAdminClient} from "@/lib/supabase/admin";

const UNAVAILABLE: InteractionResult = {status: "error", message: "Operazione momentaneamente non disponibile. Riprova."};

export async function setProfileFollow(target: InteractionTarget, followed: boolean, sourceType?: ProfileType): Promise<InteractionResult> {
	if (!target || target.kind !== "profilo" || !isInteractionId(target.id) || !isProfileType(target.profileType)
		|| typeof followed !== "boolean" || (followed && (!sourceType || !isProfileType(sourceType)))) {
		return {status: "error", message: "Il profilo indicato non è valido."};
	}
	try {
		const account = await getAuthenticatedViewer();
		if (!account) return {status: "guest"};
		if (!account.utenteId || !account.registeredAt) return {status: "registration-required"};
		const {data, error} = await createAdminClient().rpc("set_profile_follow_v2", {
			p_user: account.utenteId, p_target: target.id.toLowerCase(), p_target_type: target.profileType,
			p_source_type: sourceType ?? null, p_followed: followed,
		});
		if (error) {
			if (error.message.includes("FOLLOW_DAILY_LIMIT")) return {status: "error", message: "Hai raggiunto il limite di 30 nuovi Follow al giorno. Riprova domani."};
			if (error.message.includes("FOLLOW_SELF")) return {status: "error", message: "Non puoi seguire un profilo del tuo account."};
			if (error.message.includes("FOLLOW_PROFILE_UNAVAILABLE")) return {status: "error", message: "Questo sottoprofilo non è più disponibile. Ricarica la pagina e riprova."};
			console.error("[interactions] Follow mutation failed", {code: error.code});
			return UNAVAILABLE;
		}
		const result = data as {active: boolean; sourceType: ProfileType | null};
		revalidatePath("/il-tuo-profilo");
		revalidatePath("/dettagli-profilo");
		return {status: "success", active: result.active, sourceType: result.sourceType};
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
