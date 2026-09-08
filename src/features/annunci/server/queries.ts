import "server-only";

import type {QueryData, SupabaseClient} from "@supabase/supabase-js";

import {
	ANNOUNCEMENTS_PER_PAGE,
	ANNOUNCEMENT_TYPES,
	announcementOption,
	getAnnouncementFilterEntries,
	getAnnouncementStorageTypes,
	isAnnouncementType,
	isValidAnnouncementId,
	normalizeAnnouncementSearchText,
	type AnnouncementAuthor,
	type AnnouncementContact,
	type AnnouncementDetailField,
	type AnnouncementDetailResult,
	type AnnouncementDirectoryItem,
	type AnnouncementDirectoryQuery,
	type AnnouncementDirectoryResult,
	type AnnouncementFact,
	type AnnouncementFactKind,
	type AnnouncementType,
	type LatestAnnouncementsResult,
} from "@/features/annunci/announcement-model";
import type {ProfileType} from "@/features/profilo/profile-model";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Database} from "@/server/supabase";

const ANNOUNCEMENT_BATCH_SIZE = 500;
const AUTHOR_BATCH_SIZE = 100;
const NOT_SPECIFIED = "Non specificato";

const PROFILE_TABLE_BY_TYPE: Partial<Record<ProfileType, string>> = {
	giocatore: "profilo_giocatore",
	squadra: "profilo_squadra",
	"staff-sportivo": "profilo_staff_sportivo",
	arbitro: "profilo_arbitro",
	"torneo-evento": "profilo_torneo_evento",
	"campi-impianti-sportivi": "profilo_campi_impianti",
};

const ANONYMOUS_LABEL_BY_PROFILE: Partial<Record<ProfileType, string>> = {
	giocatore: "Giocatore anonimo",
	squadra: "Squadra anonima",
	"staff-sportivo": "Staff sportivo anonimo",
	arbitro: "Arbitro anonimo",
	"torneo-evento": "Torneo / evento anonimo",
	"campi-impianti-sportivi": "Campo / impianto anonimo",
};

function publicAnnouncementQuery(
	supabase: SupabaseClient<Database>,
	options?: {count?: "exact"},
) {
	// This client bypasses RLS. Keep the projection explicit and the three
	// public-visibility predicates attached to every caller through this helper.
	return supabase
		.from("annuncio")
		.select(`
			uuid,
			autore_annuncio,
			tipologia_annuncio,
			creato_il,
			livello_annuncio,
			annuncio_giocatore(tipologie_sport, ruoli_principali, ruoli_secondari, descrizione_aggiuntiva),
			annuncio_squadra_cerca_giocatore(tipologie_sport, ruoli_principali, ruoli_secondari, annate_ricercate, stagione, descrizione_aggiuntiva),
			annuncio_squadra_cerca_staff(figura_ricercata, settore, compenso_mensile, requisiti, periodo_dal, periodo_al, descrizione_aggiuntiva),
			annuncio_squadra_cerca_partita(categorie_avversario, disponibilita_trasferta, periodo_dal, periodo_al, orario_dalle, orario_alle, descrizione_aggiuntiva),
			annuncio_squadra_cerca_sponsor(categoria_settore, supporto_cercato, offerta_fornita, descrizione_aggiuntiva),
			annuncio_staff_sportivo(figure_professionali, tipologie_sport, categorie_ricercate, disponibilita_occupazione, disponibilita_spostamento, descrizione_aggiuntiva),
			annuncio_arbitro(tipologie_sport, categorie_ricercate, disponibilita_occupazione, disponibilita_spostamento, automunito, descrizione_aggiuntiva),
			annuncio_torneo_evento(nome_evento, modalita_iscrizione, annate_ammesse_da, annate_ammesse_a, numero_squadre, costo_partecipazione, tipo_partecipazione, lista_premi_trofei, descrizione_aggiuntiva, tipologie_sport),
			annuncio_campo_impianto(tipologie_sport, orari, costo_partenza, servizi_inclusi, descrizione_aggiuntiva),
			localita_annuncio(regione, citta)
		`, options)
		.eq("stato_annuncio", "pubblicato")
		.eq("nascosto", false)
		.eq("privato", false);
}

type AnnouncementQueryRow = QueryData<ReturnType<typeof publicAnnouncementQuery>>[number];

