import type {
	AnnouncementDetailField,
	AnnouncementFact,
	AnnouncementFactKind,
	AnnouncementPlayerRoles,
} from "@/features/annunci/announcement-model";
import {normalizePlayerPrimaryRoles, normalizePlayerSpecificRoles} from "@/features/profilo/player-roles";
import {ANNATE_OPTIONS, ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {
	categoryLabel,
	normalizeCategories,
	normalizeFigure,
	normalizeFigures
} from "@/features/pubblica-annuncio/types/category-catalog";
import {normalizeStaffCategories, staffCategoryLabel} from "@/features/pubblica-annuncio/types/staff-category-catalog";

export const ACTIVE_ANNOUNCEMENT_TYPES = [
  "annuncio_giocatore",
  "annuncio_squadra_cerca_giocatore",
  "annuncio_squadra_cerca_staff",
  "annuncio_squadra_cerca_partita",
  "annuncio_squadra_cerca_sponsor",
  "annuncio_staff_sportivo",
  "annuncio_arbitro",
  "annuncio_torneo_evento",
  "annuncio_campo_impianto",
] as const;

export type ActiveAnnouncementType = typeof ACTIVE_ANNOUNCEMENT_TYPES[number];

export function isActiveAnnouncementType(value: string): value is ActiveAnnouncementType {
  return (ACTIVE_ANNOUNCEMENT_TYPES as readonly string[]).includes(value);
}

export interface AnnouncementLocation {
  region: string;
  city: string | null;
}

export interface AnnouncementFilterData {
	regions: string[];
	types: string[];
	roles: string[];
	years: string[];
	birthYear: string | null;
	currentCategory: string | null;
	figures: string[];
  categories: string[];
  car: string | null;
  cost: number | null;
  compensation: number | null;
}

const NOT_SPECIFIED = "Non specificato";
function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

export function finiteNumber(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string" || !value.trim()) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function shortFactValue(value: string | null) {
	if (!value) return NOT_SPECIFIED;
	return value.length > 96 ? `${value.slice(0, 93).trimEnd()}…` : value;
}

function fact(kind: AnnouncementFactKind, label: string, value: string | null, compact = true): AnnouncementFact {
	const normalizedValue = kind === "location" && value === "Località non specificata"
		? null
		: value;
	return {kind, label, value: compact ? shortFactValue(normalizedValue) : normalizedValue ?? NOT_SPECIFIED};
}

function formatSelection(
	values: string[],
	plural: "selezionati" | "selezionate",
	compact = true,
) {
	if (values.length === 0) return NOT_SPECIFIED;
	if (!compact) return values.join(", ");
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

export function humanizeValue(value: unknown) {
	const text = cleanText(value, 160);
	if (!text || text === "non-specificare") return NOT_SPECIFIED;
	const normalized = text.replaceAll("-", " ");
	return normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1);
}

function formatOpeningHours(value: unknown) {
	if (typeof value === "string") return cleanText(value) ?? NOT_SPECIFIED;
	if (Array.isArray(value)) {
		const labels: Record<string, string> = {
			lunedi: "Lunedì", martedi: "Martedì", mercoledi: "Mercoledì", giovedi: "Giovedì",
			venerdi: "Venerdì", sabato: "Sabato", domenica: "Domenica",
		};
		const rows = value.flatMap((entry): string[] => {
			if (!isRecord(entry) || entry.attivo !== true || typeof entry.giorno !== "string") return [];
			const day = labels[entry.giorno];
			if (!day) return [];
			const from = cleanText(entry.dalle, 5);
			const to = cleanText(entry.alle, 5);
			return [from && to ? `${day}: ${from}–${to}` : `${day}: orario da definire`];
		});
		return rows.length ? rows.join("; ") : NOT_SPECIFIED;
	}
	if (!isRecord(value)) return NOT_SPECIFIED;
	return cleanText(value.descrizione) ?? NOT_SPECIFIED;
}

function formatPrizes(value: unknown) {
	if (!Array.isArray(value)) return [];
	const prizes = value.flatMap((item): string[] => {
		if (!isRecord(item)) return [];
		const title = cleanText(item.titoloPremio, 160);
		if (!title) return [];
		const place = cleanText(item.posto, 160);
		return [place ? `${place}: ${title}` : title];
	});
	return prizes;
}

export function formatLocation(locations: AnnouncementLocation[]) {
	const first = locations[0];
	if (!first) return "Località non specificata";
	const label = [first.city, first.region].filter(Boolean).join(", ");
	return locations.length > 1 ? `${label} +${locations.length - 1}` : label;
}

function emptyFilterData(locations: AnnouncementLocation[]): AnnouncementFilterData {
	return {
		regions: [...new Set(locations.map(({region}) => region))],
		types: [],
		roles: [],
		years: [],
		birthYear: null,
		currentCategory: null,
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

function staffHistoryLines(value: unknown, qualification = false): string[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		if (!isRecord(entry)) return entry === null ? [] : [typeof entry === "string" ? entry : JSON.stringify(entry)];
		const title = cleanText(entry.titolo, 120);
		const organization = cleanText(entry.ente, 120);
		const from = cleanText(entry.periodoDa, 4);
		const to = cleanText(entry.periodoA, 4);
		const description = cleanText(entry.descrizione);
		const status = entry.stato === "in-corso" ? "In corso" : entry.stato === "conseguito" ? "Conseguito" : null;
		const extra = qualification ? Object.entries(entry)
			.filter(([key, item]) => !["id", "titolo", "ente", "periodoDa", "periodoA", "descrizione", "squadraProfiloId"].includes(key) && !(key === "stato" && ["in-corso", "conseguito", "non-specificare"].includes(String(item))))
			.map(([key, item]) => `${key}: ${typeof item === "string" ? item : JSON.stringify(item)}`) : [];
		const parts = [title, organization, from && to ? `${from}–${to}` : from ?? to, description, qualification ? status : null, ...extra].filter(Boolean);
		return parts.length > 0 ? [parts.join(" · ")] : [];
	});
}

function detailListField(
	label: string,
	items: string[],
	value: string,
	listStyle: "chips" | "rows" = "chips",
	wide = false,
): AnnouncementDetailField {
	return {
		label,
		value,
		items,
		listStyle,
		...(wide ? {wide: true} : {}),
	};
}

export function announcementContent(
	type: ActiveAnnouncementType,
	detail: Record<string, unknown>,
	locations: AnnouncementLocation[],
	detailed = false,
	customTitle?: string | null,
) {
	const selection = (values: string[], plural: "selezionati" | "selezionate") => formatSelection(values, plural, !detailed);
	const contentFact = (kind: AnnouncementFactKind, label: string, value: string | null) => fact(kind, label, value, !detailed);
	const location = detailed && locations.length > 0
		? locations.map(({city, region}) => [city, region].filter(Boolean).join(", ")).join(", ")
		: formatLocation(locations);
	const filters = emptyFilterData(locations);
	let title: string;
	let description = cleanText(detail.descrizione_aggiuntiva);
	let facts: AnnouncementFact[];
	let fields: AnnouncementDetailField[];
	let searchValues: string[] = [];
	let playerRoles: AnnouncementPlayerRoles | null = null;

	if (type === "annuncio_giocatore") {
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const primaryRoles = normalizePlayerPrimaryRoles(cleanStringArray(detail.ruoli_principali));
		const secondaryRoles = normalizePlayerSpecificRoles(cleanStringArray(detail.ruoli_secondari));
		const categoryValues = normalizeCategories(cleanStringArray(detail.categorie_ricercate));
		const categories = categoryValues.map(categoryLabel);
		title = "Ricerca opportunità";
		facts = [
			contentFact("roles", "Ruoli principali", selection(primaryRoles, "selezionati")),
			contentFact("roles", "Ruoli specifici", selection(secondaryRoles, "selezionati")),
			contentFact("types", "Tipologie", selection(types, "selezionate")),
			contentFact("categories", "Categorie ricercate", selection(categories, "selezionate")),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Ruoli principali", primaryRoles, selection(primaryRoles, "selezionati")),
			detailListField("Ruoli specifici", secondaryRoles, selection(secondaryRoles, "selezionati")),
			detailListField("Tipologie", types, selection(types, "selezionate")),
			detailListField("Categorie ricercate", categories, selection(categories, "selezionate")),
		];
		filters.types = types;
		filters.roles = [...new Set([...primaryRoles, ...secondaryRoles])];
		filters.categories = categoryValues;
		searchValues = [...types, ...primaryRoles, ...secondaryRoles, ...categories];
		playerRoles = {primaryRoles, secondaryRoles};
	} else if (type === "annuncio_squadra_cerca_giocatore") {
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const primaryRoles = normalizePlayerPrimaryRoles(cleanStringArray(detail.ruoli_principali));
		const secondaryRoles = normalizePlayerSpecificRoles(cleanStringArray(detail.ruoli_secondari));
		const legacyYears = cleanStringArray(detail.annate_ricercate);
		const yearFrom = finiteNumber(detail.annata_da);
		const yearTo = finiteNumber(detail.annata_a);
		const hasRange = yearFrom !== null && yearTo !== null && Number.isInteger(yearFrom) && Number.isInteger(yearTo) && yearFrom >= 1900 && yearTo >= yearFrom;
		const years = hasRange ? ANNATE_OPTIONS.filter((year) => Number(year) >= yearFrom && Number(year) <= yearTo) : legacyYears;
		const yearLabel = hasRange ? `Dal ${yearFrom} al ${yearTo}` : selection(legacyYears, "selezionate");
		const season = cleanText(detail.stagione, 80);
		const specificRoleCount = secondaryRoles.length;
		const effectiveRoleCount = primaryRoles.length + specificRoleCount;
		const singleRole = primaryRoles.length === 1 && specificRoleCount === 1
			? secondaryRoles[0]
			: effectiveRoleCount === 1
				? primaryRoles[0] ?? secondaryRoles[0]
				: null;
		title = singleRole
			? `Ricerca ${singleRole}`
			: "Ricerca giocatori";
		facts = [
			contentFact("roles", "Ruolo/i cercati", selection(primaryRoles, "selezionati")),
			contentFact("categories", "Annate", yearLabel),
			contentFact("season", "Stagione", season),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Ruolo/i cercati", primaryRoles, selection(primaryRoles, "selezionati")),
			detailListField("Ruoli specifici", secondaryRoles, selection(secondaryRoles, "selezionati")),
			detailListField("Annate ricercate", hasRange ? [yearLabel] : legacyYears, yearLabel),
			detailField("Stagione", season),
			detailListField("Tipologie", types, selection(types, "selezionate")),
		];
		filters.types = types;
		filters.roles = [...new Set([...primaryRoles, ...secondaryRoles])];
		filters.years = years;
		searchValues = [...types, ...primaryRoles, ...secondaryRoles, ...years, season ?? ""];
		playerRoles = {primaryRoles, secondaryRoles};
	} else if (type === "annuncio_squadra_cerca_staff") {
		const rawFigure = cleanText(detail.figura_ricercata, 160);
		const savedFigures = normalizeFigures(cleanStringArray(detail.figure_ricercate));
		const figures = savedFigures.length ? savedFigures : rawFigure ? [normalizeFigure(rawFigure)] : [];
		const figure = figures[0] ?? null;
		const season = cleanText(detail.stagione, 80);
		const sector = cleanText(detail.settore, 160);
		const compensation = finiteNumber(detail.compenso_mensile);
		const requirements = cleanText(detail.requisiti);
		const historicalPeriod = formatPeriod(detail.periodo_dal, detail.periodo_al);
		title = figures.length === 1
			? `Ricerca ${figure}`
			: "Ricerca staff sportivo";
		description = description ?? requirements;
		facts = [
			contentFact("figures", figures.length === 1 ? "Figura ricercata" : "Figure ricercate", selection(figures, "selezionate")),
			contentFact("sector", "Settore", sector),
			contentFact("compensation", "Compenso mensile", compensation === null ? null : formatCurrency(compensation)),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Figure ricercate", figures, selection(figures, "selezionate")),
			detailField("Settore", sector),
			detailField("Compenso mensile", compensation === null ? null : formatCurrency(compensation)),
			...(season ? [detailField("Stagione", season)] : []),
			...(historicalPeriod !== NOT_SPECIFIED ? [detailField("Periodo", historicalPeriod)] : []),
			detailField("Requisiti", requirements, true),
		];
		filters.figures = figures;
		filters.compensation = compensation;
		searchValues = [...figures, sector ?? "", season ?? "", requirements ?? ""];
	} else if (type === "annuncio_squadra_cerca_partita") {
		const categoryValues = normalizeCategories(cleanStringArray(detail.categorie_avversario));
		const categories = categoryValues.map(categoryLabel);
		const travel = cleanText(detail.disponibilita_trasferta, 40);
		const period = formatPeriod(detail.periodo_dal, detail.periodo_al);
		const time = formatTimeRange(detail.orario_dalle, detail.orario_alle);
		title = "Ricerca partite/amichevoli";
		facts = [
			contentFact("categories", "Livelli cercati", selection(categories, "selezionati")),
			contentFact("period", "Periodo", period),
			contentFact("availability", "Trasferta", travel),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Livelli avversari cercati", categories, selection(categories, "selezionati")),
			detailField("Disponibilità alla trasferta", travel),
			detailField("Periodo", period),
			detailField("Orario", time),
		];
		filters.categories = categoryValues;
		searchValues = [...categories, travel ?? "", period, time];
	} else if (type === "annuncio_squadra_cerca_sponsor") {
		const sector = cleanText(detail.categoria_settore, 160);
		const support = cleanText(detail.supporto_cercato);
		const offer = cleanText(detail.offerta_fornita);
		title = "Ricerca sponsor";
		description = description ?? support;
		facts = [
			contentFact("sector", "Settore", sector),
			contentFact("services", "Supporto cercato", support),
			contentFact("services", "Visibilità offerta", offer),
			...(locations.length > 0 ? [contentFact("location", "Località", location)] : []),
		];
		fields = [
			detailField("Settore", sector),
			...(support ? [detailField("Supporto cercato", support, true)] : []),
			detailField("Visibilità offerta", offer, true),
		];
		searchValues = [sector ?? "", support ?? "", offer ?? ""];
	} else if (type === "annuncio_staff_sportivo") {
		const figures = normalizeFigures(cleanStringArray(detail.figure_professionali));
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const categoryValues = normalizeStaffCategories(cleanStringArray(detail.categorie_ricercate));
		const categories = categoryValues.map(staffCategoryLabel);
		const occupation = cleanText(detail.disponibilita_occupazione, 160);
		const travel = cleanText(detail.disponibilita_spostamento, 40);
		const remote = detail.disponibile_remoto === true;
		const experienceLines = staffHistoryLines(detail.lista_esperienze);
		const qualificationLines = staffHistoryLines(detail.qualifiche_licenze, true);
		title = "Ricerca opportunità";
		facts = [
			contentFact("figures", "Figure", selection(figures, "selezionate")),
			contentFact("categories", "Categorie", selection(categories, "selezionate")),
			contentFact("availability", "Spostamenti", travel),
			...(remote ? [contentFact("availability", "Da remoto", "Sì")] : []),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Figure professionali", figures, selection(figures, "selezionate")),
			detailListField("Tipologie", types, selection(types, "selezionate")),
			detailListField("Categorie ricercate", categories, selection(categories, "selezionate")),
			detailField("Disponibilità lavorativa", humanizeValue(occupation)),
			detailField("Disponibilità agli spostamenti", travel),
			detailField("Disponibile anche da remoto", remote ? "Sì" : "No"),
			detailListField("Lista esperienze", experienceLines, selection(experienceLines, "selezionate")),
			detailListField("Qualifiche / Licenze", qualificationLines, selection(qualificationLines, "selezionate")),
		];
		filters.types = types;
		filters.figures = figures;
		filters.categories = categoryValues;
		searchValues = [...figures, ...types, ...categories, occupation ?? "", travel ?? "", ...experienceLines, ...qualificationLines];
	} else if (type === "annuncio_arbitro") {
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const categoryValues = normalizeCategories(cleanStringArray(detail.categorie_ricercate));
		const categories = categoryValues.map(categoryLabel);
		const occupation = cleanText(detail.disponibilita_occupazione, 160);
		const travel = cleanText(detail.disponibilita_spostamento, 40);
		const car = cleanText(detail.automunito, 40);
		const experienceLines = staffHistoryLines(detail.lista_esperienze);
		const qualificationLines = staffHistoryLines(detail.qualifiche_licenze, true);
		title = "Ricerca opportunità";
		facts = [
			...(categories.length > 0 ? [contentFact("categories", "Categorie", selection(categories, "selezionate"))] : []),
			contentFact("availability", "Disponibilità", humanizeValue(occupation)),
			contentFact("car", "Automunito", car),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Tipologie", types, selection(types, "selezionate")),
			...(categories.length > 0 ? [detailListField("Categorie storiche", categories, selection(categories, "selezionate"))] : []),
			detailField("Disponibilità", humanizeValue(occupation)),
			detailField("Disponibilità agli spostamenti", travel),
			detailField("Automunito", car),
			detailListField("Lista esperienze", experienceLines, selection(experienceLines, "selezionate")),
			detailListField("Qualifiche / Licenze", qualificationLines, selection(qualificationLines, "selezionate")),
		];
		filters.types = types;
		filters.categories = categoryValues;
		filters.car = car;
		searchValues = [...types, ...categories, occupation ?? "", travel ?? "", car ?? "", ...experienceLines, ...qualificationLines];
	} else if (type === "annuncio_torneo_evento") {
		const name = cleanText(detail.nome_evento, 160);
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const registration = humanizeValue(detail.modalita_iscrizione);
		const participation = humanizeValue(detail.tipo_partecipazione);
		const cost = finiteNumber(detail.costo_partecipazione);
		const teams = finiteNumber(detail.numero_squadre);
		const years = formatYearRange(detail.annate_ammesse_da, detail.annate_ammesse_a);
		const prizes = formatPrizes(detail.lista_premi_trofei);
		const prizesText = prizes.length > 0 ? prizes.join("; ") : NOT_SPECIFIED;
		title = name ?? "Ricerca opportunità";
		facts = [
			contentFact("registration", "Iscrizione", registration),
			contentFact("participation", "Partecipazione", participation),
			contentFact("price", "Costo", cost === null ? null : formatCurrency(cost)),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Tipologia calcio", types, selection(types, "selezionate")),
			detailField("Modalità di iscrizione", registration),
			detailField("Annate ammesse", years),
			detailField("Numero di squadre", teams === null ? null : String(teams)),
			detailField("Costo di partecipazione", cost === null ? null : formatCurrency(cost)),
			detailField("Tipo di partecipazione", participation),
			detailListField("Premi e trofei", prizes, prizesText, "rows", true),
		];
		filters.types = types;
		filters.cost = cost;
		searchValues = [...types, registration, participation, years, prizesText];
	} else {
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const cost = finiteNumber(detail.costo_partenza);
		const services = cleanText(detail.servizi_inclusi);
		const address = cleanText(detail.indirizzo);
		const hours = formatOpeningHours(detail.orari);
		title = "CAMPO DISPONIBILE";
		description = description ?? services;
		facts = [
			contentFact("types", "Tipologia campo da pubblicizzare", selection(types, "selezionate")),
			contentFact("price", "Prezzo orario", cost === null ? null : `Da ${formatCurrency(cost)}`),
			contentFact("services", "Servizi", services),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Tipologia campo da pubblicizzare", types, selection(types, "selezionate")),
			detailField("Indirizzo del campo", address),
			detailField("Orari", hours, true),
			detailField("Prezzo orario", cost === null ? null : formatCurrency(cost)),
			detailField("Servizi inclusi", services, true),
		];
		filters.types = types;
		filters.cost = cost;
		searchValues = [...types, address ?? "", services ?? "", hours];
	}

	return {title: cleanText(customTitle, 50) ?? title, description, location, locations, facts, fields, playerRoles, filters, searchValues};
}
