import "server-only";

import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/server/supabase";
import type {AnnouncementAuthor, AnnouncementAuthorProfileData} from "../announcement-model";
import {publicPlayerAge} from "@/features/dettagli-profilo/server/player-profile-data";
import {normalizePlayerPrimaryRoles} from "@/features/profilo/player-roles";
import {teamCategoryLabel} from "@/features/profilo/team-category-catalog";
import {availabilityLabel} from "@/features/profilo/public-profile-display";
import {normalizeFigures} from "@/features/pubblica-annuncio/types/category-catalog";
import {ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export function announcementAuthorProfileQuery(supabase: SupabaseClient<Database>) {
	// All relations are server-only. Only the normalized projection below leaves
	// this module. Keep this select out of directory and similar-announcement queries.
	return supabase.from("profilo").select(`
		uuid,
		profilo_giocatore(id, nascosto, giorno_nascita, mese_nascita, anno_nascita, tipologie_sport, ruoli_sport, storico_carriera),
		profilo_squadra(id, nascosto, tipologie_sport, categoria_attuale),
		profilo_staff_sportivo(id, nascosto, tipologie_sport, figure_professionali),
		profilo_arbitro(id, nascosto, tipologie_sport),
		profilo_torneo_evento(id, nascosto, tipologie_sport),
		profilo_campi_impianti(id, nascosto, tipologie_sport),
		profilo_servizi_consulenze(id, nascosto, specializzazioni, sede_professionista, disponibilita),
		profilo_creator(id, nascosto, tipologia_contenuti),
		localita_profilo(id_sottoprofilo, sottoprofilo, regione, citta)
	`).eq("nascosto", false);
}

function record(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function text(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}
function records(value: unknown) {
	return (Array.isArray(value) ? value : [value]).map(record).filter((item): item is Record<string, unknown> => Boolean(item));
}
function strings(value: unknown): string[] {
	return [...new Set((Array.isArray(value) ? value : []).map(text).filter((item): item is string => Boolean(item)))];
}

const PROFILE_RELATIONS = {
	giocatore: "profilo_giocatore", squadra: "profilo_squadra", "staff-sportivo": "profilo_staff_sportivo",
	arbitro: "profilo_arbitro", "torneo-evento": "profilo_torneo_evento", "campi-impianti-sportivi": "profilo_campi_impianti",
	"servizi-consulenze": "profilo_servizi_consulenze", creators: "profilo_creator",
} as const;

export async function loadAnnouncementAuthorProfile(
	supabase: SupabaseClient<Database>, profileId: string | null, author: AnnouncementAuthor,
): Promise<AnnouncementAuthorProfileData | null> {
	if (!profileId || author.kind === "unavailable") return null;
	try {
		const query = announcementAuthorProfileQuery(supabase).eq("uuid", profileId);
		const {data, error} = await (author.kind === "registered"
			? query.not("uuid_utente", "is", null) : query.is("uuid_utente", null)).maybeSingle();
		if (error) throw error;
		if (!data) return null;
		const row = data as unknown as Record<string, unknown>;
		const child = records(row[PROFILE_RELATIONS[author.profileType]]).find(item => item.nascosto === false);
		if (!child) return null;
		const player = author.profileType === "giocatore";
		const age = player ? publicPlayerAge({day: text(child.giorno_nascita) ?? "", month: text(child.mese_nascita) ?? "", year: text(child.anno_nascita) ?? ""}) : null;
		const birthYear = player && /^\d{4}$/.test(text(child.anno_nascita) ?? "")
			&& Number(child.anno_nascita) >= 1900 && Number(child.anno_nascita) <= new Date().getFullYear()
			? text(child.anno_nascita) : null;
		const roles = record(child.ruoli_sport);
		return {
			age, birthYear,
			sportTypes: ordinaTipologieCalcio(strings(child.tipologie_sport)),
			primaryRoles: player ? normalizePlayerPrimaryRoles(strings(roles?.principali)) : [],
			currentCategory: author.profileType === "squadra" ? teamCategoryLabel(text(child.categoria_attuale)) : null,
			previousCategories: player ? [...new Set(records(child.storico_carriera).map(item => text(item.ente)).filter((item): item is string => Boolean(item)))] : [],
			figures: normalizeFigures(strings(child.figure_professionali)),
			companyType: text(child.specializzazioni), headquarters: text(child.sede_professionista),
			availabilityLabel: availabilityLabel(text(child.disponibilita)),
			contentTypes: strings(Array.isArray(child.tipologia_contenuti) ? child.tipologia_contenuti : [child.tipologia_contenuti]),
			locations: records(row.localita_profilo)
				.filter(item => item.sottoprofilo === author.profileType && (item.id_sottoprofilo === null || item.id_sottoprofilo === child.id))
				.flatMap(item => text(item.regione) ? [{region: text(item.regione)!, city: text(item.citta)}] : []),
		};
	} catch (error) {
		console.error("[annunci] Author detail projection failed", {code: record(error)?.code ?? "UNKNOWN"});
		return null;
	}
}