function officialAuthorQuery(supabase: SupabaseClient<Database>) {
	// uuid_utente is used only as a server-side filter and is intentionally not
	// selected. Anonymous publishing profiles never reach these child selects.
	return supabase
		.from("profilo")
		.select(`
			uuid,
			link_foto_profilo,
			verificato_il,
			localita_profilo(id_sottoprofilo, sottoprofilo, regione, citta),
			profilo_giocatore(id, nascosto, nome, cognome, disponibilita, presentazione, ruoli_sport, tipologie_sport),
			profilo_squadra(id, nascosto, nome_societa, presentazione, sede_principale, tipologie_sport),
			profilo_staff_sportivo(id, nascosto, nome, cognome, disponibilita, figure_professionali, presentazione),
			profilo_arbitro(id, nascosto, nome, cognome, disponibilita, presentazione),
			profilo_torneo_evento(id, nascosto, nome_organizzazione, presentazione, sede_principale, tipologie_sport),
			profilo_campi_impianti(id, nascosto, nome_organizzazione, presentazione, sede_principale, tipologie_sport, costo_partenza, servizi_inclusi)
		`)
		.eq("nascosto", false)
		.not("uuid_utente", "is", null);
}

type OfficialAuthorQueryRow = QueryData<ReturnType<typeof officialAuthorQuery>>[number];

interface AnnouncementLocation {
	region: string;
	city: string | null;
}

interface AnnouncementFilterData {
	regions: string[];
	types: string[];
	roles: string[];
	figures: string[];
	categories: string[];
	car: string | null;
	cost: number | null;
	compensation: number | null;
}

interface MappedAnnouncement {
	item: AnnouncementDirectoryItem;
	fields: AnnouncementDetailField[];
	filterData: AnnouncementFilterData;
	searchText: string;
	authorId: string | null;
}

interface AuthorLoadResult {
	authors: Map<string, AnnouncementAuthor>;
	error: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function relationRecords(value: unknown) {
	const values = Array.isArray(value) ? value : value ? [value] : [];
	return values.filter(isRecord);
}

function firstRelation(value: unknown) {
	return relationRecords(value)[0] ?? null;
}

function cleanText(value: unknown, maxLength = 5_000) {
	if (typeof value !== "string") return null;
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized ? normalized.slice(0, maxLength) : null;
}

function cleanStringArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return [...new Set(
		value
			.map((item) => cleanText(item, 160))
			.filter((item): item is string => Boolean(item)),
	)];
}

function jsonStringArray(value: unknown, key: string) {
	return isRecord(value) ? cleanStringArray(value[key]) : [];
}

function finiteNumber(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string" || !value.trim()) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function shortFactValue(value: string | null) {
	if (!value) return NOT_SPECIFIED;
	return value.length > 96 ? `${value.slice(0, 93).trimEnd()}…` : value;
}

function fact(kind: AnnouncementFactKind, label: string, value: string | null): AnnouncementFact {
	const normalizedValue = kind === "location" && value === "Località non specificata"
		? null
		: value;
	return {kind, label, value: shortFactValue(normalizedValue)};
}

function formatSelection(
	values: string[],
	plural: "selezionati" | "selezionate",
) {
	if (values.length === 0) return NOT_SPECIFIED;
	if (values.length === 1) return values[0];
	return `${values.length} ${plural}`;
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
	const text = cleanText(value, 10);
	if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
	const date = new Date(`${text}T00:00:00Z`);
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
	if (fromLabel && toLabel) return `Dal ${fromLabel} al ${toLabel}`;
	if (fromLabel) return `Dal ${fromLabel}`;
	if (toLabel) return `Fino al ${toLabel}`;
	return NOT_SPECIFIED;
}

function formatTime(value: unknown) {
	const text = cleanText(value, 8);
	if (!text || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(text)) return null;
	return text.slice(0, 5);
}

function formatTimeRange(from: unknown, to: unknown) {
	const fromLabel = formatTime(from);
	const toLabel = formatTime(to);
	if (fromLabel && toLabel) return `Dalle ${fromLabel} alle ${toLabel}`;
	return NOT_SPECIFIED;
}

function formatYearRange(from: unknown, to: unknown) {
	const fromLabel = cleanText(from, 4);
	const toLabel = cleanText(to, 4);
	if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
	return fromLabel ?? toLabel ?? NOT_SPECIFIED;
}

function humanizeValue(value: unknown) {
	const text = cleanText(value, 160);
	if (!text || text === "non-specificare") return NOT_SPECIFIED;
	const normalized = text.replaceAll("-", " ");
	return normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1);
}

function formatOpeningHours(value: unknown) {
	if (!isRecord(value)) return NOT_SPECIFIED;
	return cleanText(value.descrizione) ?? NOT_SPECIFIED;
}

function formatPrizes(value: unknown) {
	if (!Array.isArray(value)) return NOT_SPECIFIED;
	const prizes = value.flatMap((item): string[] => {
		if (!isRecord(item)) return [];
		const title = cleanText(item.titoloPremio, 160);
		if (!title) return [];
		const place = cleanText(item.posto, 160);
		return [place ? `${place}: ${title}` : title];
	});
	if (prizes.length === 0) return NOT_SPECIFIED;
	return prizes.join("; ");
}

