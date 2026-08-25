import "server-only";

import {
	createProfileDrafts,
	createProfileLocations,
	isProfileType,
	type ProfileType,
} from "@/features/profilo/profile-model";
import type {
	PublishableProfileType,
	PublishProfileContext,
} from "@/features/pubblica-annuncio/publish-model";
import {isPublishableProfileType} from "@/features/pubblica-annuncio/publish-model";
import {createClient} from "@/lib/supabase/server";

function hydrateDraft<Shape extends object>(defaults: Shape, row: object | null): Shape {
	if (!row) return defaults;
	const source = row as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(defaults).map(([key, defaultValue]) => [key, source[key] ?? defaultValue]),
	) as Shape;
}

function queryFailed(error: {code?: string} | null, source: string) {
	if (!error) return;
	console.error("[publish-announcement] Profile query failed", {source, code: error.code});
	throw new Error("PUBLISH_PROFILE_UNAVAILABLE");
}

export async function getPublishProfileContext(utenteId: string): Promise<PublishProfileContext | null> {
	const supabase = await createClient();
	const {data: baseProfile, error: baseProfileError} = await supabase
		.from("profilo")
		.select("uuid")
		.eq("uuid_utente", utenteId)
		.eq("nascosto", false)
		.maybeSingle();
	queryFailed(baseProfileError, "profilo");
	if (!baseProfile) return null;

	const [player, team, staff, referee, tournament, facility, locationResult] = await Promise.all([
		supabase.from("profilo_giocatore").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_squadra").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_staff_sportivo").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_arbitro").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_torneo_evento").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_campi_impianti").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("localita_profilo").select("id, sottoprofilo, regione, citta").eq("uuid_profilo", baseProfile.uuid).order("id"),
	]);

	queryFailed(player.error, "profilo_giocatore");
	queryFailed(team.error, "profilo_squadra");
	queryFailed(staff.error, "profilo_staff_sportivo");
	queryFailed(referee.error, "profilo_arbitro");
	queryFailed(tournament.error, "profilo_torneo_evento");
	queryFailed(facility.error, "profilo_campi_impianti");
	queryFailed(locationResult.error, "localita_profilo");

	const drafts = createProfileDrafts();
	drafts.giocatore = hydrateDraft(drafts.giocatore, player.data);
	drafts.squadra = hydrateDraft(drafts.squadra, team.data);
	drafts["staff-sportivo"] = hydrateDraft(drafts["staff-sportivo"], staff.data);
	drafts.arbitro = hydrateDraft(drafts.arbitro, referee.data);
	drafts["torneo-evento"] = hydrateDraft(drafts["torneo-evento"], tournament.data);
	drafts["campi-impianti-sportivi"] = hydrateDraft(drafts["campi-impianti-sportivi"], facility.data);

	const locations = createProfileLocations();
	for (const location of locationResult.data ?? []) {
		if (!location.sottoprofilo || !isProfileType(location.sottoprofilo)) continue;
		locations[location.sottoprofilo].push({regione: location.regione, citta: location.citta});
	}

	const activeRows: Array<[ProfileType, object | null]> = [
		["giocatore", player.data],
		["squadra", team.data],
		["staff-sportivo", staff.data],
		["arbitro", referee.data],
		["torneo-evento", tournament.data],
		["campi-impianti-sportivi", facility.data],
	];
	const enabledProfileTypes = activeRows.flatMap<PublishableProfileType>(([type, row]) => (
		row && isPublishableProfileType(type) ? [type] : []
	));

	return {profileId: baseProfile.uuid, enabledProfileTypes, drafts, locations};
}
