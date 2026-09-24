import "server-only";

import {availabilityLabel} from "@/features/profilo/public-profile-display";

import type {QueryData, SupabaseClient} from "@supabase/supabase-js";

import {
	type DirectoryProfile,
	type DirectoryProfileFact,
	type DirectoryProfileFilterData,
	normalizeDirectorySearchText,
	PROFILE_DIRECTORY_PAGE_SIZE,
	type ProfileDirectoryQuery,
	type ProfileDirectoryResult,
} from "@/features/profili/profile-directory-model";
import {isLimitedProfileType, PROFILE_OPTIONS, type ProfileType,} from "@/features/profilo/profile-model";
import {resolvedProfileImageUrl} from "@/features/profilo/profile-image";
import {loadProfileImageUrlMap} from "@/features/profilo/server/profile-images";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Database, Json} from "@/server/supabase";
import {normalizePlayerPrimaryRoles, normalizePlayerSpecificRoles,} from "@/features/profilo/player-roles";
import {ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

const PROFILE_DIRECTORY_BATCH_SIZE = 500;
const NOT_SPECIFIED = "Non specificato";

const PROFILE_TABLE_BY_TYPE = {
	giocatore: "profilo_giocatore",
	squadra: "profilo_squadra",
	"staff-sportivo": "profilo_staff_sportivo",
	"professionisti-studi": "profilo_professionista_studente",
	arbitro: "profilo_arbitro",
	creators: "profilo_creator",
	"torneo-evento": "profilo_torneo_evento",
	"campi-impianti-sportivi": "profilo_campi_impianti",
} as const satisfies Record<ProfileType, keyof Database["public"]["Tables"]>;

function profileDirectoryQuery(supabase: SupabaseClient<Database>, offset: number) {
	// The admin client bypasses owner-only RLS: keep this select as an explicit
	// allowlist and never add private identity, contact or birth-date fields.
	return supabase
		.from("profilo")
		.select(`
			uuid,
			tipologia_principale,
			link_foto_profilo,
			confermato_il,
			verificato_il,
			ultima_modifica_il,
			localita_profilo(id_sottoprofilo, sottoprofilo, regione, citta),
			profilo_giocatore(id, nascosto, nome, cognome, disponibilita, presentazione, ruoli_sport, sport_principale, tipologie_sport, categorie_ricercate),
			profilo_squadra(id, nascosto, nome_societa, presentazione, sede_principale, sport_principale, tipologie_sport),
			profilo_staff_sportivo(id, nascosto, nome, cognome, disponibilita, figure_professionali, presentazione, sport_principale),
			profilo_professionista_studente(id, nascosto, nome, cognome, disponibilita, figure_professionali, presentazione, presentazione_servizi, specializzazioni, sport_principale, tipologie_sport, automunito),
			profilo_arbitro(id, nascosto, nome, cognome, disponibilita, presentazione, sport_principale),
			profilo_creator(id, nascosto, nome_creator, presentazione, sport_principale, tipologia_contenuti),
			profilo_torneo_evento(id, nascosto, nome_organizzazione, presentazione, sede_principale, sport_principale, tipologie_sport),
			profilo_campi_impianti(id, nascosto, nome_organizzazione, presentazione, sede_principale, sport_principale, tipologie_sport, costo_partenza, servizi_inclusi)
		`, {count: "exact"})
		.eq("nascosto", false)
		.not("uuid_utente", "is", null)
		.order("ultima_modifica_il", {ascending: false})
		.order("uuid", {ascending: true})
		.range(offset, offset + PROFILE_DIRECTORY_BATCH_SIZE - 1);
}

type ProfileDirectoryQueryRow = QueryData<ReturnType<typeof profileDirectoryQuery>>[number];

interface ProfileLocation {
	regione: string;
	citta: string | null;
}

interface ProfileContent {
	title: string | null;
	presentation: string | null;
	sport: string | null;
	highlight: string | null;
	availability: string | null;
	searchValues?: Array<string | null | undefined>;
	filterData?: Partial<DirectoryProfileFilterData>;
	factData?: {
		roles?: string[];
		services?: string | null;
		specializations?: string | null;
	};
}

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanStringArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.map(cleanText).filter((item): item is string => Boolean(item)))];
}

function jsonStringArray(value: Json | null, key: string) {
	if (!value || Array.isArray(value) || typeof value !== "object") return [];
	return cleanStringArray(value[key]);
}