function announcementLocations(row: AnnouncementQueryRow) {
	const source = (row as unknown as Record<string, unknown>).localita_annuncio;
	return relationRecords(source)
		.flatMap((location): AnnouncementLocation[] => {
			const region = cleanText(location.regione, 80);
			if (!region) return [];
			return [{region, city: cleanText(location.citta, 120)}];
		})
		.sort((left, right) => {
			const leftLabel = [left.city, left.region].filter(Boolean).join(", ");
			const rightLabel = [right.city, right.region].filter(Boolean).join(", ");
			return leftLabel.localeCompare(rightLabel, "it-IT");
		});
}

function formatLocation(locations: AnnouncementLocation[]) {
	const first = locations[0];
	if (!first) return "Località non specificata";
	const label = [first.city, first.region].filter(Boolean).join(", ");
	return locations.length > 1 ? `${label} +${locations.length - 1}` : label;
}

function anonymousAuthor(profileType: ProfileType): AnnouncementAuthor {
	return {
		kind: "anonymous",
		profileType,
		label: ANONYMOUS_LABEL_BY_PROFILE[profileType] ?? "Sottoprofilo anonimo",
	};
}

function unavailableAuthor(profileType: ProfileType): AnnouncementAuthor {
	return {
		kind: "unavailable",
		profileType,
		label: "Autore temporaneamente non disponibile",
	};
}

function detailForType(row: AnnouncementQueryRow, type: AnnouncementType) {
	return firstRelation((row as unknown as Record<string, unknown>)[type]) ?? {};
}

function emptyFilterData(locations: AnnouncementLocation[]): AnnouncementFilterData {
	return {
		regions: [...new Set(locations.map(({region}) => region))],
		types: [],
		roles: [],
		figures: [],
		categories: [],
		car: null,
		cost: null,
		compensation: null,
	};
}

function detailField(label: string, value: string | null, wide = false): AnnouncementDetailField {
	return {label, value: value ?? NOT_SPECIFIED, ...(wide ? {wide: true} : {})};
}

