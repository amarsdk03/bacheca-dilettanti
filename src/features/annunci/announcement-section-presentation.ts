import type {AnnouncementDetailSection, AnnouncementSectionPresentation} from "./announcement-model";
import {finiteNumber} from "./announcement-content";
import {FACILITY_WEEKDAYS, isValidIsoDate, isValidTime} from "@/features/pubblica-annuncio/publish-field-validation";

function record(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed && !/^non specificat[oaie]$/i.test(trimmed) ? trimmed : null;
}

const DAY_LABELS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const CHOICES = new Set(["football", "roles", "specific-roles", "figures", "field-types", "content-types"]);
const CATEGORIES = new Set(["categories", "previous-categories", "opponent-category", "current-category"]);
const SCALARS = new Set(["birth-year", "birth-years", "season", "period", "time", "team-group", "field", "car", "travel", "availability", "company-type"]);
const CURRENCY = new Intl.NumberFormat("it-IT", {style: "currency", currency: "EUR"});
const DATE = new Intl.DateTimeFormat("it-IT", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});

function date(value: unknown) {
	const input = text(value);
	return input && isValidIsoDate(input) ? DATE.format(new Date(`${input}T00:00:00Z`)) : null;
}

function time(value: unknown) {
	const input = text(value);
	if (!input || !/^\d{2}:\d{2}(?::[0-5]\d)?$/.test(input)) return null;
	const hoursAndMinutes = input.slice(0, 5);
	return isValidTime(hoursAndMinutes) ? hoursAndMinutes : null;
}

function history(value: unknown): Extract<AnnouncementSectionPresentation, {kind: "history"}>["rows"] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry): Extract<AnnouncementSectionPresentation, {kind: "history"}>["rows"] => {
		if (typeof entry === "string") {
			const title = text(entry);
			return title ? [{title, organization: null, period: null, description: null, status: null}] : [];
		}
		if (!record(entry)) return [];
		const title = text(entry.titolo);
		const organization = text(entry.ente);
		const description = text(entry.descrizione);
		const from = text(entry.periodoDa), to = text(entry.periodoA);
		const status = entry.stato === "in-corso" || entry.stato === "conseguito" ? entry.stato : null;
		const period = [from, to].filter(Boolean).join(" – ") || null;
		if (!title && !organization && !description && !period && !status) return [];
		return [{title: title ?? organization ?? "Dettaglio", organization: title ? organization : null, period, description, status}];
	});
}

/** Presentation metadata stays plain and serializable across server/client boundaries. */
export function buildAnnouncementSectionPresentation(section: AnnouncementDetailSection, raw: Record<string, unknown>): AnnouncementSectionPresentation {
	const {id} = section;
	if (section.locations) return {kind: "locations"};
	if (CHOICES.has(id)) return {kind: "choices"};
	if (CATEGORIES.has(id)) return {kind: "categories"};
	if (id === "hours" && Array.isArray(raw.orari)) {
		const entries = raw.orari.filter(record);
		const rows = FACILITY_WEEKDAYS.flatMap((day, index) => {
			const entry = entries.find(item => item.giorno === day && item.attivo === true);
			return entry ? [{day: DAY_LABELS[index], from: time(entry.dalle), to: time(entry.alle)}] : [];
		});
		if (rows.length) return {kind: "schedule", rows};
	}
	if (id === "prizes" && Array.isArray(raw.lista_premi_trofei)) {
		const rows = raw.lista_premi_trofei.flatMap(entry => {
			if (!record(entry)) return [];
			const title = text(entry.titoloPremio);
			return title ? [{place: text(entry.posto), title}] : [];
		});
		if (rows.length) return {kind: "prizes", rows};
	}
	if (id === "experience" || id === "qualifications") {
		const rows = history(id === "experience" ? raw.lista_esperienze : raw.qualifiche_licenze);
		if (rows.length) return {kind: "history", rows};
	}
	if (["price", "cost", "team-count"].includes(id)) {
		const amount = finiteNumber(id === "price" ? raw.costo_partenza : id === "cost" ? raw.costo_partecipazione : raw.numero_squadre);
		if (amount !== null && amount >= 0) {
			if (id === "team-count") return {kind: "metric", amount: new Intl.NumberFormat("it-IT").format(amount), unit: amount === 1 ? "squadra" : "squadre"};
			const participant = text(raw.tipo_partecipazione)?.toLocaleLowerCase("it-IT");
			const unit = participant === "squadre" || participant === "squadra" ? "/ squadra" : participant === "giocatori" || participant === "giocatore" ? "/ giocatore" : undefined;
			return {kind: "metric", amount: CURRENCY.format(amount), unit: id === "price" ? "/ ora" : unit, ...(id === "price" ? {qualifier: "Da"} : {})};
		}
	}
	if (id === "period") {
		const from = date(raw.periodo_dal), to = date(raw.periodo_al);
		if (from || to) return {kind: "scalar", value: from && to && from === to ? from : [from && `Dal ${from}`, to && `Fino al ${to}`].filter(Boolean).join("\n")};
	}
	if (id === "time") {
		const from = time(raw.orario_dalle), to = time(raw.orario_alle);
		if (from || to) return {kind: "scalar", value: [from && `Dalle ${from}`, to && `alle ${to}`].filter(Boolean).join(" ")};
	}
	if (SCALARS.has(id) || id === "hours" || id === "price" || id === "cost" || id === "team-count") {
		if (id === "birth-years" && section.value?.includes(" · ")) {
			const [value, secondary] = section.value.split(" · ");
			return {kind: "scalar", value, secondary};
		}
		return {kind: "scalar"};
	}
	if (id === "services" && section.value) {
		const lines = section.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
		if (lines.length && lines.every(line => /^(?:[-*•✓✅]|\d+[.)])\s+/.test(line))) {
			return {kind: "checklist", items: lines.map(line => line.replace(/^(?:[-*•✓✅]|\d+[.)])\s+/, ""))};
		}
	}
	return {kind: id === "promotion" || id === "visibility" ? "offer" : "prose"};
}
