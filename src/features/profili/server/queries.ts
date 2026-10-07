import "server-only";
import {publicProfileName} from "@/features/profilo/profile-public-name";
import {teamCategoryLabel} from "@/features/profilo/team-category-catalog";

import {availabilityLabel} from "@/features/profilo/public-profile-display";
import {nationalityLabel} from "@/features/profilo/player-nationalities";

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
import {
	categoryLabel,
	categoryShortLabel,
	normalizeFigures
} from "@/features/pubblica-annuncio/types/category-catalog";
import {publicPlayerAge} from "@/features/dettagli-profilo/server/player-profile-data";
import {createProfileDrafts, createProfileLocations} from "@/features/profilo/profile-model";
import {getProfileCompletion} from "@/features/profilo/profile-completion";
import {sortRankedDirectoryProfiles} from "../profile-directory-ranking";
import {randomUUID} from "node:crypto";

const PROFILE_DIRECTORY_BATCH_SIZE = 500;
const NOT_SPECIFIED = "Non specificato";

const PROFILE_TABLE_BY_TYPE = {
	giocatore: "profilo_giocatore",
	squadra: "profilo_squadra",
	"staff-sportivo": "profilo_staff_sportivo",
	"servizi-consulenze": "profilo_servizi_consulenze",
	arbitro: "profilo_arbitro",
	creators: "profilo_creator",
	"torneo-evento": "profilo_torneo_evento",
	"campi-impianti-sportivi": "profilo_campi_impianti",
} as const satisfies Record<ProfileType, keyof Database["public"]["Tables"]>;