function announcementContent(
	type: AnnouncementType,
	detail: Record<string, unknown>,
	locations: AnnouncementLocation[],
) {
	const location = formatLocation(locations);
	const filters = emptyFilterData(locations);
	let title: string;
	let description = cleanText(detail.descrizione_aggiuntiva);
	let facts: AnnouncementFact[];
	let fields: AnnouncementDetailField[];
	let searchValues: string[] = [];

	if (type === "annuncio_giocatore") {
		const types = cleanStringArray(detail.tipologie_sport);
		const primaryRoles = cleanStringArray(detail.ruoli_principali);
		const secondaryRoles = cleanStringArray(detail.ruoli_secondari);
		title = primaryRoles[0] ? `${primaryRoles[0]} disponibile` : "Giocatore disponibile";
		facts = [
			fact("roles", "Ruoli principali", formatSelection(primaryRoles, "selezionati")),
			fact("roles", "Ruoli secondari", formatSelection(secondaryRoles, "selezionati")),
			fact("types", "Tipologie", formatSelection(types, "selezionate")),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Ruoli principali", formatSelection(primaryRoles, "selezionati")),
			detailField("Ruoli secondari", formatSelection(secondaryRoles, "selezionati")),
			detailField("Tipologie", formatSelection(types, "selezionate")),
		];
		filters.types = types;
		filters.roles = [...new Set([...primaryRoles, ...secondaryRoles])];
		searchValues = [...types, ...primaryRoles, ...secondaryRoles];
	} else if (type === "annuncio_squadra_cerca_giocatore") {
		const types = cleanStringArray(detail.tipologie_sport);
		const primaryRoles = cleanStringArray(detail.ruoli_principali);
		const secondaryRoles = cleanStringArray(detail.ruoli_secondari);
		const years = cleanStringArray(detail.annate_ricercate);
		const season = cleanText(detail.stagione, 80);
		title = primaryRoles[0] ? `Ricerca ${primaryRoles[0].toLocaleLowerCase("it-IT")}` : "Ricerca giocatore";
		facts = [
			fact("roles", "Ruoli", formatSelection(primaryRoles, "selezionati")),
			fact("categories", "Annate", formatSelection(years, "selezionate")),
			fact("season", "Stagione", season),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Ruoli principali", formatSelection(primaryRoles, "selezionati")),
			detailField("Ruoli secondari", formatSelection(secondaryRoles, "selezionati")),
			detailField("Annate ricercate", formatSelection(years, "selezionate")),
			detailField("Stagione", season),
			detailField("Tipologie", formatSelection(types, "selezionate")),
		];
		filters.types = types;
		filters.roles = [...new Set([...primaryRoles, ...secondaryRoles])];
		searchValues = [...types, ...primaryRoles, ...secondaryRoles, ...years, season ?? ""];
	} else if (type === "annuncio_squadra_cerca_staff") {
		const figure = cleanText(detail.figura_ricercata, 160);
		const sector = cleanText(detail.settore, 160);
		const compensation = finiteNumber(detail.compenso_mensile);
		const requirements = cleanText(detail.requisiti);
		title = figure ? `Ricerca ${figure.toLocaleLowerCase("it-IT")}` : "Ricerca staff sportivo";
		description = description ?? requirements;
		facts = [
			fact("figures", "Figura", figure),
			fact("sector", "Settore", sector),
			fact("compensation", "Compenso mensile", compensation === null ? null : formatCurrency(compensation)),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Figura ricercata", figure),
			detailField("Settore", sector),
			detailField("Compenso mensile", compensation === null ? null : formatCurrency(compensation)),
			detailField("Periodo", formatPeriod(detail.periodo_dal, detail.periodo_al)),
			detailField("Requisiti", requirements, true),
		];
		filters.figures = figure ? [figure] : [];
		filters.compensation = compensation;
		searchValues = [figure ?? "", sector ?? "", requirements ?? ""];
	} else if (type === "annuncio_squadra_cerca_partita") {
		const categories = cleanStringArray(detail.categorie_avversario);
		const travel = cleanText(detail.disponibilita_trasferta, 40);
		const period = formatPeriod(detail.periodo_dal, detail.periodo_al);
		const time = formatTimeRange(detail.orario_dalle, detail.orario_alle);
		title = "Ricerca partita";
		facts = [
			fact("categories", "Categorie", formatSelection(categories, "selezionate")),
			fact("period", "Periodo", period),
			fact("availability", "Trasferta", travel),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Categorie avversarie", formatSelection(categories, "selezionate")),
			detailField("Disponibilità alla trasferta", travel),
			detailField("Periodo", period),
			detailField("Orario", time),
		];
		filters.categories = categories;
		searchValues = [...categories, travel ?? "", period, time];
	} else if (type === "annuncio_squadra_cerca_sponsor") {
		const sector = cleanText(detail.categoria_settore, 160);
		const support = cleanText(detail.supporto_cercato);
		const offer = cleanText(detail.offerta_fornita);
		title = sector ? `Ricerca sponsor: ${sector}` : "Ricerca sponsor";
		description = description ?? support;
		facts = [
			fact("sector", "Settore", sector),
			fact("services", "Supporto cercato", support),
			fact("services", "Offerta", offer),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Categoria / settore", sector),
			detailField("Supporto cercato", support, true),
			detailField("Offerta fornita", offer, true),
		];
		searchValues = [sector ?? "", support ?? "", offer ?? ""];
	} else if (type === "annuncio_staff_sportivo") {
		const figures = cleanStringArray(detail.figure_professionali);
		const types = cleanStringArray(detail.tipologie_sport);
		const categories = cleanStringArray(detail.categorie_ricercate);
		const occupation = cleanText(detail.disponibilita_occupazione, 160);
		const travel = cleanText(detail.disponibilita_spostamento, 40);
		title = figures[0] ? `${figures[0]} disponibile` : "Staff sportivo disponibile";
		facts = [
			fact("figures", "Figure", formatSelection(figures, "selezionate")),
			fact("categories", "Categorie", formatSelection(categories, "selezionate")),
			fact("availability", "Spostamenti", travel),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Figure professionali", formatSelection(figures, "selezionate")),
			detailField("Tipologie", formatSelection(types, "selezionate")),
			detailField("Categorie ricercate", formatSelection(categories, "selezionate")),
			detailField("Disponibilità lavorativa", humanizeValue(occupation)),
			detailField("Disponibilità agli spostamenti", travel),
		];
		filters.types = types;
		filters.figures = figures;
		filters.categories = categories;
		searchValues = [...figures, ...types, ...categories, occupation ?? "", travel ?? ""];
	} else if (type === "annuncio_arbitro") {
		const types = cleanStringArray(detail.tipologie_sport);
		const categories = cleanStringArray(detail.categorie_ricercate);
		const occupation = cleanText(detail.disponibilita_occupazione, 160);
		const travel = cleanText(detail.disponibilita_spostamento, 40);
		const car = cleanText(detail.automunito, 40);
		title = "Arbitro disponibile";
		facts = [
			fact("categories", "Categorie", formatSelection(categories, "selezionate")),
			fact("availability", "Disponibilità", humanizeValue(occupation)),
			fact("car", "Automunito", car),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Tipologie", formatSelection(types, "selezionate")),
			detailField("Categorie ricercate", formatSelection(categories, "selezionate")),
			detailField("Disponibilità", humanizeValue(occupation)),
			detailField("Disponibilità agli spostamenti", travel),
			detailField("Automunito", car),
		];
		filters.types = types;
		filters.categories = categories;
		filters.car = car;
		searchValues = [...types, ...categories, occupation ?? "", travel ?? "", car ?? ""];
	} else if (type === "annuncio_torneo_evento") {
		const name = cleanText(detail.nome_evento, 160);
		const types = cleanStringArray(detail.tipologie_sport);
		const registration = humanizeValue(detail.modalita_iscrizione);
		const participation = humanizeValue(detail.tipo_partecipazione);
		const cost = finiteNumber(detail.costo_partecipazione);
		const teams = finiteNumber(detail.numero_squadre);
		const years = formatYearRange(detail.annate_ammesse_da, detail.annate_ammesse_a);
		const prizes = formatPrizes(detail.lista_premi_trofei);
		title = name ?? "Torneo o evento";
		facts = [
			fact("registration", "Iscrizione", registration),
			fact("participation", "Partecipazione", participation),
			fact("price", "Costo", cost === null ? null : formatCurrency(cost)),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Tipologie", formatSelection(types, "selezionate")),
			detailField("Modalità di iscrizione", registration),
			detailField("Annate ammesse", years),
			detailField("Numero di squadre", teams === null ? null : String(teams)),
			detailField("Costo di partecipazione", cost === null ? null : formatCurrency(cost)),
			detailField("Tipo di partecipazione", participation),
			detailField("Premi e trofei", prizes, true),
		];
		filters.types = types;
		filters.cost = cost;
		searchValues = [...types, registration, participation, years, prizes];
	} else {
		const types = cleanStringArray(detail.tipologie_sport);
		const cost = finiteNumber(detail.costo_partenza);
		const services = cleanText(detail.servizi_inclusi);
		const hours = formatOpeningHours(detail.orari);
		title = "Campo o impianto disponibile";
		description = description ?? services;
		facts = [
			fact("types", "Tipologie", formatSelection(types, "selezionate")),
			fact("price", "Costo", cost === null ? null : `Da ${formatCurrency(cost)}`),
			fact("services", "Servizi", services),
			fact("location", "Località", location),
		];
		fields = [
			detailField("Tipologie", formatSelection(types, "selezionate")),
			detailField("Orari", hours, true),
			detailField("Costo di partenza", cost === null ? null : formatCurrency(cost)),
			detailField("Servizi inclusi", services, true),
		];
		filters.types = types;
		filters.cost = cost;
		searchValues = [...types, services ?? "", hours];
	}

	return {title, description, location, facts, fields, filters, searchValues};
}

