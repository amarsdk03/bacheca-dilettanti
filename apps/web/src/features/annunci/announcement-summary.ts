import {buildAnnouncementDetailSections} from "./announcement-detail-sections";
import {buildAnnouncementSectionPresentation} from "./announcement-section-presentation";
import type {
	AnnouncementAuthorProfileData,
	AnnouncementDetailField,
	AnnouncementDetailSection,
	AnnouncementFact,
	AnnouncementType
} from "./announcement-model";
import {groupPublicProfileLocations, type PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import {availabilityLabel} from "@/features/profilo/public-profile-display";

export type AnnouncementSummarySection = AnnouncementDetailSection & {wide?: boolean};

function text(value: unknown) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed && !/^(?:non specificat[oaie]|non[- ]specificare|vedi (?:il )?profilo[.!]?)$/i.test(trimmed) ? trimmed : null;
}

/** The form supports either named cities or a whole region, never both. */
export function summaryLocationGroups(locations: readonly PublicProfileLocation[]) {
	return groupPublicProfileLocations(locations).map(group => ({
		...group,
		cities: [...new Map(group.cities.map(city => [city.toLocaleLowerCase("it-IT"), city])).values()],
		hasWholeRegion: group.cities.length === 0,
	}));
}

export function summaryAnnouncementTitle(type: AnnouncementType, customTitle: unknown, fallback: string, author: string | null) {
	return text(customTitle) ?? (["annuncio_giocatore", "annuncio_staff_sportivo", "annuncio_arbitro", "annuncio_campo_impianto"].includes(type) ? text(author) : null) ?? fallback;
}

