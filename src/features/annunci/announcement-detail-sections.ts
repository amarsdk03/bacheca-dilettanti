import type {AnnouncementAuthorProfileData, AnnouncementDetailField, AnnouncementDetailSection, AnnouncementFact, AnnouncementType} from "./announcement-model";
import type {PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import {getItalyDateParts} from "@/features/profilo/birth-date";
import {buildAnnouncementSectionPresentation} from "./announcement-section-presentation";

function specified(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed && !/^non specificat[oaie]$/i.test(trimmed) ? trimmed : null;
}

export function announcementYearRange(from: unknown, to: unknown, now = new Date()) {
	const year = getItalyDateParts(now).year;
	const valid = (value: unknown) => {
		if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") return null;
		const number = Number(value);
		return Number.isInteger(number) && number >= 1900 && number <= year ? number : null;
	};
	const first = valid(from), last = valid(to);
	if (first === null && last === null || first !== null && last !== null && first > last) return null;
	if (first === last) return `${first} · circa ${year - first!} anni`;
	if (first !== null && last !== null) return `${first}–${last} · circa ${year - last}–${year - first} anni`;
	const only = first ?? last!;
	return `${first !== null ? "Dal" : "Fino al"} ${only} · circa ${year - only} anni`;
}

export function buildAnnouncementDetailSections({type, fields, facts, locations, authorProfile: profile, raw}: {
	type: AnnouncementType;
	fields: AnnouncementDetailField[];
	facts: AnnouncementFact[];
	locations: PublicProfileLocation[];
	authorProfile: AnnouncementAuthorProfileData | null;
	raw: Record<string, unknown>;
}): AnnouncementDetailSection[] {
	const sections: AnnouncementDetailSection[] = [];
	const add = (id: string, emoji: string | null, title: string, value: unknown = null, items?: string[], emptyLabel = "Non specificato") => {
		const section: AnnouncementDetailSection = {id, emoji, title, value: specified(value), emptyLabel};
		if (items) section.items = items.map(specified).filter((item): item is string => Boolean(item));
		sections.push(section);
		return section;
	};
	const field = (id: string, emoji: string, title: string, source: string, emptyLabel?: string) => {
		const data = fields.find(item => item.label === source);
		return add(id, emoji, title, data?.value, data?.items, emptyLabel);
	};
	const zones = (title = "Zona/e di ricerca", source = locations, id = "search-areas", emoji = "📍") => {
		const section = add(id, emoji, title, null, undefined, "Non specificate");
		section.locations = source;
		return section;
	};
	const football = (profileSource = false) => profileSource
		? add("football", "⚽️", "Calcio", null, profile?.sportTypes, "Non specificato")
		: field("football", "⚽️", "Calcio", type === "annuncio_torneo_evento" ? "Tipologia calcio" : "Tipologie");
	const info = () => add("additional-info", "ℹ️", "Informazioni aggiuntive", raw.descrizione_aggiuntiva, undefined, "Non specificate");
	const qualifications = () => field("qualifications", "📚", "Qualifiche", "Qualifiche / Licenze", "Non specificate");
	const experience = () => field("experience", "🏟️", "Esperienza", "Lista esperienze", "Non specificata");

	switch (type) {
		case "annuncio_giocatore":
			zones(); football();
			add("roles", "🎯", "Ruolo/i", null, [...new Set(fields.filter(item => ["Ruoli principali", "Ruoli specifici"].includes(item.label)).flatMap(item => item.items ?? []))], "Non specificati");
			add("birth-year", "📅", "Anno", profile?.birthYear);
			field("categories", "🏆", "Categoria cercata", "Categorie ricercate", "Non specificata");
			add("previous-categories", "🏟️", "Categorie precedenti", null, profile?.previousCategories, "Non specificate");
			info(); break;
		case "annuncio_squadra_cerca_giocatore":
			zones(); football(); field("team-group", "👕", "Gruppo squadra", "Gruppo squadra");
			field("roles", "🔍", "Ruolo/i cercati", "Ruolo/i cercati", "Non specificati");
			field("specific-roles", "🎯", "Ruolo/i specifici", "Ruoli specifici", "Non specificati");
			add("birth-years", "📅", "Annate / Età", announcementYearRange(raw.annata_da, raw.annata_a), undefined, "Non specificate");
			field("season", "📌", "Stagione", "Stagione", "Non specificata"); info(); break;
		case "annuncio_squadra_cerca_staff":
			zones(); football(true); field("team-group", "👕", "Gruppo squadra", "Gruppo squadra");
			field("figures", "👤", "Figura cercata", "Figure ricercate", "Non specificata");
			add("birth-years", "📅", "Annate / Età", null, undefined, "Non specificate");
			field("season", "📌", "Stagione", "Stagione", "Non specificata");
			field("requirements", "📝", "Requisiti", "Requisiti", "Non specificati"); info(); break;
		case "annuncio_squadra_cerca_partita":
			zones(); football(true); field("team-group", "👕", "Gruppo squadra", "Gruppo squadra");
			field("opponent-category", "⚔️", "Categoria avvers. cercato", "Categoria avversario cercata", "Non specificata");
			field("period", "🗓️", "Periodo", "Periodo"); field("time", "🕒", "Orario indicativo", "Orario"); info(); break;
		case "annuncio_squadra_cerca_sponsor":
			zones("Sede della squadra", profile?.locations ?? [], "headquarters", "🏢"); zones();
			add("current-category", "🏆", "Categoria attuale Prima Squadra", profile?.currentCategory, undefined, "Non specificata");
			field("visibility", "👀", "Visibilità offerta", "Visibilità offerta", "Non specificata"); info(); break;
		case "annuncio_staff_sportivo":
			zones(); football(); add("figures", "👤", "Figura/e profilo", null, profile?.figures, "Non specificate");
			field("categories", "🏆", "Categoria / Settore cercato", "Categoria/Settore cercato");
			qualifications(); experience(); field("travel", "🚗", "Spostamento", "Disponibilità agli spostamenti"); info(); break;
		case "annuncio_arbitro":
			zones(); football(); qualifications(); experience(); field("car", "🚗", "Automunito", "Automunito");
			field("travel", "🚗", "Disponibilità agli spostamenti", "Disponibilità agli spostamenti", "Non specificata"); info(); break;
		case "annuncio_torneo_evento":
			zones("Zona/e di svolgimento per questo torneo"); football();
			add("field", "🏟️", "Campo"); add("period", "📅", "Data / Periodo");
			add("time", "🕒", "Orari indicativi", null, undefined, "Non specificati");
			field("team-count", "👕", "Numero Squadre", "Numero di squadre");
			field("birth-years", "📆", "Annate ammesse", "Annate ammesse", "Non specificate");
			add("cost", "💶", "Costo iscrizione", facts.find(item => item.kind === "price")?.value);
			field("prizes", "🏆", "Premi", "Premi e trofei", "Non specificati"); info(); break;
		case "annuncio_campo_impianto": {
			const locality = zones("Località"); locality.value = specified(raw.indirizzo);
			field("field-types", "🏟️", "Tipologia del campo", "Tipologia campo da pubblicizzare", "Non specificata");
			field("hours", "🕒", "Disponibilità orari", "Orari", "Non specificata");
			add("price", "💶", "Prezzo orario", facts.find(item => item.kind === "price")?.value);
			field("services", "✅", "Servizi inclusi", "Servizi inclusi", "Non specificati"); info(); break;
		}
		case "annuncio_servizi_consulenze": {
			const headquarters = zones("Sede Attività", profile?.locations ?? [], "headquarters", "🏢"); headquarters.value = profile?.headquarters ?? null;
			const company = add("company-type", null, "Tipologia di azienda/professionista", profile?.companyType, undefined, "Non specificata"); company.flagCode = "IT";
			add("availability", "💻", "Disponibilità", profile?.availabilityLabel, undefined, "Non specificata");
			add("promotion", "🏷️", "Promozione/Offerta per la community", raw.descrizione_aggiuntiva, undefined, "Non specificata");
			add("content", "✨", "Contenuto", raw.presentazione_servizi);
			add("additional-info", "ℹ️", "Informazioni aggiuntive", null, undefined, "Non specificate"); break;
		}
		case "annuncio_creators":
			add("content-types", "🌟", "Tipologia di contenuti", null, profile?.contentTypes, "Non specificata");
			add("content", "✨", "Contenuto dell’annuncio", raw.descrizione_post); break;
	}
	const proseSources: Record<string, unknown> = {
		"additional-info": type === "annuncio_servizi_consulenze" ? null : raw.descrizione_aggiuntiva,
		requirements: raw.requisiti,
		services: raw.servizi_inclusi,
		visibility: raw.offerta_fornita,
		promotion: raw.descrizione_aggiuntiva,
		content: type === "annuncio_creators" ? raw.descrizione_post : raw.presentazione_servizi,
	};
	for (const section of sections) {
		// Display prose from its original text so paragraphs survive compact field formatting.
		if (Object.hasOwn(proseSources, section.id)) section.value = specified(proseSources[section.id]);
		section.presentation = buildAnnouncementSectionPresentation(section, raw);
	}
	return sections;
}

export function announcementAuthorBadges(type: AnnouncementType, profile: AnnouncementAuthorProfileData | null, sections: AnnouncementDetailSection[]): {label: string; title?: string}[] {
	const labels: string[] = [];
	const sportTypes = profile?.sportTypes ?? [];
	if (type === "annuncio_giocatore") {
		if (profile?.age !== null && profile?.age !== undefined && profile.birthYear) labels.push(`${profile.age} anni (${profile.birthYear})`);
		labels.push(...profile?.primaryRoles ?? []);
	} else if (type.startsWith("annuncio_squadra_")) {
		labels.push(...sportTypes);
		if (profile?.currentCategory) labels.push(profile.currentCategory);
	} else if (type === "annuncio_staff_sportivo") {
		const figures = profile?.figures ?? [];
		const badges: {label: string; title?: string}[] = [...sportTypes, ...figures.slice(0, 3)].map(label => ({label}));
		if (figures.length > 3) badges.push({label: "+ altre…", title: figures.slice(3).join(", ")});
		return badges;
	} else if (type === "annuncio_servizi_consulenze") {
		if (profile?.companyType) labels.push(profile.companyType);
		if (profile?.availabilityLabel) labels.push(profile.availabilityLabel);
	} else if (type === "annuncio_creators") labels.push(...profile?.contentTypes ?? []);
	else {
		labels.push(...sportTypes);
		if (type === "annuncio_arbitro") {
			const boolean = (id: string) => {
				const value = sections.find(item => item.id === id)?.value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
				return value === "si" ? true : value === "no" ? false : null;
			};
			const car = boolean("car"), travel = boolean("travel");
			if (car !== null) labels.push(car ? "Automunito" : "Non automunito");
			if (travel !== null) labels.push(travel ? "Pronto a trasferirsi" : "Solo in zone ricercate");
		}
	}
	return [...new Set(labels)].map(label => ({label}));
}
