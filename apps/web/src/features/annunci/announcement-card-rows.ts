import type {AnnouncementCardRow, AnnouncementDetailField, AnnouncementType} from "@/features/annunci/announcement-model";
import type {AnnouncementLocation} from "@/features/annunci/announcement-content";

const LIMIT = 100;
const MISSING = "Non specificato";
type CardProfile = {teamCategory?: string | null; serviceType?: string | null; creatorTypes?: string[] | null; sportTypes?: string[] | null};

function compact(value: string | null | undefined) {
	const text = value?.replace(/\s+/g, " ").trim();
	if (!text || /^non specificato/i.test(text) || text === "—") return null;
	return text.length > LIMIT ? `${text.slice(0, LIMIT - 1).trimEnd()}…` : text;
}

function field(fields: readonly AnnouncementDetailField[], ...labels: string[]) {
	const found = fields.find(({label}) => labels.includes(label));
	return found?.items?.length ? found.items.join(", ") : found?.value ?? null;
}

function list(values: readonly string[] | null | undefined, extra = false) {
	const clean = [...new Set((values ?? []).map(value => value.trim()).filter(Boolean))];
	if (!clean.length) return null;
	return `${clean[0]}${clean.length > 1 || extra ? " + altre" : ""}`;
}

function areas(locations: readonly AnnouncementLocation[], mode: "city" | "region" | "all" = "city") {
	const values = [...new Set(locations.map(({region, city}) => {
		const r = region.trim(); const c = city?.trim();
		return mode === "region" ? r : mode === "all" ? [r,c].filter(Boolean).join(", ") : [r,c].filter(Boolean).join(", ");
	}).filter(Boolean))];
	return mode === "all" ? values.join(" · ") || null : list(values);
}

function roleAbbreviations(value: string | null) {
	if (!value) return null;
	const roles = value.split(/[,;·]/).map(role => role.trim()).filter(Boolean);
	const mapped = roles.map(role => {
		const r = role.toLocaleLowerCase("it-IT");
		if (r.includes("portier")) return "POR";
		if (/difens|terzin/.test(r)) return "DIF";
		if (/centrocamp|trequart|esterno|mediano/.test(r)) return "CEN";
		if (/attacc|ala|punta|seconda/.test(r)) return "ATT";
		return role;
	});
	return [...new Set(mapped)].join(", ") || null;
}

export function buildAnnouncementCardRows(input: {
	type: AnnouncementType;
	fields: readonly AnnouncementDetailField[];
	locations: readonly AnnouncementLocation[];
	profile?: CardProfile;
	previousCategories?: readonly string[];
}): AnnouncementCardRow[] {
	const {type, fields, locations, profile} = input;
	let entries: Array<[string,string|null]>;
	const types = field(fields, "Tipologie", "Tipologia calcio", "Tipologie calcio") ?? profile?.sportTypes?.join(", ") ?? null;
	switch (type) {
		case "annuncio_giocatore": entries = [["Zona/e di ricerca",areas(locations)],["Calcio",types],["Ruolo/i",roleAbbreviations([field(fields,"Ruoli principali"),field(fields,"Ruoli specifici")].filter(Boolean).join(", "))],["Categorie precedenti",list(input.previousCategories)]]; break;
		case "annuncio_squadra_cerca_giocatore": entries = [["Zona/e di ricerca",areas(locations)],["Calcio",types],["Ruolo/i cercati",roleAbbreviations([field(fields,"Ruolo/i cercati"),field(fields,"Ruoli specifici")].filter(Boolean).join(", "))],["Stagione",field(fields,"Stagione")]]; break;
		case "annuncio_squadra_cerca_staff": entries = [["Zona/e di ricerca",areas(locations)],["Calcio",types],["Figura/e cercata",list(field(fields,"Figure ricercate")?.split(","))],["Stagione",field(fields,"Stagione")]]; break;
		case "annuncio_squadra_cerca_partita": entries = [["Zona/e di ricerca",areas(locations)],["Calcio",types],["Gruppo",field(fields,"Gruppo squadra")],["Periodo",field(fields,"Periodo")]]; break;
		case "annuncio_squadra_cerca_sponsor": entries = [["Sede della squadra",areas(locations,"all")],["Visibilità offerta",field(fields,"Visibilità offerta")],["Categoria attuale prima squadra",profile?.teamCategory ?? null]]; break;
		case "annuncio_staff_sportivo": entries = [["Zona/e di ricerca",areas(locations)],["Calcio",types],["Figure professionali",list(field(fields,"Figure professionali")?.split(","))]]; break;
		case "annuncio_arbitro": entries = [["Zona/e di ricerca",areas(locations)],["Calcio",types],["Automunito?",field(fields,"Automunito")]]; break;
		case "annuncio_torneo_evento": entries = [["Zona/e svolgimento torneo / evento",areas(locations)],["Calcio",types],["Data / Periodo",null],["Numero squadre",field(fields,"Numero di squadre")]]; break;
		case "annuncio_campo_impianto": entries = [["Località",areas(locations,"all") ?? field(fields,"Indirizzo del campo")],["Tipologia campo",field(fields,"Tipologia campo da pubblicizzare")],["Servizi inclusi",field(fields,"Servizi inclusi")]]; break;
		case "annuncio_servizi_consulenze": entries = [["Località",areas(locations,"all")],["Tipologia",profile?.serviceType ?? null],["Promozione / Offerta per la community",field(fields,"Promozione/offerta per la Community")]]; break;
		case "annuncio_creators": entries = [["Regione/i di interesse",[...new Set(locations.map(({region}) => region.trim()).filter(Boolean))].join(" · ") || null],["Tipologia di contenuti",list(profile?.creatorTypes)],["Contenuto annuncio",field(fields,"Contenuto dell’annuncio","Contenuto dellâ€™annuncio")]]; break;
	}
	return entries.map(([label,value], index) => ({key: `${type}:${index}`, label, value: compact(value)}));
}

export function getAnnouncementCardRows(item: {type: AnnouncementType; cardRows?: AnnouncementCardRow[]}) {
	return item.cardRows ?? [];
}

export {MISSING as MISSING_ANNOUNCEMENT_CARD_VALUE};