function mapAnnouncement(row: AnnouncementQueryRow): MappedAnnouncement | null {
	if (!isAnnouncementType(row.tipologia_annuncio)) return null;
	const type = row.tipologia_annuncio;
	const option = announcementOption(type);
	const detail = detailForType(row, type);
	const locations = announcementLocations(row);
	const content = announcementContent(type, detail, locations);
	const searchText = normalizeAnnouncementSearchText([
		content.title,
		content.description,
		option.label,
		content.location,
		...content.searchValues,
		...locations.flatMap(({region, city}) => [region, city ?? ""]),
	].filter(Boolean).join(" "));

	return {
		item: {
			id: row.uuid,
			type,
			typeLabel: option.label,
			profileType: option.profileType,
			title: content.title,
			description: content.description,
			createdAt: row.creato_il,
			level: cleanText(row.livello_annuncio, 80),
			location: content.location,
			facts: content.facts,
			author: anonymousAuthor(option.profileType),
		},
		fields: content.fields,
		filterData: content.filters,
		searchText,
		authorId: isValidAnnouncementId(row.autore_annuncio) ? row.autore_annuncio : null,
	};
}

function normalizedIncludes(values: string[], selected: string) {
	const normalized = normalizeAnnouncementSearchText(selected);
	return values.some((value) => normalizeAnnouncementSearchText(value) === normalized);
}