function profileDirectoryQuery(supabase: SupabaseClient<Database>, offset: number) {
	// The admin client bypasses owner-only RLS: keep this select as an explicit
	// allowlist. Birth-date parts are selected only to derive age server-side and
	// are never added to the public directory profile.
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
			profilo_giocatore(nominativo_anonimo, id, nascosto, nome, cognome, giorno_nascita, mese_nascita, anno_nascita, disponibilita, presentazione, ruoli_sport, sport_principale, tipologie_sport, categoria_attuale, genere, nazionalita, altezza, peso, piede_principale, storico_carriera),
			profilo_squadra(nominativo_anonimo, id, nascosto, nome_societa, presentazione, sport_principale, tipologie_sport, categoria_attuale),
			profilo_staff_sportivo(nominativo_anonimo, id, nascosto, nome, cognome, giorno_nascita, mese_nascita, anno_nascita, disponibilita, figure_professionali, presentazione, sport_principale, lista_esperienze, qualifiche_licenze),
			profilo_servizi_consulenze(id, nascosto, nome, disponibilita, presentazione, presentazione_servizi, specializzazioni, sede_professionista, sport_principale, tipologie_sport),
			profilo_arbitro(nominativo_anonimo, id, nascosto, nome, cognome, giorno_nascita, mese_nascita, anno_nascita, disponibilita, presentazione, sport_principale, lista_esperienze, qualifiche_licenze),
			profilo_creator(id, nascosto, nome_creator, presentazione, sport_principale, tipologia_contenuti),
			profilo_torneo_evento(id, nascosto, nome_organizzazione, presentazione, sport_principale, tipologie_sport),
			profilo_campi_impianti(id, nascosto, nome_organizzazione, presentazione, indirizzo, sport_principale, tipologie_sport, info_aggiuntive)
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
		age?: number | null;
		roles?: string[];
		category?: string | null;
		gender?: string | null;
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
	const figures = selectionCount(filterData.figure, true);

	if (type === "giocatore") {
		return [
			profileFact("age", "Età", factData?.age == null ? null : `${factData.age} anni`),
			profileFact("gender", "Genere", factData?.gender ?? null),
			profileFact("availability", "Disponibilità", availability),
			profileFact("category", "Categoria attuale", factData?.category ?? null),
		];
	}
	if (type === "squadra") {
		return [
			profileFact("types", "Tipologie", types),
			profileFact("location", "Località", location),
			profileFact("category", "Categoria attuale Prima Squadra", highlight),
		];
	}
	if (type === "staff-sportivo") {
		return [
			profileFact("figures", "Figure", figures),
			profileFact("location", "Località", location),
			profileFact("availability", "Disponibilità", availability),
		];
	}
	if (type === "servizi-consulenze") {
		return [
			profileFact("specializations", "Tipo di azienda / professione", factData?.specializations ?? null),
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
		];
	}
	return [
		profileFact("types", "Tipologia campi disponibili", types),
		profileFact("location", "Località", location),
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
		const currentCategory = cleanText(player.categoria_attuale);
		profiles.push(createDirectoryProfile(row, "giocatore", player.id, {
			title: publicProfileName("giocatore", player.nominativo_anonimo, fullName(player.nome, player.cognome)),
			presentation: player.presentazione,
			sport: cleanText(player.sport_principale) ?? sportTypes[0],
			highlight: primaryRoles[0] ?? sportTypes[0] ?? null,
			availability: player.disponibilita,
			searchValues: [...specificRoles, currentCategory ? categoryLabel(currentCategory) : null, player.genere, nationalityLabel(player.nazionalita)],
			filterData: {tipologie: sportTypes, ruoli: primaryRoles},
		factData: {
			age: publicPlayerAge({day: player.giorno_nascita, month: player.mese_nascita, year: player.anno_nascita}),
			category: currentCategory ? categoryShortLabel(currentCategory) : null,
			gender: cleanText(player.genere),
		},
		}, profileImages));
	}

	for (const team of row.profilo_squadra ?? []) {
		if (team.nascosto !== false) continue;
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(team.tipologie_sport));
		profiles.push(createDirectoryProfile(row, "squadra", team.id, {
			title: publicProfileName("squadra", team.nominativo_anonimo, team.nome_societa),
			presentation: team.presentazione,
			sport: cleanText(team.sport_principale) ?? sportTypes[0],
			highlight: teamCategoryLabel(team.categoria_attuale) || null,
			availability: null,
			searchValues: [teamCategoryLabel(team.categoria_attuale) || null, ...sportTypes],
			filterData: {tipologie: sportTypes},
		}, profileImages));
	}

	for (const staff of row.profilo_staff_sportivo ?? []) {
		if (staff.nascosto !== false) continue;
		const figures = normalizeFigures(cleanStringArray(staff.figure_professionali));
		profiles.push(createDirectoryProfile(row, "staff-sportivo", staff.id, {
			title: publicProfileName("staff-sportivo", staff.nominativo_anonimo, fullName(staff.nome, staff.cognome)),
			presentation: staff.presentazione,
			sport: staff.sport_principale,
			highlight: figures[0] ?? null,
			availability: staff.disponibilita,
			filterData: {figure: figures},
		}, profileImages));
	}

	for (const professional of row.profilo_servizi_consulenze ?? []) {
		if (professional.nascosto !== false) continue;
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(professional.tipologie_sport));
		profiles.push(createDirectoryProfile(row, "servizi-consulenze", professional.id, {
			title: cleanText(professional.nome),
			presentation: professional.presentazione,
			sport: cleanText(professional.sport_principale) ?? sportTypes[0],
			highlight: cleanText(professional.specializzazioni),
			availability: professional.disponibilita,
			searchValues: [
				professional.specializzazioni,
				professional.presentazione_servizi,
			],
			filterData: {
				tipologie: sportTypes,
			},
			factData: {specializations: cleanText(professional.specializzazioni)},
		}, profileImages));
	}

	for (const referee of row.profilo_arbitro ?? []) {
		if (referee.nascosto !== false) continue;
		profiles.push(createDirectoryProfile(row, "arbitro", referee.id, {
			title: publicProfileName("arbitro", referee.nominativo_anonimo, fullName(referee.nome, referee.cognome)),
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
			highlight: null,
			availability: null,
			searchValues: [],
			filterData: {tipologie: sportTypes},
		}, profileImages));
	}

	for (const facility of row.profilo_campi_impianti ?? []) {
		if (facility.nascosto !== false) continue;
		const sportTypes = ordinaTipologieCalcio(cleanStringArray(facility.tipologie_sport));
		profiles.push(createDirectoryProfile(row, "campi-impianti-sportivi", facility.id, {
			title: facility.nome_organizzazione,
			presentation: facility.presentazione,
			sport: cleanText(facility.sport_principale) ?? sportTypes[0],
			highlight: cleanText(facility.indirizzo),
			availability: null,
			searchValues: [facility.indirizzo, facility.info_aggiuntive],
			filterData: {tipologie: sportTypes},
		}, profileImages));
	}

	return profiles;
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

