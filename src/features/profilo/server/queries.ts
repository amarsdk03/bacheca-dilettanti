import "server-only";

import type {QueryData, SupabaseClient} from "@supabase/supabase-js";

import {
	createProfileDrafts,
	createProfileLocations,
	isProfileType,
	PROFILE_OPTIONS,
	type ProfileType,
} from "@/features/profilo/profile-model";
import type {
	ManagedAnnouncement,
	ProfileDashboardData,
} from "@/features/profilo/types";
import {createClient} from "@/lib/supabase/server";
import type {Database} from "@/server/supabase";

const ANNOUNCEMENT_PAGE_SIZE = 250;

const DETAIL_DEFINITIONS = [
	{
		key: "annuncio_generico",
		subtype: "Generico",
		fallbackTitle: "Annuncio generico",
		titleFields: ["titolo"],
		descriptionFields: ["contenuto"],
	},
	{
		key: "annuncio_giocatore",
		subtype: "Giocatore",
		fallbackTitle: "Disponibilità giocatore",
		titleFields: ["ruoli_principali", "categorie_ricercate"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_squadra_cerca_giocatore",
		subtype: "Squadra cerca giocatore",
		fallbackTitle: "Ricerca giocatore",
		titleFields: ["ruoli_principali"],
		descriptionFields: ["descrizione_aggiuntiva", "stagione"],
	},
	{
		key: "annuncio_squadra_cerca_staff",
		subtype: "Squadra cerca staff",
		fallbackTitle: "Ricerca staff sportivo",
		titleFields: ["figura_ricercata"],
		descriptionFields: ["descrizione_aggiuntiva", "requisiti"],
	},
	{
		key: "annuncio_squadra_cerca_partita",
		subtype: "Squadra cerca partita",
		fallbackTitle: "Ricerca partita",
		titleFields: ["categorie_avversario"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_squadra_cerca_sponsor",
		subtype: "Squadra cerca sponsor",
		fallbackTitle: "Ricerca sponsor",
		titleFields: ["categoria_settore"],
		descriptionFields: ["descrizione_aggiuntiva", "supporto_cercato", "offerta_fornita"],
	},
	{
		key: "annuncio_staff_sportivo",
		subtype: "Staff sportivo",
		fallbackTitle: "Disponibilità staff sportivo",
		titleFields: ["figure_professionali"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_arbitro",
		subtype: "Arbitro",
		fallbackTitle: "Disponibilità arbitro",
		titleFields: ["categorie_ricercate"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_torneo_evento",
		subtype: "Torneo / evento",
		fallbackTitle: "Torneo o evento",
		titleFields: ["nome_evento"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_campo_impianto",
		subtype: "Campo / impianto",
		fallbackTitle: "Campo o impianto sportivo",
		titleFields: ["tipologie_sport"],
		descriptionFields: ["descrizione_aggiuntiva", "servizi_inclusi"],
	},
	{
		key: "annuncio_professionista_studente",
		subtype: "Professionista / studente",
		fallbackTitle: "Servizio professionale",
		titleFields: ["specializzazione", "figura_professionale"],
		descriptionFields: ["presentazione_servizi", "descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_creator",
		subtype: "Creator",
		fallbackTitle: "Contenuto creator",
		titleFields: ["titolo_post"],
		descriptionFields: ["descrizione_post", "contenuto_post", "descrizione_aggiuntiva"],
	},
] as const;

function announcementQuery(supabase: SupabaseClient<Database>) {
	return supabase
		.from("annuncio")
		.select(`
			uuid,
			tipologia_annuncio,
			creato_il,
			nascosto,
			stato_annuncio,
			info_stato_annuncio,
			annuncio_generico(titolo, contenuto),
			annuncio_giocatore(ruoli_principali, categorie_ricercate, descrizione_aggiuntiva),
			annuncio_squadra_cerca_giocatore(ruoli_principali, stagione, descrizione_aggiuntiva),
			annuncio_squadra_cerca_staff(figura_ricercata, requisiti, descrizione_aggiuntiva),
			annuncio_squadra_cerca_partita(categorie_avversario, descrizione_aggiuntiva),
			annuncio_squadra_cerca_sponsor(categoria_settore, supporto_cercato, offerta_fornita, descrizione_aggiuntiva),
			annuncio_staff_sportivo(figure_professionali, descrizione_aggiuntiva),
			annuncio_arbitro(categorie_ricercate, descrizione_aggiuntiva),
			annuncio_torneo_evento(nome_evento, descrizione_aggiuntiva),
			annuncio_campo_impianto(tipologie_sport, servizi_inclusi, descrizione_aggiuntiva),
			annuncio_professionista_studente(figura_professionale, specializzazione, presentazione_servizi, descrizione_aggiuntiva),
			annuncio_creator(titolo_post, descrizione_post, contenuto_post, descrizione_aggiuntiva),
			localita_annuncio(regione, citta)
		`);
}

type AnnouncementQueryRow = QueryData<
	ReturnType<typeof announcementQuery>
>[number];

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstRelation(value: unknown): Record<string, unknown> | null {
	const relation = Array.isArray(value) ? value[0] : value;
	return isRecord(relation) ? relation : null;
}

function firstText(value: unknown): string | null {
	if (typeof value === "string") {
		const normalized = value.trim();
		return normalized || null;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const normalized = firstText(item);
			if (normalized) return normalized;
		}
	}
	return null;
}

function firstDetailText(
	detail: Record<string, unknown>,
	fields: readonly string[],
): string | null {
	for (const field of fields) {
		const value = firstText(detail[field]);
		if (value) return value;
	}
	return null;
}

function humanizeAnnouncementType(value: string) {
	const normalized = value.trim().replaceAll("_", " ").replaceAll("-", " ");
	if (!normalized) return "Annuncio";
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function locationLabel(row: AnnouncementQueryRow) {
	const source = (row as unknown as Record<string, unknown>).localita_annuncio;
	const locations = (Array.isArray(source) ? source : [source])
		.filter(isRecord)
		.map((location) => ({
			regione: firstText(location.regione),
			citta: firstText(location.citta),
		}))
		.filter((location) => location.regione || location.citta)
		.sort((left, right) => {
			const leftLabel = [left.citta, left.regione].filter(Boolean).join(", ");
			const rightLabel = [right.citta, right.regione].filter(Boolean).join(", ");
			return leftLabel.localeCompare(rightLabel, "it");
		});

	if (locations.length === 0) return "Località non specificata";
	const first = [locations[0].citta, locations[0].regione].filter(Boolean).join(", ");
	return locations.length > 1 ? `${first} +${locations.length - 1}` : first;
}

function toManagedAnnouncement(row: AnnouncementQueryRow): ManagedAnnouncement {
	const source = row as unknown as Record<string, unknown>;
	const definition = DETAIL_DEFINITIONS.find(({key}) => firstRelation(source[key]));
	const detail = definition ? firstRelation(source[definition.key]) : null;
	const title = detail && definition
		? firstDetailText(detail, definition.titleFields) ?? definition.fallbackTitle
		: humanizeAnnouncementType(row.tipologia_annuncio);
	const description = detail && definition
		? firstDetailText(detail, definition.descriptionFields)
		: null;

	return {
		id: row.uuid,
		type: humanizeAnnouncementType(row.tipologia_annuncio),
		subtype: definition?.subtype ?? "Generico",
		title,
		description: description ?? "Nessuna descrizione aggiuntiva.",
		location: locationLabel(row),
		createdAt: row.creato_il,
		visibility: row.nascosto === true ? "hidden" : "visible",
		moderationStatus: row.stato_annuncio,
		moderationInfo: row.info_stato_annuncio,
	};
}

async function loadAnnouncements(
	supabase: SupabaseClient<Database>,
	userId: string,
	profileId: string | null,
) {
	const rows: AnnouncementQueryRow[] = [];
	let from = 0;

	while (true) {
		let query = announcementQuery(supabase)
			.order("creato_il", {ascending: false, nullsFirst: false})
			.order("uuid", {ascending: false})
			.range(from, from + ANNOUNCEMENT_PAGE_SIZE - 1);

		query = profileId
			? query.or(`creato_da.eq.${userId},autore_annuncio.eq.${profileId}`)
			: query.eq("creato_da", userId);

		const {data, error} = await query;
		if (error) {
			console.error("[profile-dashboard] Announcement query failed", {code: error.code});
			throw new Error("PROFILE_DASHBOARD_ANNOUNCEMENTS_UNAVAILABLE");
		}

		const page = data ?? [];
		rows.push(...page);
		if (page.length < ANNOUNCEMENT_PAGE_SIZE) break;
		from += ANNOUNCEMENT_PAGE_SIZE;
	}

	return rows.map(toManagedAnnouncement);
}

function hydrateDraft<Shape extends object>(
	defaults: Shape,
	row: object | null,
): Shape {
	if (!row) return defaults;
	const source = row as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(defaults).map(([key, defaultValue]) => [
			key,
			source[key] ?? defaultValue,
		]),
	) as Shape;
}

function queryFailed(error: {code?: string} | null, source: string) {
	if (!error) return;
	console.error("[profile-dashboard] Profile query failed", {
		source,
		code: error.code,
	});
	throw new Error("PROFILE_DASHBOARD_PROFILES_UNAVAILABLE");
}

export async function getProfileDashboardData(
	userId: string,
): Promise<ProfileDashboardData> {
	const supabase = await createClient();
	const {data: baseProfile, error: baseProfileError} = await supabase
		.from("profilo")
		.select("uuid, tipologia_principale")
		.eq("uuid_utente", userId)
		.eq("nascosto", false)
		.maybeSingle();

	queryFailed(baseProfileError, "profilo");

	const drafts = createProfileDrafts();
	const locations = createProfileLocations();

	if (!baseProfile) {
		return {
			profiles: [],
			drafts,
			locations,
			announcements: await loadAnnouncements(supabase, userId, null),
		};
	}

	const [
		playerResult,
		teamResult,
		staffResult,
		refereeResult,
		tournamentResult,
		facilityResult,
		professionalResult,
		creatorResult,
		locationResult,
		announcements,
	] = await Promise.all([
		supabase.from("profilo_giocatore").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_squadra").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_staff_sportivo").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_arbitro").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_torneo_evento").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_campi_impianti").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_professionista_studente").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("profilo_creator").select("*").eq("uuid_profilo", baseProfile.uuid).eq("nascosto", false).maybeSingle(),
		supabase.from("localita_profilo").select("id, sottoprofilo, regione, citta").eq("uuid_profilo", baseProfile.uuid).order("id"),
		loadAnnouncements(supabase, userId, baseProfile.uuid),
	]);

	queryFailed(playerResult.error, "profilo_giocatore");
	queryFailed(teamResult.error, "profilo_squadra");
	queryFailed(staffResult.error, "profilo_staff_sportivo");
	queryFailed(refereeResult.error, "profilo_arbitro");
	queryFailed(tournamentResult.error, "profilo_torneo_evento");
	queryFailed(facilityResult.error, "profilo_campi_impianti");
	queryFailed(professionalResult.error, "profilo_professionista_studente");
	queryFailed(creatorResult.error, "profilo_creator");
	queryFailed(locationResult.error, "localita_profilo");

	drafts.giocatore = hydrateDraft(drafts.giocatore, playerResult.data);
	drafts.squadra = hydrateDraft(drafts.squadra, teamResult.data);
	drafts["staff-sportivo"] = hydrateDraft(drafts["staff-sportivo"], staffResult.data);
	drafts.arbitro = hydrateDraft(drafts.arbitro, refereeResult.data);
	drafts["torneo-evento"] = hydrateDraft(drafts["torneo-evento"], tournamentResult.data);
	drafts["campi-impianti-sportivi"] = hydrateDraft(drafts["campi-impianti-sportivi"], facilityResult.data);
	drafts["professionisti-studi"] = hydrateDraft(drafts["professionisti-studi"], professionalResult.data);
	drafts.creators = hydrateDraft(drafts.creators, creatorResult.data);

	for (const location of locationResult.data ?? []) {
		if (!location.sottoprofilo || !isProfileType(location.sottoprofilo)) continue;
		locations[location.sottoprofilo].push({
			regione: location.regione,
			citta: location.citta,
		});
	}

	const activeRows = new Map<ProfileType, {id: number}>();
	if (playerResult.data) activeRows.set("giocatore", playerResult.data);
	if (teamResult.data) activeRows.set("squadra", teamResult.data);
	if (staffResult.data) activeRows.set("staff-sportivo", staffResult.data);
	if (refereeResult.data) activeRows.set("arbitro", refereeResult.data);
	if (tournamentResult.data) activeRows.set("torneo-evento", tournamentResult.data);
	if (facilityResult.data) activeRows.set("campi-impianti-sportivi", facilityResult.data);
	if (professionalResult.data) activeRows.set("professionisti-studi", professionalResult.data);
	if (creatorResult.data) activeRows.set("creators", creatorResult.data);

	const profiles = PROFILE_OPTIONS.flatMap(({value}) => {
		const row = activeRows.get(value);
		return row ? [{
			id: `${value}:${row.id}`,
			type: value,
			isPrimary: baseProfile.tipologia_principale === value,
		}] : [];
	});

	return {profiles, drafts, locations, announcements};
}
