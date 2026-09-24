import type {
  AnnouncementDetailField,
  AnnouncementFact,
  AnnouncementFactKind,
  AnnouncementPlayerRoles,
} from "@/features/annunci/announcement-model";
import {normalizePlayerPrimaryRoles, normalizePlayerSpecificRoles} from "@/features/profilo/player-roles";
import {ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

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
		const categories = cleanStringArray(detail.categorie_ricercate);
		title = primaryRoles[0] ? `${primaryRoles[0]} disponibile` : "Giocatore disponibile";
		facts = [
			contentFact("roles", "Ruoli principali", selection(primaryRoles, "selezionati")),
			contentFact("roles", "Ruoli secondari", selection(secondaryRoles, "selezionati")),
			contentFact("types", "Tipologie", selection(types, "selezionate")),
			contentFact("categories", "Categorie ricercate", selection(categories, "selezionate")),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Ruoli principali", primaryRoles, selection(primaryRoles, "selezionati")),
			detailListField("Ruoli secondari", secondaryRoles, selection(secondaryRoles, "selezionati")),
			detailListField("Tipologie", types, selection(types, "selezionate")),
			detailListField("Categorie ricercate", categories, selection(categories, "selezionate")),
		];
		filters.types = types;
		filters.roles = [...new Set([...primaryRoles, ...secondaryRoles])];
		filters.categories = categories;
		searchValues = [...types, ...primaryRoles, ...secondaryRoles, ...categories];
		playerRoles = {primaryRoles, secondaryRoles};
	} else if (type === "annuncio_squadra_cerca_giocatore") {
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const primaryRoles = normalizePlayerPrimaryRoles(cleanStringArray(detail.ruoli_principali));
		const secondaryRoles = normalizePlayerSpecificRoles(cleanStringArray(detail.ruoli_secondari));
		const years = cleanStringArray(detail.annate_ricercate);
		const season = cleanText(detail.stagione, 80);
		title = primaryRoles[0] ? `Ricerca ${primaryRoles[0].toLocaleLowerCase("it-IT")}` : "Ricerca giocatore";
		facts = [
			contentFact("roles", "Ruoli", selection(primaryRoles, "selezionati")),
			contentFact("categories", "Annate", selection(years, "selezionate")),
			contentFact("season", "Stagione", season),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Ruoli principali", primaryRoles, selection(primaryRoles, "selezionati")),
			detailListField("Ruoli secondari", secondaryRoles, selection(secondaryRoles, "selezionati")),
			detailListField("Annate ricercate", years, selection(years, "selezionate")),
			detailField("Stagione", season),
			detailListField("Tipologie", types, selection(types, "selezionate")),
		];
		filters.types = types;
		filters.roles = [...new Set([...primaryRoles, ...secondaryRoles])];
		searchValues = [...types, ...primaryRoles, ...secondaryRoles, ...years, season ?? ""];
		playerRoles = {primaryRoles, secondaryRoles};
	} else if (type === "annuncio_squadra_cerca_staff") {
		const figure = cleanText(detail.figura_ricercata, 160);
		const sector = cleanText(detail.settore, 160);
		const compensation = finiteNumber(detail.compenso_mensile);
		const requirements = cleanText(detail.requisiti);
		title = figure ? `Ricerca ${figure.toLocaleLowerCase("it-IT")}` : "Ricerca staff sportivo";
		description = description ?? requirements;
		facts = [
			contentFact("figures", "Figura", figure),
			contentFact("sector", "Settore", sector),
			contentFact("compensation", "Compenso mensile", compensation === null ? null : formatCurrency(compensation)),
			contentFact("location", "Località", location),
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
			contentFact("categories", "Categorie", selection(categories, "selezionate")),
			contentFact("period", "Periodo", period),
			contentFact("availability", "Trasferta", travel),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Categorie avversarie", categories, selection(categories, "selezionate")),
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
			contentFact("sector", "Settore", sector),
			contentFact("services", "Supporto cercato", support),
			contentFact("services", "Offerta", offer),
			contentFact("location", "Località", location),
		];
		fields = [
			detailField("Categoria / settore", sector),
			detailField("Supporto cercato", support, true),
			detailField("Offerta fornita", offer, true),
		];
		searchValues = [sector ?? "", support ?? "", offer ?? ""];
	} else if (type === "annuncio_staff_sportivo") {
		const figures = cleanStringArray(detail.figure_professionali);
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const categories = cleanStringArray(detail.categorie_ricercate);
		const occupation = cleanText(detail.disponibilita_occupazione, 160);
		const travel = cleanText(detail.disponibilita_spostamento, 40);
		title = figures[0] ? `${figures[0]} disponibile` : "Staff sportivo disponibile";
		facts = [
			contentFact("figures", "Figure", selection(figures, "selezionate")),
			contentFact("categories", "Categorie", selection(categories, "selezionate")),
			contentFact("availability", "Spostamenti", travel),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Figure professionali", figures, selection(figures, "selezionate")),
			detailListField("Tipologie", types, selection(types, "selezionate")),
			detailListField("Categorie ricercate", categories, selection(categories, "selezionate")),
			detailField("Disponibilità lavorativa", humanizeValue(occupation)),
			detailField("Disponibilità agli spostamenti", travel),
		];
		filters.types = types;
		filters.figures = figures;
		filters.categories = categories;
		searchValues = [...figures, ...types, ...categories, occupation ?? "", travel ?? ""];
	} else if (type === "annuncio_arbitro") {
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const categories = cleanStringArray(detail.categorie_ricercate);
		const occupation = cleanText(detail.disponibilita_occupazione, 160);
		const travel = cleanText(detail.disponibilita_spostamento, 40);
		const car = cleanText(detail.automunito, 40);
		title = "Arbitro disponibile";
		facts = [
			contentFact("categories", "Categorie", selection(categories, "selezionate")),
			contentFact("availability", "Disponibilità", humanizeValue(occupation)),
			contentFact("car", "Automunito", car),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Tipologie", types, selection(types, "selezionate")),
			detailListField("Categorie ricercate", categories, selection(categories, "selezionate")),
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
		const types = ordinaTipologieCalcio(cleanStringArray(detail.tipologie_sport));
		const registration = humanizeValue(detail.modalita_iscrizione);
		const participation = humanizeValue(detail.tipo_partecipazione);
		const cost = finiteNumber(detail.costo_partecipazione);
		const teams = finiteNumber(detail.numero_squadre);
		const years = formatYearRange(detail.annate_ammesse_da, detail.annate_ammesse_a);
		const prizes = formatPrizes(detail.lista_premi_trofei);
		const prizesText = prizes.length > 0 ? prizes.join("; ") : NOT_SPECIFIED;
		title = name ?? "Torneo o evento";
		facts = [
			contentFact("registration", "Iscrizione", registration),
			contentFact("participation", "Partecipazione", participation),
			contentFact("price", "Costo", cost === null ? null : formatCurrency(cost)),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Tipologie", types, selection(types, "selezionate")),
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
		const hours = formatOpeningHours(detail.orari);
		title = "Campo o impianto disponibile";
		description = description ?? services;
		facts = [
			contentFact("types", "Tipologie", selection(types, "selezionate")),
			contentFact("price", "Costo", cost === null ? null : `Da ${formatCurrency(cost)}`),
			contentFact("services", "Servizi", services),
			contentFact("location", "Località", location),
		];
		fields = [
			detailListField("Tipologie", types, selection(types, "selezionate")),
			detailField("Orari", hours, true),
			detailField("Costo di partenza", cost === null ? null : formatCurrency(cost)),
			detailField("Servizi inclusi", services, true),
		];
		filters.types = types;
		filters.cost = cost;
		searchValues = [...types, services ?? "", hours];
	}

	return {title, description, location, locations, facts, fields, playerRoles, filters, searchValues};
}