function profileTypeLabel(type: ProfileType) {
	return PROFILE_OPTIONS.find(({value}) => value === type)?.label ?? "Profilo";
}

function fullName(name: string | null, surname: string | null) {
	return [cleanText(name), cleanText(surname)].filter(Boolean).join(" ") || null;
}

function scopedLocations(row: ProfileDirectoryQueryRow, type: ProfileType, childId: number) {
	return (row.localita_profilo ?? []).flatMap((location): ProfileLocation[] => {
		if (location.sottoprofilo !== type) return [];
		if (location.id_sottoprofilo !== null && location.id_sottoprofilo !== childId) return [];
		return [{regione: location.regione, citta: cleanText(location.citta)}];
	});
}

function formatLocation(locations: ProfileLocation[]) {
	const first = locations[0];
	if (!first) return "Località non specificata";
	const label = [first.citta, first.regione].filter(Boolean).join(", ");
	return locations.length > 1 ? `${label} +${locations.length - 1}` : label;
}

function formatFactLocation(locations: ProfileLocation[]) {
	if (locations.length === 0) return NOT_SPECIFIED;
	if (locations.length > 1) return `${locations.length} selezionate`;
	const first = locations[0];
	return [first.citta, first.regione].filter(Boolean).join(", ") || NOT_SPECIFIED;
}

function selectionCount(values: string[], feminine: boolean) {
	if (values.length === 0) return NOT_SPECIFIED;
	if (values.length === 1) return values[0] ?? NOT_SPECIFIED;
	return `${values.length} ${feminine ? "selezionate" : "selezionati"}`;
}

function profileFact(
	kind: DirectoryProfileFact["kind"],
	label: string,
	value: string | null,
): DirectoryProfileFact {
	return {kind, label, value: cleanText(value) ?? NOT_SPECIFIED};
}

function buildProfileFacts(
	type: ProfileType,
	locations: ProfileLocation[],
	highlight: string | null,
	availability: string | null,
	filterData: DirectoryProfileFilterData,
	factData: ProfileContent["factData"],
): DirectoryProfileFact[] {
	const location = formatFactLocation(locations);
	const types = selectionCount(filterData.tipologie, true);
	const roles = selectionCount(factData?.roles ?? filterData.ruoli, false);
	const figures = selectionCount(filterData.figure, true);

	if (type === "giocatore") {
		return [
			profileFact("roles", "Ruoli", roles),
			profileFact("types", "Tipologie", types),
			profileFact("location", "Località", location),
			profileFact("availability", "Disponibilità", availability),
		];
	}
	if (type === "squadra") {
		return [
			profileFact("types", "Tipologie", types),
			profileFact("location", "Località", location),
			profileFact("headquarters", "Sede", highlight),
		];
	}
	if (type === "staff-sportivo") {
		return [
			profileFact("figures", "Figure", figures),
			profileFact("location", "Località", location),
			profileFact("availability", "Disponibilità", availability),
		];
	}
	if (type === "professionisti-studi") {
		return [
			profileFact("figures", "Figure", figures),
			profileFact("specializations", "Specializzazioni", factData?.specializations ?? null),
			profileFact("location", "Località", location),
			profileFact("availability", "Disponibilità", availability),
		];
	}
	if (type === "arbitro") {
		return [
			profileFact("location", "Località", location),
			profileFact("availability", "Disponibilità", availability),
		];
	}
	if (type === "creators") {
		return [
			profileFact("location", "Località", location),
			profileFact("content", "Contenuti", highlight),
		];
	}
	if (type === "torneo-evento") {
		return [
			profileFact("types", "Tipologie", types),
			profileFact("location", "Località", location),
			profileFact("headquarters", "Sede", highlight),
		];
	}
	return [
		profileFact("types", "Tipologie", types),
		profileFact("location", "Località", location),
		profileFact(
			"price",
			"Costo",
			filterData.costo === null ? null : `Da ${formatEuro(filterData.costo)}`,
		),
		profileFact("services", "Servizi", factData?.services ?? null),
	];
}

