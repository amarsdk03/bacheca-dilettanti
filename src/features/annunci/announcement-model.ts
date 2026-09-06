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

export const TEAM_ANNOUNCEMENT_TYPES = [
	"annuncio_squadra_cerca_giocatore",
	"annuncio_squadra_cerca_staff",
	"annuncio_squadra_cerca_partita",
	"annuncio_squadra_cerca_sponsor",
] as const satisfies readonly AnnouncementType[];

export const ANNOUNCEMENT_TEAM_SEARCHES = [
	"giocatore",
	"staff",
	"partita",
	"sponsor",
] as const;

export type AnnouncementTeamSearch = typeof ANNOUNCEMENT_TEAM_SEARCHES[number];

export const TEAM_ANNOUNCEMENT_TYPE_BY_SEARCH = {
	giocatore: "annuncio_squadra_cerca_giocatore",
	staff: "annuncio_squadra_cerca_staff",
	partita: "annuncio_squadra_cerca_partita",
	sponsor: "annuncio_squadra_cerca_sponsor",
} as const satisfies Record<AnnouncementTeamSearch, AnnouncementType>;

const TEAM_SEARCH_BY_ANNOUNCEMENT_TYPE = Object.fromEntries(
	Object.entries(TEAM_ANNOUNCEMENT_TYPE_BY_SEARCH).map(([search, type]) => [type, search]),
) as Partial<Record<AnnouncementType, AnnouncementTeamSearch>>;

export const ANNOUNCEMENT_DIRECTORY_TYPES = [
	"annuncio_giocatore",
	"annuncio_squadra",
	"annuncio_staff_sportivo",
	"annuncio_arbitro",
	"annuncio_torneo_evento",
	"annuncio_campo_impianto",
] as const;

export type AnnouncementDirectoryType = typeof ANNOUNCEMENT_DIRECTORY_TYPES[number];

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

export interface AnnouncementDirectoryOption {
	value: AnnouncementDirectoryType;
	label: string;
	description: string;
	profileType: ProfileType;
	icon: LucideIcon;
}

export const ANNOUNCEMENT_DIRECTORY_OPTIONS: readonly AnnouncementDirectoryOption[] = [
	{
		value: "annuncio_giocatore",
		profileType: "giocatore",
		label: "Giocatore",
		description: "Giocatori disponibili e in cerca di una nuova squadra",
		icon: UserIcon,
	},
	{
		value: "annuncio_squadra",
		profileType: "squadra",
		label: "Squadra",
		description: "Squadre che cercano giocatori, staff, partite o sponsor",
		icon: UserSearchIcon,
	},
	{
		value: "annuncio_staff_sportivo",
		profileType: "staff-sportivo",
		label: "Staff sportivo",
		description: "Professionisti dello sport disponibili per nuovi incarichi",
		icon: UsersIcon,
	},
	{
		value: "annuncio_arbitro",
		profileType: "arbitro",
		label: "Arbitro",
		description: "Arbitri disponibili per partite, tornei ed eventi",
		icon: BadgeCheckIcon,
	},
	{
		value: "annuncio_torneo_evento",
		profileType: "torneo-evento",
		label: "Torneo / evento",
		description: "Tornei, manifestazioni ed eventi a cui partecipare",
		icon: TrophyIcon,
	},
	{
		value: "annuncio_campo_impianto",
		profileType: "campi-impianti-sportivi",
		label: "Campo / impianto",
		description: "Campi e impianti disponibili per attivitÃ  ed eventi",
		icon: MapPinIcon,
	},
];

export const ANNOUNCEMENT_TEAM_SEARCH_OPTIONS = [
	{value: "giocatore", label: "Giocatore"},
	{value: "staff", label: "Staff"},
	{value: "partita", label: "Partita"},
	{value: "sponsor", label: "Sponsor"},
] as const satisfies readonly {value: AnnouncementTeamSearch; label: string}[];

