import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {
	DISPONIBILITA_PROFILO_OPTIONS,
	DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS,
	FIGURA_PROFESSIONALE_OPTIONS,
	RUOLO_PRINCIPALE_OPTIONS,
	TIPOLOGIA_CALCIO_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {
	isProfileType,
	PROFILE_TYPES,
	type ProfileType,
} from "@/features/profilo/profile-model";

export const PROFILE_DIRECTORY_PAGE_SIZE = 12;

export const PROFILE_FILTER_PARAM_KEYS = [
	"regione",
	"tipologia",
	"ruolo",
	"figura",
	"disponibilita",
	"automunito",
	"costoMax",
] as const;

export type ProfileFilterParam = typeof PROFILE_FILTER_PARAM_KEYS[number];

export const PROFILE_FILTERS_BY_TYPE = {
	giocatore: ["regione", "tipologia", "ruolo", "disponibilita"],
	squadra: ["regione", "tipologia"],
	"staff-sportivo": ["regione", "figura", "disponibilita"],
	"professionisti-studi": ["regione", "tipologia", "figura", "disponibilita", "automunito"],
	arbitro: ["regione", "disponibilita"],
	creators: ["regione"],
	"torneo-evento": ["regione", "tipologia"],
	"campi-impianti-sportivi": ["regione", "tipologia", "costoMax"],
} as const satisfies Record<ProfileType, readonly ProfileFilterParam[]>;

export const PROFILE_FILTER_OPTIONS = {
	regioni: REGIONI_ITALIANE.map(({nome}) => nome),
	tipologie: [...TIPOLOGIA_CALCIO_OPTIONS],
	ruoli: [...RUOLO_PRINCIPALE_OPTIONS],
	figure: [...FIGURA_PROFESSIONALE_OPTIONS],
	disponibilita: DISPONIBILITA_PROFILO_OPTIONS
		.filter(({valore}) => valore !== "non-specificare")
		.map(({valore, etichetta}) => ({value: valore, label: etichetta})),
	automunito: DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS
		.map(({valore, etichetta}) => ({value: valore, label: etichetta})),
} as const;

export interface ProfileDirectoryFilters {
	regione: string;
	tipologia: string;
	ruolo: string;
	figura: string;
	disponibilita: string;
	automunito: string;
	costoMax: number | null;
}

export interface ProfileDirectoryQuery {
	q: string;
	types: ProfileType[];
	filters: ProfileDirectoryFilters;
	page: number;
}

export interface DirectoryProfileFilterData {
	regions: string[];
	tipologie: string[];
	ruoli: string[];
	figure: string[];
	disponibilita: string | null;
	automunito: string | null;
	costo: number | null;
}

export type DirectoryProfileFactKind =
	| "availability"
	| "content"
	| "figures"
	| "headquarters"
	| "location"
	| "price"
	| "roles"
	| "services"
	| "specializations"
	| "types";

export interface DirectoryProfileFact {
	kind: DirectoryProfileFactKind;
	label: string;
	value: string;
}

export interface DirectoryProfile {
	id: string;
	type: ProfileType;
	title: string;
	presentation: string | null;
	imageUrl: string | null;
	verified: boolean;
	updatedAt: string;
	sport: string;
	location: string;
	highlight: string;
	availabilityLabel: string | null;
	facts: DirectoryProfileFact[];
	searchText: string;
	filterData: DirectoryProfileFilterData;
}

export interface ProfileDirectoryResult {
	profiles: DirectoryProfile[];
	total: number;
	currentPage: number;
	totalPages: number;
	error: boolean;
}

export type RawProfileSearchParams = Record<string, string | string[] | undefined>;

const REGION_SET = new Set<string>(PROFILE_FILTER_OPTIONS.regioni);
const TIPOLOGIA_SET = new Set<string>(PROFILE_FILTER_OPTIONS.tipologie);
const ROLE_SET = new Set<string>(PROFILE_FILTER_OPTIONS.ruoli);
const FIGURE_SET = new Set<string>(PROFILE_FILTER_OPTIONS.figure);
const AVAILABILITY_SET = new Set<string>(PROFILE_FILTER_OPTIONS.disponibilita.map(({value}) => value));
const CAR_SET = new Set<string>(PROFILE_FILTER_OPTIONS.automunito.map(({value}) => value));

export function createEmptyProfileFilters(): ProfileDirectoryFilters {
	return {
		regione: "",
		tipologia: "",
		ruolo: "",
		figura: "",
		disponibilita: "",
		automunito: "",
		costoMax: null,
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

function parseCost(value: string) {
	if (!value.trim()) return null;
	const parsed = Number(value.replace(",", "."));
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) return null;
	return Math.round(parsed * 100) / 100;
}

function supportsFilter(type: ProfileType, filter: ProfileFilterParam) {
	return (PROFILE_FILTERS_BY_TYPE[type] as readonly ProfileFilterParam[]).includes(filter);
}

export function parseProfileDirectoryQuery(params: RawProfileSearchParams): ProfileDirectoryQuery {
	const requestedTypes = new Set(asValues(params.type).filter(isProfileType));
	const types = PROFILE_TYPES.filter((type) => requestedTypes.has(type));
	const selectedType = types.length === 1 ? types[0] : null;
	const filters = createEmptyProfileFilters();

	if (selectedType) {
		if (supportsFilter(selectedType, "regione")) {
			filters.regione = allowedValue(firstValue(params.regione), REGION_SET);
		}
		if (supportsFilter(selectedType, "tipologia")) {
			filters.tipologia = allowedValue(firstValue(params.tipologia), TIPOLOGIA_SET);
		}
		if (supportsFilter(selectedType, "ruolo")) {
			filters.ruolo = allowedValue(firstValue(params.ruolo), ROLE_SET);
		}
		if (supportsFilter(selectedType, "figura")) {
			filters.figura = allowedValue(firstValue(params.figura), FIGURE_SET);
		}
		if (supportsFilter(selectedType, "disponibilita")) {
			filters.disponibilita = allowedValue(firstValue(params.disponibilita), AVAILABILITY_SET);
		}
		if (supportsFilter(selectedType, "automunito")) {
			filters.automunito = allowedValue(firstValue(params.automunito), CAR_SET);
		}
		if (supportsFilter(selectedType, "costoMax")) {
			filters.costoMax = parseCost(firstValue(params.costoMax));
		}
	}

	const requestedPage = Number.parseInt(firstValue(params.page), 10);
	const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
		? Math.min(requestedPage, 1_000)
		: 1;

	return {
		q: firstValue(params.q).replace(/\s+/g, " ").trim().slice(0, 100),
		types,
		filters,
		page,
	};
}

export function getProfileFilterEntries(filters: ProfileDirectoryFilters): Array<[string, string]> {
	const entries: Array<[string, string]> = [];
	if (filters.regione) entries.push(["regione", filters.regione]);
	if (filters.tipologia) entries.push(["tipologia", filters.tipologia]);
	if (filters.ruolo) entries.push(["ruolo", filters.ruolo]);
	if (filters.figura) entries.push(["figura", filters.figura]);
	if (filters.disponibilita) entries.push(["disponibilita", filters.disponibilita]);
	if (filters.automunito) entries.push(["automunito", filters.automunito]);
	if (filters.costoMax !== null) entries.push(["costoMax", String(filters.costoMax)]);
	return entries;
}

export function getActiveProfileFilterCount(filters: ProfileDirectoryFilters) {
	return getProfileFilterEntries(filters).length;
}

export function buildProfilesHref(
	query: ProfileDirectoryQuery,
	overrides: {
		page?: number;
		q?: string;
		filters?: ProfileDirectoryFilters;
	} = {},
) {
	const params = new URLSearchParams();
	const q = overrides.q ?? query.q;
	const filters = overrides.filters ?? query.filters;
	const page = overrides.page ?? query.page;

	if (q) params.set("q", q);
	query.types.forEach((type) => params.append("type", type));
	getProfileFilterEntries(filters).forEach(([key, value]) => params.set(key, value));
	if (page > 1) params.set("page", String(page));

	const suffix = params.toString();
	return suffix ? `/profili?${suffix}` : "/profili";
}

export function availabilityLabel(value: string | null | undefined) {
	return PROFILE_FILTER_OPTIONS.disponibilita.find((option) => option.value === value)?.label ?? null;
}

export function normalizeDirectorySearchText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("it-IT");
}