function createDirectoryProfile(
	row: ProfileDirectoryQueryRow,
	type: ProfileType,
	childId: number,
	content: ProfileContent,
	profileImages: ReadonlyMap<string, string>,
): DirectoryProfile {
	const locations = scopedLocations(row, type, childId);
	const title = cleanText(content.title) ?? `Profilo ${profileTypeLabel(type).toLocaleLowerCase("it-IT")}`;
	const presentation = cleanText(content.presentation);
	const rawSport = cleanText(content.sport);
	const sport = rawSport ?? "Calcio";
	const location = formatLocation(locations);
	const rawHighlight = cleanText(content.highlight);
	const highlight = rawHighlight ?? profileTypeLabel(type);
	const availability = cleanText(content.availability);
	const availabilityText = availabilityLabel(availability);
	const filterData: DirectoryProfileFilterData = {
		regions: [...new Set(locations.map(({regione}) => regione))],
		tipologie: [],
		ruoli: [],
		figure: [],
		disponibilita: availability,
		automunito: null,
		costo: null,
		...content.filterData,
	};
	const facts = buildProfileFacts(
		type,
		locations,
		rawHighlight,
		availabilityText,
		filterData,
		content.factData,
	);
	const searchText = normalizeDirectorySearchText([
		title,
		presentation,
		sport,
		location,
		highlight,
		availabilityText,
		...locations.flatMap(({regione, citta}) => [regione, citta]),
		...(content.searchValues ?? []),
		...filterData.tipologie,
		...filterData.ruoli,
		...filterData.figure,
	].filter((value): value is string => Boolean(value)).join(" "));

	return {
		id: row.uuid,
		type,
		title,
		presentation,
		imageUrl: resolvedProfileImageUrl(profileImages, row.uuid, type, cleanText(row.link_foto_profilo)),
		emailConfirmed: Boolean(row.confermato_il),
		officialVerified: Boolean(row.verificato_il),
		updatedAt: row.ultima_modifica_il,
		sport,
		location,
		highlight,
		availabilityLabel: availabilityText,
		facts,
		searchText,
		filterData,
	};
}