function matchesDirectoryQuery(
	announcement: MappedAnnouncement,
	query: AnnouncementDirectoryQuery,
	requestedTypes: readonly AnnouncementType[],
) {
	if (!requestedTypes.includes(announcement.item.type)) return false;
	const tokens = normalizeAnnouncementSearchText(query.q).split(/\s+/).filter(Boolean);
	if (tokens.some((token) => !announcement.searchText.includes(token))) return false;
	if (query.types.length !== 1) return true;

	const {filters} = query;
	const data = announcement.filterData;
	if (filters.regione && !normalizedIncludes(data.regions, filters.regione)) return false;
	if (filters.tipologia && !normalizedIncludes(data.types, filters.tipologia)) return false;
	if (filters.ruolo && !normalizedIncludes(data.roles, filters.ruolo)) return false;
	if (filters.figura && !normalizedIncludes(data.figures, filters.figura)) return false;
	if (filters.categoria && !normalizedIncludes(data.categories, filters.categoria)) return false;
	if (filters.automunito && normalizeAnnouncementSearchText(data.car ?? "") !== normalizeAnnouncementSearchText(filters.automunito)) return false;
	if (filters.costoMax !== null && (data.cost === null || data.cost > filters.costoMax)) return false;
	if (filters.compensoMin !== null && (data.compensation === null || data.compensation < filters.compensoMin)) return false;
	return true;
}

function profileLocationRecords(row: OfficialAuthorQueryRow) {
	return relationRecords((row as unknown as Record<string, unknown>).localita_profilo);
}

function profileLocations(
	row: OfficialAuthorQueryRow,
	profileType: ProfileType,
	childId: number,
) {
	return profileLocationRecords(row).flatMap((location): AnnouncementLocation[] => {
		if (location.sottoprofilo !== profileType) return [];
		const scopedChildId = finiteNumber(location.id_sottoprofilo);
		if (scopedChildId !== null && scopedChildId !== childId) return [];
		const region = cleanText(location.regione, 80);
		if (!region) return [];
		return [{region, city: cleanText(location.citta, 120)}];
	});
}

function fullName(name: unknown, surname: unknown) {
	return [cleanText(name, 160), cleanText(surname, 160)].filter(Boolean).join(" ") || null;
}

function registeredAuthor(
	row: OfficialAuthorQueryRow,
	profileType: ProfileType,
): AnnouncementAuthor | null {
	const table = PROFILE_TABLE_BY_TYPE[profileType];
	if (!table) return null;
	const child = relationRecords((row as unknown as Record<string, unknown>)[table])
		.find((candidate) => candidate.nascosto === false);
	if (!child) return null;
	const childId = finiteNumber(child.id);
	if (childId === null) return null;
	const locations = profileLocations(row, profileType, childId);
	const location = formatLocation(locations);
	let title: string | null = null;
	let highlights: AnnouncementFact[] = [];

	if (profileType === "giocatore") {
		const roles = [
			...jsonStringArray(child.ruoli_sport, "principali"),
			...jsonStringArray(child.ruoli_sport, "specifici"),
		];
		title = fullName(child.nome, child.cognome);
		highlights = [
			fact("roles", "Ruoli", formatSelection([...new Set(roles)], "selezionati")),
			fact("availability", "Disponibilità", humanizeValue(child.disponibilita)),
			fact("location", "Località", location),
		];
	} else if (profileType === "squadra") {
		title = cleanText(child.nome_societa, 160);
		highlights = [
			fact("types", "Tipologie", formatSelection(cleanStringArray(child.tipologie_sport), "selezionate")),
			fact("headquarters", "Sede", cleanText(child.sede_principale, 160)),
			fact("location", "Località", location),
		];
	} else if (profileType === "staff-sportivo") {
		title = fullName(child.nome, child.cognome);
		highlights = [
			fact("figures", "Figure", formatSelection(cleanStringArray(child.figure_professionali), "selezionate")),
			fact("availability", "Disponibilità", humanizeValue(child.disponibilita)),
			fact("location", "Località", location),
		];
	} else if (profileType === "arbitro") {
		title = fullName(child.nome, child.cognome);
		highlights = [
			fact("availability", "Disponibilità", humanizeValue(child.disponibilita)),
			fact("location", "Località", location),
		];
	} else if (profileType === "torneo-evento") {
		title = cleanText(child.nome_organizzazione, 160);
		highlights = [
			fact("types", "Tipologie", formatSelection(cleanStringArray(child.tipologie_sport), "selezionate")),
			fact("headquarters", "Sede", cleanText(child.sede_principale, 160)),
			fact("location", "Località", location),
		];
	} else {
		title = cleanText(child.nome_organizzazione, 160);
		const cost = finiteNumber(child.costo_partenza);
		highlights = [
			fact("types", "Tipologie", formatSelection(cleanStringArray(child.tipologie_sport), "selezionate")),
			fact("price", "Costo", cost === null ? null : `Da ${formatCurrency(cost)}`),
			fact("location", "Località", location),
		];
	}

	if (!title) return null;
	return {
		kind: "registered",
		profileId: row.uuid,
		profileType,
		title,
		imageUrl: cleanText(row.link_foto_profilo, 2_000),
		verified: Boolean(row.verificato_il),
		presentation: cleanText(child.presentazione),
		location,
		highlights,
	};
}

