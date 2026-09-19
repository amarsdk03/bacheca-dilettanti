import "server-only";

import type {SupabaseClient} from "@supabase/supabase-js";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {loadPublicAnnouncementsByIds} from "@/features/annunci/server/queries";
import {loadPublicPrimaryProfiles} from "@/features/profili/server/queries";
import {
	type DashboardInteractions,
	type InteractionList,
	type InteractionState,
	type InteractionTarget,
	type RelationshipProfile,
	resolveSavedAnnouncements,
	type SavedAnnouncement,
} from "@/features/interazioni/interaction-model";
import {createClient} from "@/lib/supabase/server";
import type {Database, Tables} from "@/server/supabase";

const BATCH_SIZE = 250;

export async function getOwnProfileId(supabase: SupabaseClient<Database>, userId: string) {
	const {data, error} = await supabase.from("profilo").select("uuid")
		.eq("uuid_utente", userId).eq("nascosto", false).maybeSingle();
	if (error) throw new Error("OWN_PROFILE_UNAVAILABLE");
	return data?.uuid ?? null;
}

export async function getInteractionState(target: InteractionTarget): Promise<InteractionState> {
	try {
		const targetId = target.id.toLowerCase();
		const account = await getAuthenticatedViewer();
		if (!account) return {status: "guest"};
		if (!account.utenteId || !account.registeredAt) return {status: "registration-required"};
		const supabase = await createClient();
		if (target.kind === "annuncio") {
			const {data, error} = await supabase.from("annuncio_salvato").select("uuid_annuncio")
				.eq("uuid_utente", account.utenteId).eq("uuid_annuncio", targetId).maybeSingle();
			if (error) throw new Error("SAVED_ANNOUNCEMENT_STATE_UNAVAILABLE");
			return {status: "ready", active: Boolean(data)};
		}
		const profileId = await getOwnProfileId(supabase, account.utenteId);
		if (!profileId) return {status: "error"};
		if (profileId === targetId) return {status: "own-profile"};
		const {data, error} = await supabase.from("profilo_follow").select("uuid_profilo_seguito")
			.eq("uuid_profilo_follower", profileId).eq("uuid_profilo_seguito", targetId).maybeSingle();
		if (error) throw new Error("FOLLOW_STATE_UNAVAILABLE");
		return {status: "ready", active: Boolean(data)};
	} catch (error) {
		console.error("[interactions] State lookup failed", {cause: error instanceof Error ? error.message : "unknown"});
		return {status: "error"};
	}
}

async function loadRelationships(
	supabase: SupabaseClient<Database>, profileId: string | null, direction: "followers" | "following",
): Promise<InteractionList<RelationshipProfile>> {
	if (!profileId) return {status: "success", items: []};
	try {
		const ownerColumn = direction === "followers" ? "uuid_profilo_seguito" : "uuid_profilo_follower";
		const otherColumn = direction === "followers" ? "uuid_profilo_follower" : "uuid_profilo_seguito";
		const rows: Tables<"profilo_follow">[] = [];
		for (let offset = 0; ; offset += BATCH_SIZE) {
			const {data, error} = await supabase.from("profilo_follow")
				.select("uuid_profilo_follower, uuid_profilo_seguito, creato_il")
				.eq(ownerColumn, profileId).order("creato_il", {ascending: false})
				.order(otherColumn, {ascending: false}).range(offset, offset + BATCH_SIZE - 1);
			if (error) throw new Error("RELATIONSHIPS_UNAVAILABLE");
			rows.push(...data);
			if (data.length < BATCH_SIZE) break;
		}
		const profiles = await loadPublicPrimaryProfiles(rows.map((row) => row[otherColumn]));
		const byId = new Map(profiles.map((profile) => [profile.id, profile]));
		return {status: "success", items: rows.flatMap((row) => {
			const profile = byId.get(row[otherColumn]);
			return profile ? [{
				id: profile.id, type: profile.type, title: profile.title,
				imageUrl: profile.imageUrl, followedAt: row.creato_il,
			}] : [];
		})};
	} catch (error) {
		console.error("[interactions] Relationship lookup failed", {direction, cause: error instanceof Error ? error.message : "unknown"});
		return {status: "error"};
	}
}

async function loadSavedAnnouncements(
	supabase: SupabaseClient<Database>, userId: string,
): Promise<InteractionList<SavedAnnouncement>> {
	try {
		const rows: {uuid_annuncio: string; salvato_il: string}[] = [];
		for (let offset = 0; ; offset += BATCH_SIZE) {
			const {data, error} = await supabase.from("annuncio_salvato").select("uuid_annuncio, salvato_il")
				.eq("uuid_utente", userId).order("salvato_il", {ascending: false})
				.order("uuid_annuncio", {ascending: false}).range(offset, offset + BATCH_SIZE - 1);
			if (error) throw new Error("SAVED_ANNOUNCEMENTS_UNAVAILABLE");
			rows.push(...data);
			if (data.length < BATCH_SIZE) break;
		}
		const announcements = await loadPublicAnnouncementsByIds(rows.map((row) => row.uuid_annuncio));
		return {status: "success", items: resolveSavedAnnouncements(rows, announcements)};
	} catch (error) {
		console.error("[interactions] Saved announcement lookup failed", {cause: error instanceof Error ? error.message : "unknown"});
		return {status: "error"};
	}
}

export async function getDashboardInteractions(
	supabase: SupabaseClient<Database>, userId: string, profileId: string | null,
): Promise<DashboardInteractions> {
	const [followers, following, savedAnnouncements] = await Promise.all([
		loadRelationships(supabase, profileId, "followers"),
		loadRelationships(supabase, profileId, "following"),
		loadSavedAnnouncements(supabase, userId),
	]);
	return {followers, following, savedAnnouncements};
}