function mapProfileRow(row: ProfileDirectoryQueryRow, profileImages: ReadonlyMap<string, string>) {
	const profiles: DirectoryProfile[] = [];

	for (const player of row.profilo_giocatore ?? []) {
		if (player.nascosto !== false) continue;
		const primaryRoles = normalizePlayerPrimaryRoles(jsonStringArray(player.ruoli_sport, "principali"));
		const specificRoles = normalizePlayerSpecificRoles(jsonStringArray(player.ruoli_sport, "specifici"));
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(player.tipologie_sport));
		const categories = cleanStringArray(player.categorie_ricercate);
		profiles.push(createDirectoryProfile(row, "giocatore", player.id, {
			title: fullName(player.nome, player.cognome),
			presentation: player.presentazione,
			sport: cleanText(player.sport_principale) ?? sportTypes[0],
			highlight: primaryRoles[0] ?? sportTypes[0] ?? null,
			availability: player.disponibilita,
			searchValues: [...specificRoles, ...categories],
			filterData: {tipologie: sportTypes, ruoli: primaryRoles},
			factData: {roles: [...new Set([...primaryRoles, ...specificRoles])]},
		}, profileImages));
	}

	for (const team of row.profilo_squadra ?? []) {
		if (team.nascosto !== false) continue;
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(team.tipologie_sport));
		profiles.push(createDirectoryProfile(row, "squadra", team.id, {
			title: team.nome_societa,
			presentation: team.presentazione,
			sport: cleanText(team.sport_principale) ?? sportTypes[0],
			highlight: cleanText(team.sede_principale),
			availability: null,
			searchValues: [team.sede_principale],
			filterData: {tipologie: sportTypes},
		}, profileImages));
	}

	for (const staff of row.profilo_staff_sportivo ?? []) {
		if (staff.nascosto !== false) continue;
		const figures = cleanStringArray(staff.figure_professionali);
		profiles.push(createDirectoryProfile(row, "staff-sportivo", staff.id, {
			title: fullName(staff.nome, staff.cognome),
			presentation: staff.presentazione,
			sport: staff.sport_principale,
			highlight: figures[0] ?? null,
			availability: staff.disponibilita,
			filterData: {figure: figures},
		}, profileImages));
	}

	for (const professional of row.profilo_professionista_studente ?? []) {
		if (professional.nascosto !== false) continue;
		const figures = cleanStringArray(professional.figure_professionali);
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(professional.tipologie_sport));
		profiles.push(createDirectoryProfile(row, "professionisti-studi", professional.id, {
			title: fullName(professional.nome, professional.cognome),
			presentation: professional.presentazione,
			sport: cleanText(professional.sport_principale) ?? sportTypes[0],
			highlight: figures[0] ?? cleanText(professional.specializzazioni),
			availability: professional.disponibilita,
			searchValues: [
				professional.specializzazioni,
				professional.presentazione_servizi,
			],
			filterData: {
				figure: figures,
				tipologie: sportTypes,
				automunito: cleanText(professional.automunito),
			},
			factData: {specializations: cleanText(professional.specializzazioni)},
		}, profileImages));
	}

	for (const referee of row.profilo_arbitro ?? []) {
		if (referee.nascosto !== false) continue;
		profiles.push(createDirectoryProfile(row, "arbitro", referee.id, {
			title: fullName(referee.nome, referee.cognome),
			presentation: referee.presentazione,
			sport: referee.sport_principale,
			highlight: availabilityLabel(referee.disponibilita) ?? "Attività arbitrale",
			availability: referee.disponibilita,
		}, profileImages));
	}

	for (const creator of row.profilo_creator ?? []) {
		if (creator.nascosto !== false) continue;
		profiles.push(createDirectoryProfile(row, "creators", creator.id, {
			title: creator.nome_creator,
			presentation: creator.presentazione,
			sport: creator.sport_principale,
			highlight: cleanText(creator.tipologia_contenuti),
			availability: null,
			searchValues: [creator.tipologia_contenuti],
		}, profileImages));
	}

	for (const tournament of row.profilo_torneo_evento ?? []) {
		if (tournament.nascosto !== false) continue;
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(tournament.tipologie_sport));
		profiles.push(createDirectoryProfile(row, "torneo-evento", tournament.id, {
			title: tournament.nome_organizzazione,
			presentation: tournament.presentazione,
			sport: cleanText(tournament.sport_principale) ?? sportTypes[0],
			highlight: cleanText(tournament.sede_principale),
			availability: null,
			searchValues: [tournament.sede_principale],
			filterData: {tipologie: sportTypes},
		}, profileImages));
	}

	for (const facility of row.profilo_campi_impianti ?? []) {
		if (facility.nascosto !== false) continue;
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(facility.tipologie_sport));
		const price = facility.costo_partenza;
		profiles.push(createDirectoryProfile(row, "campi-impianti-sportivi", facility.id, {
			title: facility.nome_organizzazione,
			presentation: facility.presentazione,
			sport: cleanText(facility.sport_principale) ?? sportTypes[0],
			highlight: price === null ? cleanText(facility.servizi_inclusi) : `Da ${formatEuro(price)}`,
			availability: null,
			searchValues: [facility.sede_principale, facility.servizi_inclusi],
			filterData: {tipologie: sportTypes, costo: price},
			factData: {services: cleanText(facility.servizi_inclusi)},
		}, profileImages));
	}

	return profiles;
}

function formatEuro(value: number) {
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
	}).format(value);
}

function includesValue(values: string[], selected: string) {
	const normalizedSelected = normalizeDirectorySearchText(selected);
	return values.some((value) => normalizeDirectorySearchText(value) === normalizedSelected);
}

function matchesDirectoryQuery(profile: DirectoryProfile, query: ProfileDirectoryQuery) {
	if (query.types.length > 0 && !query.types.includes(profile.type)) return false;

	const searchTokens = normalizeDirectorySearchText(query.q).split(/\s+/).filter(Boolean);
	if (searchTokens.some((token) => !profile.searchText.includes(token))) return false;

	if (query.types.length !== 1) return true;
	const {filters} = query;
	if (filters.regione && !includesValue(profile.filterData.regions, filters.regione)) return false;
	if (filters.tipologia && !includesValue(profile.filterData.tipologie, filters.tipologia)) return false;
	if (filters.ruolo && !includesValue(profile.filterData.ruoli, filters.ruolo)) return false;
	if (filters.figura && !includesValue(profile.filterData.figure, filters.figura)) return false;
	if (filters.disponibilita && profile.filterData.disponibilita !== filters.disponibilita) return false;
	if (filters.automunito && profile.filterData.automunito !== filters.automunito) return false;
	if (filters.costoMax !== null && (profile.filterData.costo === null || profile.filterData.costo > filters.costoMax)) return false;
	return true;
}

function emptyDirectoryResult(error = false): ProfileDirectoryResult {
	return {
		profiles: [],
		total: 0,
		currentPage: 1,
		totalPages: 1,
		error,
	};
}