/** Complete, serializable display data shared by drafts, saved confirmation and public details. */
export function buildAnnouncementSummarySections(input: {
	type: AnnouncementType;
	fields: AnnouncementDetailField[];
	facts: AnnouncementFact[];
	locations: PublicProfileLocation[];
	authorProfile: AnnouncementAuthorProfileData | null;
	raw: Record<string, unknown>;
}): AnnouncementSummarySection[] {
	const {type, fields, raw} = input;
	let sections: AnnouncementSummarySection[] = buildAnnouncementDetailSections(input);
	const remove = (...ids: string[]) => {sections = sections.filter(section => !ids.includes(section.id));};
	const add = (id: string, title: string, value: unknown, wide = false, items?: string[]) => {
		const section: AnnouncementSummarySection = {id, title, emoji: null, value: text(value), emptyLabel: "Non specificato", wide, ...(items ? {items} : {})};
		section.presentation = buildAnnouncementSectionPresentation(section, raw);
		sections.push(section);
		return section;
	};
	const field = (id: string, title: string, label: string) => {
		const source = fields.find(item => item.label === label);
		return add(id, title, source?.value, source?.wide, source?.items);
	};
	const section = (id: string) => sections.find(item => item.id === id);
	const setValue = (id: string, value: string | null) => {
		const item = section(id);
		if (item) item.value = value;
	};
	const football = section("football");
	if (football) football.title = "Tipologia calcio";
	const labels: Record<string, string> = {"birth-year": "Anno di nascita", qualifications: "Qualifiche / Licenze", experience: "Esperienze", travel: "Disponibilità agli spostamenti", "team-count": "Numero squadre", cost: "Costo di partecipazione", price: "Prezzo orario"};
	for (const item of sections) if (labels[item.id]) item.title = labels[item.id];
	const areas = section("search-areas");
	if (areas && type !== "annuncio_torneo_evento") areas.title = type === "annuncio_campo_impianto" ? "Località del campo" : "Zone di ricerca";

	if (type === "annuncio_giocatore") {
		if (section("categories")) section("categories")!.title = "Categorie ricercate";
		// Main and specific roles are distinct selections, not duplicate facts.
		remove("roles");
		field("roles", "Ruoli principali", "Ruoli principali");
		field("specific-roles", "Ruoli specifici", "Ruoli specifici");
		if (section("previous-categories")) section("previous-categories")!.title = "Carriera sportiva";
	} else if (type === "annuncio_squadra_cerca_staff") {
		remove("birth-years"); // This field is not collected by the current form.
		field("compensation", "Compenso mensile", "Compenso mensile").presentation = {kind: "scalar"};
	} else if (type === "annuncio_squadra_cerca_partita") {
		field("travel", "Disponibilità alla trasferta", "Disponibilità alla trasferta");
	} else if (type === "annuncio_squadra_cerca_sponsor") {
		remove("search-areas"); // Sponsors use the team's headquarters, not search areas.
		field("sector", "Settore", "Settore");
	} else if (type === "annuncio_staff_sportivo") {
		// These values belong to the announcement snapshot, not the current live profile.
		const figures = fields.find(item => item.label === "Figure professionali");
		if (section("figures")) Object.assign(section("figures")!, {value: text(figures?.value), items: figures?.items ?? []});
		field("availability", "Disponibilità lavorativa", "Disponibilità lavorativa");
		setValue("availability", availabilityLabel(typeof raw.disponibilita_occupazione === "string" ? raw.disponibilita_occupazione : null) ?? section("availability")?.value ?? null);
		// Absence in historical records is not an explicit "No".
		if (typeof raw.disponibile_remoto === "boolean") add("remote", "Disponibile anche da remoto", raw.disponibile_remoto ? "Sì" : "No");
	} else if (type === "annuncio_arbitro") {
		field("availability", "Disponibilità", "Disponibilità");
		setValue("availability", availabilityLabel(typeof raw.disponibilita_occupazione === "string" ? raw.disponibilita_occupazione : null) ?? section("availability")?.value ?? null);
		if (section("experience")) section("experience")!.title = "Esperienze arbitrali";
	} else if (type === "annuncio_torneo_evento") {
		remove("field", "period", "time"); // No corresponding fields exist in the form.
		add("event-name", "Nome evento", raw.nome_evento);
		field("registration", "Modalità di iscrizione", "Modalità di iscrizione").presentation = {kind: "scalar"};
	} else if (type === "annuncio_campo_impianto") {
		if (areas) areas.value = null;
		add("address", "Indirizzo del campo", raw.indirizzo);
	} else if (type === "annuncio_servizi_consulenze") {
		remove("additional-info");
		field("figures", "Figure professionali", "Figure professionali");
		field("specialization", "Specializzazione", "Specializzazione");
		field("football", "Tipologia calcio", "Tipologie");
	} else if (type === "annuncio_creators") {
		const zones = add("search-areas", "Di che zona/e ti occupi", null);
		zones.locations = input.locations;
		zones.presentation = {kind: "locations"};
	}

	const required = new Set(["search-areas"]);
	if (type === "annuncio_giocatore") ["football", "roles", "categories"].forEach(id => required.add(id));
	if (type === "annuncio_squadra_cerca_giocatore") required.add("roles");
	if (type === "annuncio_squadra_cerca_staff") ["figures", "requirements"].forEach(id => required.add(id));
	if (type === "annuncio_squadra_cerca_partita") required.add("opponent-category");
	if (type === "annuncio_squadra_cerca_sponsor") required.add("visibility");
	if (type === "annuncio_staff_sportivo") ["football", "figures"].forEach(id => required.add(id));
	if (type === "annuncio_torneo_evento") ["football", "event-name"].forEach(id => required.add(id));
	if (type === "annuncio_campo_impianto") ["field-types", "address"].forEach(id => required.add(id));
	if (type === "annuncio_servizi_consulenze" || type === "annuncio_creators") required.add("content");
	// Preserve paragraph breaks from raw fields instead of compact directory descriptions.
	for (const item of sections) {
		if (item.locations) item.locations = summaryLocationGroups(item.locations).flatMap<PublicProfileLocation>(({region, cities}) => cities.length ? cities.map(city => ({region, city})) : [{region, city: null}]);
		if (item.id === "travel" || item.id === "car") {
			if (/^si$/i.test(item.value ?? "")) item.value = "Sì";
		}
		if (item.presentation?.kind === "history" || item.presentation?.kind === "player-career" || item.presentation?.kind === "schedule" || item.presentation?.kind === "prizes" || item.locations || ["prose", "offer", "checklist"].includes(item.presentation?.kind ?? "")) item.wide = true;
	}
	// Stable order independent of optional fields; prose follows the compact facts.
	const order = ["football", "field-types", "roles", "specific-roles", "figures", "birth-year", "categories", "current-category", "previous-categories", "team-group", "opponent-category", "birth-years", "season", "sector", "compensation", "availability", "car", "travel", "remote", "company-type", "content-types", "specialization", "event-name", "registration", "team-count", "cost", "price", "period", "time", "address", "headquarters", "search-areas", "hours", "qualifications", "experience", "prizes", "services", "requirements", "visibility", "promotion", "content", "additional-info"];
	return sections.filter(item => {
		const presentation = item.presentation;
		const rows = presentation && "rows" in presentation ? presentation.rows.length : 0;
		const structured = presentation?.kind === "scalar" && text(presentation.value) || presentation?.kind === "metric" || presentation?.kind === "checklist" && presentation.items.length > 0;
		return Boolean(text(item.value) || item.items?.length || item.locations?.length || rows || structured || required.has(item.id));
	}).sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id));
}
