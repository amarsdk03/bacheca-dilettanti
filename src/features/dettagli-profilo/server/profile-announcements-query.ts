import "server-only";

import type {QueryData, SupabaseClient} from "@supabase/supabase-js";

import {
	isAnnouncementType,
	type AnnouncementFact,
	type AnnouncementFactKind,
} from "@/features/annunci/announcement-model";
import type {ProfileAnnouncement} from "@/features/dettagli-profilo/profile-detail-model";
import type {ProfileType} from "@/features/profilo/profile-model";
import type {Database} from "@/server/supabase";
import {experienceTeamReferences, type TeamProfileReference} from "@/features/profilo/team-profile";
import {loadPublicTeamProfiles} from "@/features/profilo/server/public-team-profiles";

const PUBLIC_ANNOUNCEMENT_LIMIT = 4;
const NOT_SPECIFIED = "Non specificato";

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
			annuncio_giocatore(ruoli_principali, ruoli_secondari, tipologie_sport, categorie_ricercate, descrizione_aggiuntiva),
			annuncio_squadra_cerca_giocatore(ruoli_principali, ruoli_secondari, annate_ricercate, stagione, tipologie_sport, descrizione_aggiuntiva),
			annuncio_squadra_cerca_staff(figura_ricercata, settore, compenso_mensile, requisiti, descrizione_aggiuntiva),
			annuncio_squadra_cerca_partita(categorie_avversario, periodo_dal, periodo_al, disponibilita_trasferta, descrizione_aggiuntiva),
			annuncio_squadra_cerca_sponsor(categoria_settore, supporto_cercato, offerta_fornita, descrizione_aggiuntiva),
			annuncio_staff_sportivo(figure_professionali, categorie_ricercate, disponibilita_spostamento, descrizione_aggiuntiva, lista_esperienze),
			annuncio_arbitro(categorie_ricercate, disponibilita_occupazione, automunito, descrizione_aggiuntiva, lista_esperienze),
			annuncio_torneo_evento(nome_evento, modalita_iscrizione, tipo_partecipazione, costo_partecipazione, descrizione_aggiuntiva),
			annuncio_campo_impianto(tipologie_sport, costo_partenza, servizi_inclusi, descrizione_aggiuntiva),
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

function textArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.flatMap((item) => {
		const text = firstText(item);
		return text ? [text] : [];
	}))];
}

function formatSelection(values: string[], plural: "selezionati" | "selezionate") {
	if (values.length === 0) return NOT_SPECIFIED;
	if (values.length === 1) return values[0];
	return values.length + " " + plural;
}

function numericValue(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string" || !value.trim()) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number | null) {
	if (value === null) return NOT_SPECIFIED;
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
	}).format(value);
}

function formatDate(value: unknown) {
	const text = firstText(value);
	if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
	const date = new Date(text + "T00:00:00Z");
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat("it-IT", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}

function formatPeriod(from: unknown, to: unknown) {
	const fromLabel = formatDate(from);
	const toLabel = formatDate(to);
	if (fromLabel && toLabel) return "Dal " + fromLabel + " al " + toLabel;
	if (fromLabel) return "Dal " + fromLabel;
	if (toLabel) return "Fino al " + toLabel;
	return NOT_SPECIFIED;
}

function humanize(value: unknown) {
	const text = firstText(value);
	if (!text || text === "non-specificare") return NOT_SPECIFIED;
	const normalized = text.replaceAll("-", " ");
	return normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1);
}

function announcementFact(kind: AnnouncementFactKind, label: string, value: string | null) {
	return {kind, label, value: value ?? NOT_SPECIFIED} satisfies AnnouncementFact;
}

