import "server-only";

import type {SupabaseClient} from "@supabase/supabase-js";

import {
	normalizeTeamSearchQuery,
	type PublicTeamProfile,
	TEAM_PROFILE_SEARCH_LIMIT,
	TEAM_PROFILE_SEARCH_MIN_LENGTH,
	UUID_PATTERN,
} from "@/features/profilo/team-profile";
import {resolvedProfileImageUrl} from "@/features/profilo/profile-image";
import {loadProfileImageUrlMap} from "@/features/profilo/server/profile-images";
import type {Database} from "@/server/supabase";

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function records(value: unknown) {
	return Array.isArray(value) ? value.filter(isRecord) : [];
}

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function locationLabel(value: unknown) {
	const locations = records(value)
		.filter((location) => location.sottoprofilo === "squadra")
		.map((location) => [cleanText(location.citta), cleanText(location.regione)].filter(Boolean).join(", "))
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right, "it-IT"));
	return locations[0] ?? null;
}

export async function loadPublicTeamProfiles(
	supabase: SupabaseClient<Database>,
	requestedIds: readonly string[],
): Promise<PublicTeamProfile[]> {
	const ids = [...new Set(requestedIds
		.map((id) => id.trim().toLocaleLowerCase("en-US"))
		.filter((id) => UUID_PATTERN.test(id)))];
	if (ids.length === 0) return [];

	const chunks = Array.from({length: Math.ceil(ids.length / 100)}, (_, index) => ids.slice(index * 100, index * 100 + 100));
	const results = await Promise.all(chunks.map(async (chunk) => {
		const [profilesResult, teamsResult] = await Promise.all([
			supabase
				.from("profilo")
				.select("uuid, link_foto_profilo, localita_profilo(sottoprofilo, regione, citta)")
				.in("uuid", chunk)
				.eq("nascosto", false)
				.not("uuid_utente", "is", null),
			supabase
				.from("profilo_squadra")
				.select("uuid_profilo, nome_societa")
				.in("uuid_profilo", chunk)
				.eq("nascosto", false),
		]);
		if (profilesResult.error) throw profilesResult.error;
		if (teamsResult.error) throw teamsResult.error;
		return {profiles: profilesResult.data ?? [], teams: teamsResult.data ?? []};
	}));
	const profiles = results.flatMap(({profiles: rows}) => rows);
	const teams = results.flatMap(({teams: rows}) => rows);
	const profileImages = await loadProfileImageUrlMap(supabase, profiles.map(({uuid}) => uuid));

	const teamsById = new Map(teams.flatMap((team) => {
		const name = cleanText(team.nome_societa);
		return name ? [[team.uuid_profilo, name] as const] : [];
	}));
	const order = new Map(ids.map((id, index) => [id, index]));

	return profiles.flatMap((profile): PublicTeamProfile[] => {
		const name = teamsById.get(profile.uuid);
		if (!name) return [];
		return [{
			profileId: profile.uuid,
			name,
			imageUrl: resolvedProfileImageUrl(profileImages, profile.uuid, "squadra", cleanText(profile.link_foto_profilo)),
			location: locationLabel(profile.localita_profilo),
		}];
	}).sort((left, right) => (order.get(left.profileId) ?? 0) - (order.get(right.profileId) ?? 0));
}

export async function searchPublicTeamProfiles(
	supabase: SupabaseClient<Database>,
	rawQuery: string,
): Promise<PublicTeamProfile[]> {
	const query = normalizeTeamSearchQuery(rawQuery);
	if (query.length < TEAM_PROFILE_SEARCH_MIN_LENGTH) return [];

	const {data, error} = await supabase
		.from("profilo_squadra")
		.select("uuid_profilo")
		.eq("nascosto", false)
		.ilike("nome_societa", `%${query}%`)
		.order("nome_societa", {ascending: true})
		.limit(TEAM_PROFILE_SEARCH_LIMIT * 3);
	if (error) throw error;

	return (await loadPublicTeamProfiles(
		supabase,
		(data ?? []).map(({uuid_profilo}) => uuid_profilo),
	)).slice(0, TEAM_PROFILE_SEARCH_LIMIT);
}
