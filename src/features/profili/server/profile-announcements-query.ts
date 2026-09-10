import "server-only";

import type {QueryData, SupabaseClient} from "@supabase/supabase-js";

import type {ProfileAnnouncement} from "@/features/profili/profile-detail-model";
import type {ProfileType} from "@/features/profilo/profile-model";
import type {Database} from "@/server/supabase";

const PUBLIC_ANNOUNCEMENT_LIMIT = 4;

const ANNOUNCEMENT_TYPES_BY_PROFILE = {
	giocatore: ["annuncio_giocatore"],
	squadra: [
		"annuncio_squadra_cerca_giocatore",
		"annuncio_squadra_cerca_staff",
		"annuncio_squadra_cerca_partita",
		"annuncio_squadra_cerca_sponsor",
	],
	"staff-sportivo": ["annuncio_staff_sportivo"],
	"professionisti-studi": [],
	arbitro: ["annuncio_arbitro"],
	creators: [],
	"torneo-evento": ["annuncio_torneo_evento"],
	"campi-impianti-sportivi": ["annuncio_campo_impianto"],
} as const satisfies Record<ProfileType, readonly string[]>;

const DETAIL_DEFINITIONS = [
	{
		key: "annuncio_giocatore",
		subtypeLabel: "Giocatore",
		fallbackTitle: "Disponibilità giocatore",
		titleFields: ["ruoli_principali", "categorie_ricercate"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_squadra_cerca_giocatore",
		subtypeLabel: "Squadra cerca giocatore",
		fallbackTitle: "Ricerca giocatore",
		titleFields: ["ruoli_principali"],
		descriptionFields: ["descrizione_aggiuntiva", "stagione"],
	},
	{
		key: "annuncio_squadra_cerca_staff",
		subtypeLabel: "Squadra cerca staff",
		fallbackTitle: "Ricerca staff sportivo",
		titleFields: ["figura_ricercata"],
		descriptionFields: ["descrizione_aggiuntiva", "requisiti"],
	},
	{
		key: "annuncio_squadra_cerca_partita",
		subtypeLabel: "Squadra cerca partita",
		fallbackTitle: "Ricerca partita",
		titleFields: ["categorie_avversario"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_squadra_cerca_sponsor",
		subtypeLabel: "Squadra cerca sponsor",
		fallbackTitle: "Ricerca sponsor",
		titleFields: ["categoria_settore"],
		descriptionFields: [
			"descrizione_aggiuntiva",
			"supporto_cercato",
			"offerta_fornita",
		],
	},
	{
		key: "annuncio_staff_sportivo",
		subtypeLabel: "Staff sportivo",
		fallbackTitle: "Disponibilità staff sportivo",
		titleFields: ["figure_professionali"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_arbitro",
		subtypeLabel: "Arbitro",
		fallbackTitle: "Disponibilità arbitro",
		titleFields: ["categorie_ricercate"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_torneo_evento",
		subtypeLabel: "Torneo / evento",
		fallbackTitle: "Torneo o evento",
		titleFields: ["nome_evento"],
		descriptionFields: ["descrizione_aggiuntiva"],
	},
	{
		key: "annuncio_campo_impianto",
		subtypeLabel: "Campo / impianto",
		fallbackTitle: "Campo o impianto sportivo",
		titleFields: ["tipologie_sport"],
		descriptionFields: ["descrizione_aggiuntiva", "servizi_inclusi"],
	},
] as const;

function publicProfileAnnouncementsQuery(supabase: SupabaseClient<Database>) {
	return supabase
		.from("annuncio")
		.select(`
			uuid,
			tipologia_annuncio,
			creato_il,
			livello_annuncio,
			annuncio_giocatore(ruoli_principali, categorie_ricercate, descrizione_aggiuntiva),
			annuncio_squadra_cerca_giocatore(ruoli_principali, stagione, descrizione_aggiuntiva),
			annuncio_squadra_cerca_staff(figura_ricercata, requisiti, descrizione_aggiuntiva),
			annuncio_squadra_cerca_partita(categorie_avversario, descrizione_aggiuntiva),
			annuncio_squadra_cerca_sponsor(categoria_settore, supporto_cercato, offerta_fornita, descrizione_aggiuntiva),
			annuncio_staff_sportivo(figure_professionali, descrizione_aggiuntiva),
			annuncio_arbitro(categorie_ricercate, descrizione_aggiuntiva),
			annuncio_torneo_evento(nome_evento, descrizione_aggiuntiva),
			annuncio_campo_impianto(tipologie_sport, servizi_inclusi, descrizione_aggiuntiva),
			localita_annuncio(regione, citta)
		`);
}

type AnnouncementQueryRow = QueryData<
	ReturnType<typeof publicProfileAnnouncementsQuery>
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
) {
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
			region: firstText(location.regione),
			city: firstText(location.citta),
		}))
		.filter((location) => location.region || location.city)
		.sort((left, right) => {
			const leftLabel = [left.city, left.region].filter(Boolean).join(", ");
			const rightLabel = [right.city, right.region].filter(Boolean).join(", ");
			return leftLabel.localeCompare(rightLabel, "it");
		});

	if (locations.length === 0) return "Località non specificata";
	const first = [locations[0].city, locations[0].region]
		.filter(Boolean)
		.join(", ");
	return locations.length > 1 ? `${first} +${locations.length - 1}` : first;
}

function toProfileAnnouncement(row: AnnouncementQueryRow): ProfileAnnouncement {
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
		typeLabel: humanizeAnnouncementType(row.tipologia_annuncio),
		subtypeLabel: definition?.subtypeLabel ?? "Annuncio",
		title,
		description: description ?? "Nessuna descrizione aggiuntiva.",
		location: locationLabel(row),
		createdAt: row.creato_il,
		level: firstText(row.livello_annuncio),
	};
}

function errorCode(error: unknown) {
	if (!isRecord(error)) return "UNKNOWN";
	return firstText(error.code) ?? "UNKNOWN";
}

export async function loadPublicProfileAnnouncements(
	supabase: SupabaseClient<Database>,
	profileId: string,
	type: ProfileType,
): Promise<{announcements: ProfileAnnouncement[]; unavailable: boolean}> {
	try {
		const allowedTypes = ANNOUNCEMENT_TYPES_BY_PROFILE[type];
		if (allowedTypes.length === 0) {
			return {announcements: [], unavailable: false};
		}

		const {data, error} = await publicProfileAnnouncementsQuery(supabase)
			.eq("autore_annuncio", profileId)
			.eq("stato_annuncio", "pubblicato")
			.eq("nascosto", false)
			.eq("privato", false)
			.in("tipologia_annuncio", allowedTypes)
			.order("creato_il", {ascending: false, nullsFirst: false})
			.order("uuid", {ascending: false})
			.limit(PUBLIC_ANNOUNCEMENT_LIMIT);

		if (error) {
			console.error("[dettagli-profilo] Public announcements unavailable", {
				code: error.code,
			});
			return {announcements: [], unavailable: true};
		}

		return {
			announcements: (data ?? []).map(toProfileAnnouncement),
			unavailable: false,
		};
	} catch (error) {
		console.error("[dettagli-profilo] Public announcements unavailable", {
			code: errorCode(error),
		});
		return {announcements: [], unavailable: true};
	}
}