function profileCompletionPercentage(row: ProfileDirectoryQueryRow, profile: DirectoryProfile, highlights: ReadonlyMap<string, string>): number {
	const children = row[PROFILE_TABLE_BY_TYPE[profile.type]];
	const child = children?.find(candidate => candidate.nascosto === false);
	if (!child) return 0;
	const drafts = createProfileDrafts();
	const locations = createProfileLocations();
	Object.assign(drafts[profile.type], child);
	locations[profile.type] = scopedLocations(row, profile.type, child.id)
		.map(({regione, citta}) => ({regione, citta: citta ?? ""}));
	if (profile.type === "giocatore") {
		drafts.giocatore.video_highlights = highlights.get(profile.id) ?? "";
		if (drafts.giocatore.disponibilita === "svincolato" || drafts.giocatore.disponibilita === "disponibile-subito") drafts.giocatore.categoria_attuale = "";
	}
	return getProfileCompletion(profile.type, drafts, locations, {includePrivateContacts: false}).percentage;
}

async function loadDirectoryHighlights(supabase: SupabaseClient<Database>, ids: readonly string[]) {
	const highlights = new Map<string, string>();
	for (let index = 0; index < ids.length; index += 200) {
		const chunk = ids.slice(index, index + 200);
		for (let offset = 0; ; offset += 1000) {
			const {data, error} = await supabase.from("media_profilo")
				.select("uuid_profilo, link_media, id")
				.in("uuid_profilo", chunk)
				.eq("formato_media", "video_highlights")
				.order("id", {ascending: false})
				.range(offset, offset + 999);
			if (error) throw new Error(`PROFILE_HIGHLIGHTS_UNAVAILABLE:${error.code}`);
			for (const row of data ?? []) if (!highlights.has(row.uuid_profilo)) highlights.set(row.uuid_profilo, row.link_media);
			if ((data?.length ?? 0) < 1000) break;
		}
	}
	return highlights;
}

async function loadDirectoryActivity(supabase: SupabaseClient<Database>, ids: readonly string[]) {
	const activity = new Map<string, string>();
	for (let offset = 0; offset < ids.length; offset += 200) {
		const {data, error} = await supabase.rpc("get_profile_activity_v1", {p_ids: ids.slice(offset, offset + 200)});
		if (error) throw new Error(`PROFILE_ACTIVITY_UNAVAILABLE:${error.code}`);
		for (const row of data ?? []) activity.set(`${row.profile_id}:${row.profile_type}`, row.last_activity);
	}
	return activity;
}

/** Resolve all public subprofiles, retaining their exact identity. */
export async function loadPublicSubprofiles(ids: readonly string[]): Promise<DirectoryProfile[]> {
	const supabase = createAdminClient();
	const profiles: DirectoryProfile[] = [];
	const uniqueIds = [...new Set(ids)];
	for (let offset = 0; offset < uniqueIds.length; offset += 200) {
		const chunk = uniqueIds.slice(offset, offset + 200);
		const [{data, error}, images] = await Promise.all([
			profileDirectoryQuery(supabase, 0).in("uuid", chunk),
			loadProfileImageUrlMap(supabase, chunk),
		]);
		if (error) throw new Error("PUBLIC_SUBPROFILES_UNAVAILABLE");
		for (const row of data ?? []) profiles.push(...mapProfileRow(row, images));
	}
	return profiles;
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

		const candidates = rows.flatMap(row => mapProfileRow(row, profileImages)
			.filter(profile => !isLimitedProfileType(profile.type) && matchesDirectoryQuery(profile, query))
			.map(profile => ({row, profile})));
		const ids = [...new Set(candidates.map(({profile}) => profile.id))];
		const playerIds = [...new Set(candidates.filter(({profile}) => profile.type === "giocatore").map(({profile}) => profile.id))];
		const [highlights, activity] = await Promise.all([
			loadDirectoryHighlights(supabase, playerIds),
			loadDirectoryActivity(supabase, ids),
		]);
		const filteredProfiles = sortRankedDirectoryProfiles(candidates.map(({row, profile}) => ({
			profile,
			completionPercentage: profileCompletionPercentage(row, profile, highlights),
			lastActivityAt: activity.get(`${profile.id}:${profile.type}`) ?? profile.updatedAt,
		})), query.sortSeed ?? randomUUID()).map(({profile}) => profile);
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