/** Child IDs are monotonic; subprofiles do not have a creation timestamp. */
export async function loadRecentSimilarProfiles(
	supabase: SupabaseClient<Database>, id: string, type: ProfileType,
): Promise<DirectoryProfile[]> {
	if (isLimitedProfileType(type)) return [];
	const {data: children, error} = await supabase.from(PROFILE_TABLE_BY_TYPE[type])
		.select("id, uuid_profilo, profilo!inner(nascosto, uuid_utente)")
		.eq("nascosto", false)
		.eq("profilo.nascosto", false)
		.not("profilo.uuid_utente", "is", null)
		.neq("uuid_profilo", id)
		.order("id", {ascending: false})
		.limit(6);
	if (error) throw new Error("SIMILAR_PROFILES_UNAVAILABLE");
	if (!children?.length) return [];
	const ids = children.map(child => child.uuid_profilo);
	const [{data: rows, error: profilesError}, images] = await Promise.all([
		profileDirectoryQuery(supabase, 0).in("uuid", ids),
		loadProfileImageUrlMap(supabase, ids),
	]);
	if (profilesError) throw new Error("SIMILAR_PROFILES_UNAVAILABLE");
	const profiles = (rows ?? []).flatMap(row => mapProfileRow(row, images))
		.filter(profile => profile.type === type && profile.id !== id);
	const byId = new Map(profiles.map(profile => [profile.id, profile]));
	return ids.flatMap(profileId => {
		const profile = byId.get(profileId);
		return profile ? [profile] : [];
	});
}

/** Resolve one public identity per account, without loading the entire directory. */
export async function loadPublicPrimaryProfiles(ids: readonly string[]): Promise<DirectoryProfile[]> {
	const supabase = createAdminClient();
	const profiles: DirectoryProfile[] = [];
	const uniqueIds = [...new Set(ids)];
	for (let offset = 0; offset < uniqueIds.length; offset += 200) {
		const chunk = uniqueIds.slice(offset, offset + 200);
		const [{data, error}, images] = await Promise.all([
			profileDirectoryQuery(supabase, 0).in("uuid", chunk),
			loadProfileImageUrlMap(supabase, chunk),
		]);
		if (error) throw new Error("PUBLIC_PRIMARY_PROFILES_UNAVAILABLE");
		for (const row of data ?? []) {
			const candidates = mapProfileRow(row, images);
			const primary = candidates.find(({type}) => type === row.tipologia_principale) ?? candidates[0];
			if (primary) profiles.push(primary);
		}
	}
	return profiles;
}

export async function getProfileDirectory(query: ProfileDirectoryQuery): Promise<ProfileDirectoryResult> {
	try {
		const supabase = createAdminClient();
		const rows: ProfileDirectoryQueryRow[] = [];

		for (let offset = 0; ; offset += PROFILE_DIRECTORY_BATCH_SIZE) {
			const {data, error} = await profileDirectoryQuery(supabase, offset);

			if (error) {
				console.error("[profili] Directory query failed", {code: error.code});
				return emptyDirectoryResult(true);
			}

			const batch = data ?? [];
			rows.push(...batch);
			if (batch.length < PROFILE_DIRECTORY_BATCH_SIZE) break;
		}
		const profileImages = await loadProfileImageUrlMap(supabase, rows.map(({uuid}) => uuid));

		const filteredProfiles = rows
			.flatMap((row) => mapProfileRow(row, profileImages))
			.filter((profile) => !isLimitedProfileType(profile.type))
			.filter((profile) => matchesDirectoryQuery(profile, query))
			.sort((left, right) => {
				const byUpdate = right.updatedAt.localeCompare(left.updatedAt);
				return byUpdate || left.title.localeCompare(right.title, "it-IT");
			});
		const total = filteredProfiles.length;
		const totalPages = Math.max(1, Math.ceil(total / PROFILE_DIRECTORY_PAGE_SIZE));
		const currentPage = Math.min(query.page, totalPages);
		const offset = (currentPage - 1) * PROFILE_DIRECTORY_PAGE_SIZE;

		return {
			profiles: filteredProfiles.slice(offset, offset + PROFILE_DIRECTORY_PAGE_SIZE),
			total,
			currentPage,
			totalPages,
			error: false,
		};
	} catch (error) {
		console.error("[profili] Directory lookup unavailable", {
			message: error instanceof Error ? error.message : "Unknown error",
		});
		return emptyDirectoryResult(true);
	}
}