function authorMapKey(profileId: string, profileType: ProfileType) {
	return `${profileId}:${profileType}`;
}

function queryErrorCode(error: unknown) {
	return isRecord(error) && typeof error.code === "string" ? error.code : "UNKNOWN";
}

function logQueryError(source: string, error: unknown) {
	console.error("[annunci] Public query failed", {
		source,
		code: queryErrorCode(error),
	});
}

async function loadOfficialAuthors(
	supabase: SupabaseClient<Database>,
	announcements: MappedAnnouncement[],
): Promise<AuthorLoadResult> {
	const requestedTypesById = new Map<string, Set<ProfileType>>();
	for (const announcement of announcements) {
		if (!announcement.authorId) continue;
		const requested = requestedTypesById.get(announcement.authorId) ?? new Set<ProfileType>();
		requested.add(announcement.item.profileType);
		requestedTypesById.set(announcement.authorId, requested);
	}

	const ids = [...requestedTypesById.keys()];
	const authors = new Map<string, AnnouncementAuthor>();
	for (let offset = 0; offset < ids.length; offset += AUTHOR_BATCH_SIZE) {
		const chunk = ids.slice(offset, offset + AUTHOR_BATCH_SIZE);
		const {data, error} = await officialAuthorQuery(supabase).in("uuid", chunk);
		if (error) {
			logQueryError("authors", error);
			return {authors: new Map(), error: true};
		}

		for (const row of data ?? []) {
			const requestedTypes = requestedTypesById.get(row.uuid);
			if (!requestedTypes) continue;
			for (const profileType of requestedTypes) {
				const author = registeredAuthor(row, profileType);
				if (author) authors.set(authorMapKey(row.uuid, profileType), author);
			}
		}
	}

	return {authors, error: false};
}

function withLoadedAuthor(
	announcement: MappedAnnouncement,
	authors: Map<string, AnnouncementAuthor>,
	authorsUnavailable = false,
) {
	if (!announcement.authorId) return announcement.item;
	if (authorsUnavailable) {
		return {
			...announcement.item,
			author: unavailableAuthor(announcement.item.profileType),
		};
	}
	const author = authors.get(authorMapKey(
		announcement.authorId,
		announcement.item.profileType,
	));
	return author ? {...announcement.item, author} : announcement.item;
}

function emptyDirectoryResult(error = false): AnnouncementDirectoryResult {
	return {
		announcements: [],
		total: 0,
		currentPage: 1,
		totalPages: 1,
		error,
	};
}

export async function loadLatestPublicAnnouncements(): Promise<LatestAnnouncementsResult> {
	try {
		const supabase = createAdminClient();

		const {data, error} = await publicAnnouncementQuery(supabase)
			.in("tipologia_annuncio", ANNOUNCEMENT_TYPES)
			.order("creato_il", {ascending: false, nullsFirst: false})
			.order("uuid", {ascending: false})
			.limit(6);

		if (error) {
			logQueryError("latest", error);
			return {announcements: [], error: true};
		}

		const announcements = (data ?? [])
			.map(mapAnnouncement)
			.filter((item): item is MappedAnnouncement => Boolean(item))
			.map(({item}) => ({
				id: item.id,
				profileType: item.profileType,
				title: item.title,
				location: item.location,
				createdAt: item.createdAt,
			}));

		return {announcements, error: false};
	} catch (error) {
		logQueryError("latest-unexpected", error);
		return {announcements: [], error: true};
	}
}

