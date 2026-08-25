import type {LucideIcon} from "lucide-react";
import {
	BadgeCheckIcon,
	BriefcaseBusinessIcon,
	CalendarDaysIcon,
	HandshakeIcon,
	MapPinIcon,
	TrophyIcon,
	UserIcon,
	UserSearchIcon,
	UsersIcon,
} from "lucide-react";

import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {
	CATEGORIE_CALCIO_GROUPS,
	DISPONIBILITA_SPOSTAMENTO_OPTIONS,
	FIGURA_PROFESSIONALE_OPTIONS,
	RUOLO_PRINCIPALE_OPTIONS,
	TIPOLOGIA_CALCIO_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import type {ProfileType} from "@/features/profilo/profile-model";

export const ANNOUNCEMENTS_PER_PAGE = 12;

export const ANNOUNCEMENT_TYPES = [
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

export type AnnouncementType = typeof ANNOUNCEMENT_TYPES[number];

export interface AnnouncementOption {
	value: AnnouncementType;
	label: string;
	description: string;
	profileType: ProfileType;
	icon: LucideIcon;
}

export const ANNOUNCEMENT_OPTIONS: readonly AnnouncementOption[] = [
	{
		value: "annuncio_giocatore",
		label: "Giocatore",
		description: "Giocatori disponibili e in cerca di una nuova squadra",
		profileType: "giocatore",
		icon: UserIcon,
	},
	{
		value: "annuncio_squadra_cerca_giocatore",
		label: "Squadra cerca giocatore",
		description: "Squadre alla ricerca di nuovi giocatori",
		profileType: "squadra",
		icon: UserSearchIcon,
	},
	{
		value: "annuncio_squadra_cerca_staff",
		label: "Squadra cerca staff",
		description: "Opportunità negli staff tecnici e societari",
		profileType: "squadra",
		icon: BriefcaseBusinessIcon,
	},
	{
		value: "annuncio_squadra_cerca_partita",
		label: "Squadra cerca partita",
		description: "Squadre disponibili per amichevoli e incontri",
		profileType: "squadra",
		icon: CalendarDaysIcon,
	},
	{
		value: "annuncio_squadra_cerca_sponsor",
		label: "Squadra cerca sponsor",
		description: "Società che cercano collaborazioni e sponsorizzazioni",
		profileType: "squadra",
		icon: HandshakeIcon,
	},
	{
		value: "annuncio_staff_sportivo",
		label: "Staff sportivo",
		description: "Professionisti dello sport disponibili per nuovi incarichi",
		profileType: "staff-sportivo",
		icon: UsersIcon,
	},
	{
		value: "annuncio_arbitro",
		label: "Arbitro",
		description: "Arbitri disponibili per partite, tornei ed eventi",
		profileType: "arbitro",
		icon: BadgeCheckIcon,
	},
	{
		value: "annuncio_torneo_evento",
		label: "Torneo / evento",
		description: "Tornei, manifestazioni ed eventi a cui partecipare",
		profileType: "torneo-evento",
		icon: TrophyIcon,
	},
	{
		value: "annuncio_campo_impianto",
		label: "Campo / impianto",
		description: "Campi e impianti disponibili per attività ed eventi",
		profileType: "campi-impianti-sportivi",
		icon: MapPinIcon,
	},
];

export const ANNOUNCEMENT_FILTER_PARAM_KEYS = [
	"regione",
	"tipologia",
	"ruolo",
	"figura",
	"categoria",
	"automunito",
	"costoMax",
	"compensoMin",
] as const;

export type AnnouncementFilterParam = typeof ANNOUNCEMENT_FILTER_PARAM_KEYS[number];

export const ANNOUNCEMENT_FILTERS_BY_TYPE = {
	annuncio_giocatore: ["regione", "tipologia", "ruolo"],
	annuncio_squadra_cerca_giocatore: ["regione", "tipologia", "ruolo"],
	annuncio_squadra_cerca_staff: ["regione", "figura", "compensoMin"],
	annuncio_squadra_cerca_partita: ["regione", "categoria"],
	annuncio_squadra_cerca_sponsor: ["regione"],
	annuncio_staff_sportivo: ["regione", "tipologia", "figura", "categoria"],
	annuncio_arbitro: ["regione", "tipologia", "categoria", "automunito"],
	annuncio_torneo_evento: ["regione", "tipologia", "costoMax"],
	annuncio_campo_impianto: ["regione", "tipologia", "costoMax"],
} as const satisfies Record<AnnouncementType, readonly AnnouncementFilterParam[]>;

const CATEGORY_OPTIONS = [...new Set(
	CATEGORIE_CALCIO_GROUPS.flatMap(({opzioni}) => opzioni),
)];

export const ANNOUNCEMENT_FILTER_OPTIONS = {
	regioni: REGIONI_ITALIANE.map(({nome}) => nome),
	tipologie: [...TIPOLOGIA_CALCIO_OPTIONS],
	ruoli: [...RUOLO_PRINCIPALE_OPTIONS],
	figure: [...FIGURA_PROFESSIONALE_OPTIONS],
	categorie: CATEGORY_OPTIONS,
	automunito: DISPONIBILITA_SPOSTAMENTO_OPTIONS
		.filter((value) => value !== "Non specificare")
		.map((value) => ({value, label: value === "Si" ? "Sì" : value})),
} as const;

export interface AnnouncementDirectoryFilters {
	regione: string;
	tipologia: string;
	ruolo: string;
	figura: string;
	categoria: string;
	automunito: string;
	costoMax: number | null;
	compensoMin: number | null;
}

export interface AnnouncementDirectoryQuery {
	q: string;
	types: AnnouncementType[];
	filters: AnnouncementDirectoryFilters;
	page: number;
}

export type AnnouncementFactKind =
	| "availability"
	| "car"
	| "categories"
	| "compensation"
	| "figures"
	| "headquarters"
	| "location"
	| "participation"
	| "period"
	| "price"
	| "registration"
	| "roles"
	| "season"
	| "sector"
	| "services"
	| "time"
	| "types";

export interface AnnouncementFact {
	kind: AnnouncementFactKind;
	label: string;
	value: string;
}

export type AnnouncementAuthor =
	| {
		kind: "registered";
		profileId: string;
		profileType: ProfileType;
		title: string;
		imageUrl: string | null;
		verified: boolean;
		presentation: string | null;
		location: string;
		highlights: AnnouncementFact[];
	}
	| {
		kind: "anonymous";
		profileType: ProfileType;
		label: string;
	}
	| {
		kind: "unavailable";
		profileType: ProfileType;
		label: string;
	};

export interface AnnouncementDirectoryItem {
	id: string;
	type: AnnouncementType;
	typeLabel: string;
	profileType: ProfileType;
	title: string;
	description: string | null;
	createdAt: string | null;
	level: string | null;
	location: string;
	facts: AnnouncementFact[];
	author: AnnouncementAuthor;
}

export interface AnnouncementDirectoryResult {
	announcements: AnnouncementDirectoryItem[];
	total: number;
	currentPage: number;
	totalPages: number;
	error: boolean;
}

export interface AnnouncementDetailField {
	label: string;
	value: string;
	wide?: boolean;
}

export type AnnouncementContactKind = "email" | "phone";

export interface AnnouncementContact {
	kind: AnnouncementContactKind;
	label: string;
	value: string;
	href: string;
}

export interface AnnouncementDetail extends AnnouncementDirectoryItem {
	fields: AnnouncementDetailField[];
	contacts: AnnouncementContact[];
	contactsUnavailable: boolean;
}

export type AnnouncementDetailResult =
	| {status: "success"; announcement: AnnouncementDetail}
	| {status: "not-found"}
	| {status: "error"};

export type RawAnnouncementSearchParams = Record<string, string | string[] | undefined>;

const REGION_SET = new Set<string>(ANNOUNCEMENT_FILTER_OPTIONS.regioni);
const TYPE_SET = new Set<string>(ANNOUNCEMENT_FILTER_OPTIONS.tipologie);
const ROLE_SET = new Set<string>(ANNOUNCEMENT_FILTER_OPTIONS.ruoli);
const FIGURE_SET = new Set<string>(ANNOUNCEMENT_FILTER_OPTIONS.figure);
const CATEGORY_SET = new Set<string>(ANNOUNCEMENT_FILTER_OPTIONS.categorie);
const CAR_SET = new Set<string>(ANNOUNCEMENT_FILTER_OPTIONS.automunito.map(({value}) => value));
const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function isAnnouncementType(value: unknown): value is AnnouncementType {
	return typeof value === "string"
		&& (ANNOUNCEMENT_TYPES as readonly string[]).includes(value);
}

export function isValidAnnouncementId(value: unknown): value is string {
	return typeof value === "string" && UUID_PATTERN.test(value);
}

export function createEmptyAnnouncementFilters(): AnnouncementDirectoryFilters {
	return {
		regione: "",
		tipologia: "",
		ruolo: "",
		figura: "",
		categoria: "",
		automunito: "",
		costoMax: null,
		compensoMin: null,
	};
}

function asValues(value: string | string[] | undefined) {
	if (Array.isArray(value)) return value;
	return value ? [value] : [];
}

function firstValue(value: string | string[] | undefined) {
	return asValues(value)[0] ?? "";
}

function allowedValue(value: string, allowed: Set<string>) {
	return allowed.has(value) ? value : "";
}

function parseAmount(value: string) {
	if (!value.trim()) return null;
	const parsed = Number(value.replace(",", "."));
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) return null;
	return Math.round(parsed * 100) / 100;
}

function supportsFilter(type: AnnouncementType, filter: AnnouncementFilterParam) {
	return (ANNOUNCEMENT_FILTERS_BY_TYPE[type] as readonly AnnouncementFilterParam[])
		.includes(filter);
}

export function parseAnnouncementDirectoryQuery(
	params: RawAnnouncementSearchParams,
): AnnouncementDirectoryQuery {
	const requestedTypes = new Set(asValues(params.type).filter(isAnnouncementType));
	const types = ANNOUNCEMENT_TYPES.filter((type) => requestedTypes.has(type));
	const selectedType = types.length === 1 ? types[0] : null;
	const filters = createEmptyAnnouncementFilters();

	if (selectedType) {
		if (supportsFilter(selectedType, "regione")) {
			filters.regione = allowedValue(firstValue(params.regione), REGION_SET);
		}
		if (supportsFilter(selectedType, "tipologia")) {
			filters.tipologia = allowedValue(firstValue(params.tipologia), TYPE_SET);
		}
		if (supportsFilter(selectedType, "ruolo")) {
			filters.ruolo = allowedValue(firstValue(params.ruolo), ROLE_SET);
		}
		if (supportsFilter(selectedType, "figura")) {
			filters.figura = allowedValue(firstValue(params.figura), FIGURE_SET);
		}
		if (supportsFilter(selectedType, "categoria")) {
			filters.categoria = allowedValue(firstValue(params.categoria), CATEGORY_SET);
		}
		if (supportsFilter(selectedType, "automunito")) {
			filters.automunito = allowedValue(firstValue(params.automunito), CAR_SET);
		}
		if (supportsFilter(selectedType, "costoMax")) {
			filters.costoMax = parseAmount(firstValue(params.costoMax));
		}
		if (supportsFilter(selectedType, "compensoMin")) {
			filters.compensoMin = parseAmount(firstValue(params.compensoMin));
		}
	}

	const requestedPage = Number.parseInt(firstValue(params.page), 10);
	const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
		? requestedPage
		: 1;

	return {
		q: firstValue(params.q).replace(/\s+/g, " ").trim().slice(0, 100),
		types: [...types],
		filters,
		page,
	};
}

export function getAnnouncementFilterEntries(
	filters: AnnouncementDirectoryFilters,
): Array<[string, string]> {
	const entries: Array<[string, string]> = [];
	if (filters.regione) entries.push(["regione", filters.regione]);
	if (filters.tipologia) entries.push(["tipologia", filters.tipologia]);
	if (filters.ruolo) entries.push(["ruolo", filters.ruolo]);
	if (filters.figura) entries.push(["figura", filters.figura]);
	if (filters.categoria) entries.push(["categoria", filters.categoria]);
	if (filters.automunito) entries.push(["automunito", filters.automunito]);
	if (filters.costoMax !== null) entries.push(["costoMax", String(filters.costoMax)]);
	if (filters.compensoMin !== null) entries.push(["compensoMin", String(filters.compensoMin)]);
	return entries;
}

export function getActiveAnnouncementFilterCount(filters: AnnouncementDirectoryFilters) {
	return getAnnouncementFilterEntries(filters).length;
}

export function buildAnnouncementsHref(
	query: AnnouncementDirectoryQuery,
	overrides: {
		page?: number;
		q?: string;
		types?: AnnouncementType[];
		filters?: AnnouncementDirectoryFilters;
	} = {},
) {
	const params = new URLSearchParams();
	const q = overrides.q ?? query.q;
	const types = overrides.types ?? query.types;
	const filters = overrides.filters ?? query.filters;
	const page = overrides.page ?? query.page;

	if (q) params.set("q", q);
	types.forEach((type) => params.append("type", type));
	getAnnouncementFilterEntries(filters).forEach(([key, value]) => params.set(key, value));
	if (page > 1) params.set("page", String(page));

	const suffix = params.toString();
	return suffix ? `/annunci?${suffix}` : "/annunci";
}

export function announcementOption(type: AnnouncementType) {
	return ANNOUNCEMENT_OPTIONS.find(({value}) => value === type)
		?? ANNOUNCEMENT_OPTIONS[0];
}

export function normalizeAnnouncementSearchText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("it-IT");
}