export const ANNOUNCEMENT_FILTER_PARAM_KEYS = [
	"ricercaSquadra",
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
	ricercaSquadra: AnnouncementTeamSearch | "";
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
	types: AnnouncementDirectoryType[];
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

export interface LatestAnnouncementPreview {
	id: string;
	profileType: ProfileType;
	title: string;
	location: string;
	createdAt: string | null;
}

export interface LatestAnnouncementsResult {
	announcements: LatestAnnouncementPreview[];
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
const TEAM_SEARCH_SET = new Set<string>(ANNOUNCEMENT_TEAM_SEARCHES);
const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function isAnnouncementType(value: unknown): value is AnnouncementType {
	return typeof value === "string"
		&& (ANNOUNCEMENT_TYPES as readonly string[]).includes(value);
}

export function isAnnouncementDirectoryType(value: unknown): value is AnnouncementDirectoryType {
	return typeof value === "string"
		&& (ANNOUNCEMENT_DIRECTORY_TYPES as readonly string[]).includes(value);
}

export function isTeamAnnouncementType(value: unknown): value is typeof TEAM_ANNOUNCEMENT_TYPES[number] {
	return typeof value === "string"
		&& (TEAM_ANNOUNCEMENT_TYPES as readonly string[]).includes(value);
}

function isAnnouncementTeamSearch(value: unknown): value is AnnouncementTeamSearch {
	return typeof value === "string" && TEAM_SEARCH_SET.has(value);
}

export function isValidAnnouncementId(value: unknown): value is string {
	return typeof value === "string" && UUID_PATTERN.test(value);
}

export function createEmptyAnnouncementFilters(): AnnouncementDirectoryFilters {
	return {
		ricercaSquadra: "",
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

export function getAnnouncementFiltersForDirectoryType(
	type: AnnouncementDirectoryType,
	teamSearch: AnnouncementTeamSearch | "",
): readonly AnnouncementFilterParam[] {
	if (type === "annuncio_squadra") {
		if (!teamSearch) return ["ricercaSquadra", "regione"];
		return [
			"ricercaSquadra",
			...ANNOUNCEMENT_FILTERS_BY_TYPE[TEAM_ANNOUNCEMENT_TYPE_BY_SEARCH[teamSearch]],
		];
	}

	return ANNOUNCEMENT_FILTERS_BY_TYPE[type];
}

function supportsFilter(
	type: AnnouncementDirectoryType,
	teamSearch: AnnouncementTeamSearch | "",
	filter: AnnouncementFilterParam,
) {
	return getAnnouncementFiltersForDirectoryType(type, teamSearch).includes(filter);
}

export function parseAnnouncementDirectoryQuery(
	params: RawAnnouncementSearchParams,
): AnnouncementDirectoryQuery {
	const requestedTypes = new Set<AnnouncementDirectoryType>();
	const legacyTeamTypes = new Set<typeof TEAM_ANNOUNCEMENT_TYPES[number]>();

	for (const type of asValues(params.type)) {
		if (isAnnouncementDirectoryType(type)) {
			requestedTypes.add(type);
		} else if (isTeamAnnouncementType(type)) {
			requestedTypes.add("annuncio_squadra");
			legacyTeamTypes.add(type);
		}
	}

	const types = ANNOUNCEMENT_DIRECTORY_TYPES.filter((type) => requestedTypes.has(type));
	const selectedType = types.length === 1 ? types[0] : null;
	const filters = createEmptyAnnouncementFilters();

	if (selectedType) {
		if (selectedType === "annuncio_squadra") {
			const requestedTeamSearch = firstValue(params.ricercaSquadra);
			if (isAnnouncementTeamSearch(requestedTeamSearch)) {
				filters.ricercaSquadra = requestedTeamSearch;
			} else if (legacyTeamTypes.size === 1) {
				filters.ricercaSquadra = TEAM_SEARCH_BY_ANNOUNCEMENT_TYPE[[...legacyTeamTypes][0]] ?? "";
			}
		}

		if (supportsFilter(selectedType, filters.ricercaSquadra, "regione")) {
			filters.regione = allowedValue(firstValue(params.regione), REGION_SET);
		}
		if (supportsFilter(selectedType, filters.ricercaSquadra, "tipologia")) {
			filters.tipologia = allowedValue(firstValue(params.tipologia), TYPE_SET);
		}
		if (supportsFilter(selectedType, filters.ricercaSquadra, "ruolo")) {
			filters.ruolo = allowedValue(firstValue(params.ruolo), ROLE_SET);
		}
		if (supportsFilter(selectedType, filters.ricercaSquadra, "figura")) {
			filters.figura = allowedValue(firstValue(params.figura), FIGURE_SET);
		}
		if (supportsFilter(selectedType, filters.ricercaSquadra, "categoria")) {
			filters.categoria = allowedValue(firstValue(params.categoria), CATEGORY_SET);
		}
		if (supportsFilter(selectedType, filters.ricercaSquadra, "automunito")) {
			filters.automunito = allowedValue(firstValue(params.automunito), CAR_SET);
		}
		if (supportsFilter(selectedType, filters.ricercaSquadra, "costoMax")) {
			filters.costoMax = parseAmount(firstValue(params.costoMax));
		}
		if (supportsFilter(selectedType, filters.ricercaSquadra, "compensoMin")) {
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
	if (filters.ricercaSquadra) entries.push(["ricercaSquadra", filters.ricercaSquadra]);
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
		types?: AnnouncementDirectoryType[];
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

export function announcementDirectoryOption(type: AnnouncementDirectoryType) {
	return ANNOUNCEMENT_DIRECTORY_OPTIONS.find(({value}) => value === type)
		?? ANNOUNCEMENT_DIRECTORY_OPTIONS[0];
}

export function getAnnouncementStorageTypes(query: AnnouncementDirectoryQuery): AnnouncementType[] {
	if (query.types.length === 0) return [...ANNOUNCEMENT_TYPES];

	const requestedTypes = new Set<AnnouncementType>();
	for (const type of query.types) {
		if (type === "annuncio_squadra") {
			if (query.filters.ricercaSquadra) {
				requestedTypes.add(TEAM_ANNOUNCEMENT_TYPE_BY_SEARCH[query.filters.ricercaSquadra]);
			} else {
				TEAM_ANNOUNCEMENT_TYPES.forEach((teamType) => requestedTypes.add(teamType));
			}
		} else {
			requestedTypes.add(type);
		}
	}

	return ANNOUNCEMENT_TYPES.filter((type) => requestedTypes.has(type));
}

export function normalizeAnnouncementSearchText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("it-IT");
}