export async function loadPublicAnnouncementDirectory(
	query: AnnouncementDirectoryQuery,
): Promise<AnnouncementDirectoryResult> {
	try {
		const supabase = createAdminClient();
		const requestedTypes = getAnnouncementStorageTypes(query);
		const requiresClientFiltering = Boolean(query.q)
			|| getAnnouncementFilterEntries(query.filters)
				.some(([key]) => key !== "ricercaSquadra");

		if (!requiresClientFiltering) {
			async function fetchPage(page: number) {
				const from = (page - 1) * ANNOUNCEMENTS_PER_PAGE;
				return publicAnnouncementQuery(supabase, {count: "exact"})
					.in("tipologia_annuncio", requestedTypes)
					.order("creato_il", {ascending: false, nullsFirst: false})
					.order("uuid", {ascending: false})
					.range(from, from + ANNOUNCEMENTS_PER_PAGE - 1);
			}

			let pageResult = await fetchPage(query.page);
			if (pageResult.error) {
				logQueryError("directory-page", pageResult.error);
				return emptyDirectoryResult(true);
			}

			const total = pageResult.count ?? 0;
			const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PER_PAGE));
			const currentPage = Math.min(query.page, totalPages);
			if (currentPage !== query.page) {
				pageResult = await fetchPage(currentPage);
				if (pageResult.error) {
					logQueryError("directory-last-page", pageResult.error);
					return emptyDirectoryResult(true);
				}
			}

			const page = (pageResult.data ?? [])
				.map(mapAnnouncement)
				.filter((item): item is MappedAnnouncement => Boolean(item));
			const authorResult = await loadOfficialAuthors(supabase, page);

			return {
				announcements: page.map((item) => withLoadedAuthor(
					item,
					authorResult.authors,
					authorResult.error,
				)),
				total,
				currentPage,
				totalPages,
				error: false,
			};
		}

		const rows: AnnouncementQueryRow[] = [];

		for (let offset = 0; ; offset += ANNOUNCEMENT_BATCH_SIZE) {
			const {data, error} = await publicAnnouncementQuery(supabase)
				.in("tipologia_annuncio", requestedTypes)
				.order("creato_il", {ascending: false, nullsFirst: false})
				.order("uuid", {ascending: false})
				.range(offset, offset + ANNOUNCEMENT_BATCH_SIZE - 1);
			if (error) {
				logQueryError("directory", error);
				return emptyDirectoryResult(true);
			}

			const batch = data ?? [];
			rows.push(...batch);
			if (batch.length < ANNOUNCEMENT_BATCH_SIZE) break;
		}

		const filtered = rows
			.map(mapAnnouncement)
			.filter((item): item is MappedAnnouncement => Boolean(item))
			.filter((item) => matchesDirectoryQuery(item, query, requestedTypes));
		const total = filtered.length;
		const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PER_PAGE));
		const currentPage = Math.min(query.page, totalPages);
		const start = (currentPage - 1) * ANNOUNCEMENTS_PER_PAGE;
		const page = filtered.slice(start, start + ANNOUNCEMENTS_PER_PAGE);
		const authorResult = await loadOfficialAuthors(supabase, page);

		return {
			announcements: page.map((item) => withLoadedAuthor(
				item,
				authorResult.authors,
				authorResult.error,
			)),
			total,
			currentPage,
			totalPages,
			error: false,
		};
	} catch (error) {
		logQueryError("directory-unexpected", error);
		return emptyDirectoryResult(true);
	}
}

function validContact(row: {tipo: string; valore: string}): AnnouncementContact | null {
	const value = row.valore.trim();
	if (row.tipo === "email") {
		if (value.length > 254 || !/^[^@\s?&#]+@[^@\s?&#]+\.[^@\s?&#]+$/.test(value)) return null;
		return {kind: "email", label: "Email", value, href: `mailto:${value}`};
	}
	if (row.tipo !== "telefono" || value.length > 40) return null;
	const digits = value.replace(/\D/g, "");
	if (digits.length < 6 || digits.length > 20 || !/^[+0-9().\s-]+$/.test(value)) return null;
	const hrefValue = `${value.startsWith("+") ? "+" : ""}${digits}`;
	return {kind: "phone", label: "Telefono", value, href: `tel:${hrefValue}`};
}

export async function loadPublicAnnouncementDetail(
	id: string,
): Promise<AnnouncementDetailResult> {
	if (!isValidAnnouncementId(id)) return {status: "not-found"};

	try {
		const supabase = createAdminClient();
		const {data, error} = await publicAnnouncementQuery(supabase)
			.eq("uuid", id)
			.maybeSingle();
		if (error) {
			logQueryError("detail", error);
			return {status: "error"};
		}
		if (!data || !isAnnouncementType(data.tipologia_annuncio)) {
			return {status: "not-found"};
		}

		const mapped = mapAnnouncement(data);
		if (!mapped) return {status: "not-found"};
		const [authorResult, contactResult] = await Promise.all([
			loadOfficialAuthors(supabase, [mapped]),
			supabase
				.from("contatto_annuncio")
				.select("tipo, valore")
				.eq("uuid_annuncio", data.uuid)
				.order("id", {ascending: true}),
		]);

		if (contactResult.error) logQueryError("contacts", contactResult.error);

		const contacts = (contactResult.error ? [] : contactResult.data ?? [])
			.map(validContact)
			.filter((contact): contact is AnnouncementContact => Boolean(contact));
		return {
			status: "success",
			announcement: {
				...withLoadedAuthor(mapped, authorResult.authors, authorResult.error),
				fields: mapped.fields,
				contacts,
				contactsUnavailable: Boolean(contactResult.error),
			},
		};
	} catch (error) {
		logQueryError("detail-unexpected", error);
		return {status: "error"};
	}
}