function profileAnnouncementFacts(
	type: string | undefined,
	detail: Record<string, unknown> | null,
	location: string,
): AnnouncementFact[] {
	if (!detail || !type) return [];

	if (type === "annuncio_giocatore") {
		return [
			announcementFact("roles", "Ruoli principali", formatSelection(textArray(detail.ruoli_principali), "selezionati")),
			announcementFact("roles", "Ruoli secondari", formatSelection(textArray(detail.ruoli_secondari), "selezionati")),
			announcementFact("types", "Tipologie", formatSelection(textArray(detail.tipologie_sport), "selezionate")),
			announcementFact("categories", "Categorie ricercate", formatSelection(textArray(detail.categorie_ricercate), "selezionate")),
			announcementFact("location", "Località", location),
		];
	}
	if (type === "annuncio_squadra_cerca_giocatore") {
		return [
			announcementFact("roles", "Ruoli", formatSelection(textArray(detail.ruoli_principali), "selezionati")),
			announcementFact("categories", "Annate", formatSelection(textArray(detail.annate_ricercate), "selezionate")),
			announcementFact("season", "Stagione", firstText(detail.stagione)),
			announcementFact("location", "Località", location),
		];
	}
	if (type === "annuncio_squadra_cerca_staff") {
		return [
			announcementFact("figures", "Figura", firstText(detail.figura_ricercata)),
			announcementFact("sector", "Settore", firstText(detail.settore)),
			announcementFact("compensation", "Compenso mensile", formatCurrency(numericValue(detail.compenso_mensile))),
			announcementFact("location", "Località", location),
		];
	}
	if (type === "annuncio_squadra_cerca_partita") {
		return [
			announcementFact("categories", "Categorie", formatSelection(textArray(detail.categorie_avversario), "selezionate")),
			announcementFact("period", "Periodo", formatPeriod(detail.periodo_dal, detail.periodo_al)),
			announcementFact("availability", "Trasferta", firstText(detail.disponibilita_trasferta)),
			announcementFact("location", "Località", location),
		];
	}
	if (type === "annuncio_squadra_cerca_sponsor") {
		return [
			announcementFact("sector", "Settore", firstText(detail.categoria_settore)),
			announcementFact("services", "Supporto cercato", firstText(detail.supporto_cercato)),
			announcementFact("services", "Offerta", firstText(detail.offerta_fornita)),
			announcementFact("location", "Località", location),
		];
	}
	if (type === "annuncio_staff_sportivo") {
		return [
			announcementFact("figures", "Figure", formatSelection(textArray(detail.figure_professionali), "selezionate")),
			announcementFact("categories", "Categorie", formatSelection(textArray(detail.categorie_ricercate), "selezionate")),
			announcementFact("availability", "Spostamenti", firstText(detail.disponibilita_spostamento)),
			announcementFact("location", "Località", location),
		];
	}
	if (type === "annuncio_arbitro") {
		return [
			announcementFact("categories", "Categorie", formatSelection(textArray(detail.categorie_ricercate), "selezionate")),
			announcementFact("availability", "Disponibilità", humanize(detail.disponibilita_occupazione)),
			announcementFact("car", "Automunito", firstText(detail.automunito)),
			announcementFact("location", "Località", location),
		];
	}
	if (type === "annuncio_torneo_evento") {
		return [
			announcementFact("registration", "Iscrizione", humanize(detail.modalita_iscrizione)),
			announcementFact("participation", "Partecipazione", humanize(detail.tipo_partecipazione)),
			announcementFact("price", "Costo", formatCurrency(numericValue(detail.costo_partecipazione))),
			announcementFact("location", "Località", location),
		];
	}
	return [
		announcementFact("types", "Tipologie", formatSelection(textArray(detail.tipologie_sport), "selezionate")),
		announcementFact("price", "Costo", numericValue(detail.costo_partenza) === null
			? NOT_SPECIFIED
			: "Da " + formatCurrency(numericValue(detail.costo_partenza))),
		announcementFact("services", "Servizi", firstText(detail.servizi_inclusi)),
		announcementFact("location", "Località", location),
	];
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

function toProfileAnnouncement(row: AnnouncementQueryRow, profileType: ProfileType): {announcement: ProfileAnnouncement; teamReferences: TeamProfileReference[]} | null {
	if (!isAnnouncementType(row.tipologia_annuncio)) return null;

	const source = row as unknown as Record<string, unknown>;
	const definition = DETAIL_DEFINITIONS.find(({key}) => firstRelation(source[key]));
	const detail = definition ? firstRelation(source[definition.key]) : null;
	const title = detail && definition
		? firstDetailText(detail, definition.titleFields) ?? definition.fallbackTitle
		: humanizeAnnouncementType(row.tipologia_annuncio);
	const description = detail && definition
		? firstDetailText(detail, definition.descriptionFields)
		: null;

	return {announcement: {
		id: row.uuid,
		type: row.tipologia_annuncio,
		profileType,
		typeLabel: humanizeAnnouncementType(row.tipologia_annuncio),
		subtypeLabel: definition?.subtypeLabel ?? "Annuncio",
		title,
		description: description ?? "Nessuna descrizione aggiuntiva.",
		location: locationLabel(row),
		createdAt: row.creato_il,
		level: firstText(row.livello_annuncio),
		facts: profileAnnouncementFacts(definition?.key, detail, locationLabel(row)),
		linkedTeams: [],
	}, teamReferences: experienceTeamReferences(detail?.lista_esperienze)};
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

		const mapped = (data ?? []).flatMap((row) => {
			const announcement = toProfileAnnouncement(row, type);
			return announcement ? [announcement] : [];
		});
		if (type === "giocatore" && mapped.length > 0) {
			const {data: player, error: playerError} = await supabase
				.from("profilo_giocatore")
				.select("storico_carriera")
				.eq("uuid_profilo", profileId)
				.maybeSingle();
			if (playerError) {
				console.error("[dettagli-profilo] Player announcement team lookup failed", {code: playerError.code});
			} else {
				const references = experienceTeamReferences(player?.storico_carriera, "titolo");
				mapped.forEach((item) => { item.teamReferences = references; });
			}
		}
		let teamsById = new Map<string, Awaited<ReturnType<typeof loadPublicTeamProfiles>>[number]>();
		try {
			const teams = await loadPublicTeamProfiles(
				supabase,
				mapped.flatMap(({teamReferences}) => teamReferences.map(({profileId}) => profileId)),
			);
			teamsById = new Map(teams.map((team) => [team.profileId, team]));
		} catch (error) {
			console.error("[dettagli-profilo] Announcement team lookup failed", {code: errorCode(error)});
		}

		return {
			announcements: mapped.map(({announcement, teamReferences}) => ({
				...announcement,
				linkedTeams: teamReferences.map((reference) => teamsById.get(reference.profileId) ?? reference),
			})),
			unavailable: false,
		};
	} catch (error) {
		console.error("[dettagli-profilo] Public announcements unavailable", {
			code: errorCode(error),
		});
		return {announcements: [], unavailable: true};
	}
}
