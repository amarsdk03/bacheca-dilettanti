import "server-only";

import {isAnnouncementListed} from "@/features/annunci/announcement-visibility";
import {
	ACTIVE_ANNOUNCEMENT_TYPES,
	announcementContent,
	finiteNumber,
	formatLocation,
	humanizeValue,
	isActiveAnnouncementType,
	type AnnouncementFilterData,
	type AnnouncementLocation,
	type ActiveAnnouncementType,
} from "@/features/annunci/announcement-content";

import type {QueryData, SupabaseClient} from "@supabase/supabase-js";

import {
	type AnnouncementAuthor,
	type AnnouncementContact,
	type AnnouncementDetailField,
	type AnnouncementDetailResult,
	type AnnouncementDirectoryItem,
	type AnnouncementDirectoryQuery,
	type AnnouncementDirectoryResult,
	type AnnouncementFact,
	type AnnouncementFactKind,
	announcementOption,
	type AnnouncementPlayerRoles,
	ANNOUNCEMENTS_PER_PAGE,
	type AnnouncementType,
	getAnnouncementFilterEntries,
	getAnnouncementStorageTypes,
	isValidAnnouncementId,
	type LatestAnnouncementsResult,
	normalizeAnnouncementSearchText,
} from "@/features/annunci/announcement-model";
import type {ProfileType} from "@/features/profilo/profile-model";
import {
	experienceTeamReferences,
	type PublicTeamProfile,
	type TeamProfileReference
} from "@/features/profilo/team-profile";
import {loadPublicTeamProfiles} from "@/features/profilo/server/public-team-profiles";
import {resolvedProfileImageUrl} from "@/features/profilo/profile-image";
import {loadProfileImageUrlMap} from "@/features/profilo/server/profile-images";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Database} from "@/server/supabase";
import {normalizePlayerPrimaryRoles, normalizePlayerSpecificRoles,} from "@/features/profilo/player-roles";
import {ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

const ANNOUNCEMENT_BATCH_SIZE = 500;
const AUTHOR_BATCH_SIZE = 100;
const NOT_SPECIFIED = "Non specificato";

const PROFILE_ANNOUNCEMENT_TYPES = {
	giocatore: ["annuncio_giocatore"],
	squadra: ["annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_partita", "annuncio_squadra_cerca_sponsor"],
	"staff-sportivo": ["annuncio_staff_sportivo"],
	"professionisti-studi": [],
	arbitro: ["annuncio_arbitro"],
	creators: [],
	"torneo-evento": ["annuncio_torneo_evento"],
	"campi-impianti-sportivi": ["annuncio_campo_impianto"],
} as const satisfies Record<ProfileType, readonly ActiveAnnouncementType[]>;

const PROFILE_TABLE_BY_TYPE: Partial<Record<ProfileType, string>> = {
	giocatore: "profilo_giocatore",
	squadra: "profilo_squadra",
	"staff-sportivo": "profilo_staff_sportivo",
	"professionisti-studi": "profilo_professionista_studente",
	arbitro: "profilo_arbitro",
	creators: "profilo_creator",
	"torneo-evento": "profilo_torneo_evento",
	"campi-impianti-sportivi": "profilo_campi_impianti",
};

const ANONYMOUS_LABEL_BY_PROFILE: Partial<Record<ProfileType, string>> = {
	giocatore: "Giocatore anonimo",
	squadra: "Squadra anonima",
	"staff-sportivo": "Staff sportivo anonimo",
	"professionisti-studi": "Professionista anonimo",
	arbitro: "Arbitro anonimo",
	creators: "Creator anonimo",
	"torneo-evento": "Torneo / evento anonimo",
	"campi-impianti-sportivi": "Campo / impianto anonimo",
};

function announcementContentQuery(
	supabase: SupabaseClient<Database>,
	options?: {count?: "exact"},
) {
	// Server-only projection of shareable content. Never include private account,
	// payment or moderation notes: saved announcements can be opened by URL.
	return supabase
		.from("annuncio")
		.select(`
			uuid,
			autore_annuncio,
			tipologia_annuncio,
			creato_il,
			livello_annuncio,
			priorita_attiva,
			priorita_fine_il,
			stato_annuncio,
			nascosto,
			privato,
			annuncio_giocatore(tipologie_sport, ruoli_principali, ruoli_secondari, categorie_ricercate, descrizione_aggiuntiva),
			annuncio_squadra_cerca_giocatore(tipologie_sport, ruoli_principali, ruoli_secondari, annate_ricercate, stagione, descrizione_aggiuntiva),
			annuncio_squadra_cerca_staff(figura_ricercata, settore, compenso_mensile, requisiti, periodo_dal, periodo_al, descrizione_aggiuntiva),
			annuncio_squadra_cerca_partita(categorie_avversario, disponibilita_trasferta, periodo_dal, periodo_al, orario_dalle, orario_alle, descrizione_aggiuntiva),
			annuncio_squadra_cerca_sponsor(categoria_settore, supporto_cercato, offerta_fornita, descrizione_aggiuntiva),
			annuncio_staff_sportivo(figure_professionali, tipologie_sport, categorie_ricercate, disponibilita_occupazione, disponibilita_spostamento, descrizione_aggiuntiva, lista_esperienze),
			annuncio_arbitro(tipologie_sport, categorie_ricercate, disponibilita_occupazione, disponibilita_spostamento, automunito, descrizione_aggiuntiva, lista_esperienze),
			annuncio_torneo_evento(nome_evento, modalita_iscrizione, annate_ammesse_da, annate_ammesse_a, numero_squadre, costo_partecipazione, tipo_partecipazione, lista_premi_trofei, descrizione_aggiuntiva, tipologie_sport),
			annuncio_campo_impianto(tipologie_sport, orari, costo_partenza, servizi_inclusi, descrizione_aggiuntiva),
			localita_annuncio(regione, citta)
		`, options);
}

function publicAnnouncementQuery(
	supabase: SupabaseClient<Database>,
	options?: {count?: "exact"},
) {
	// Every discovery query must retain all three visibility predicates.
	return announcementContentQuery(supabase, options)
		.eq("stato_annuncio", "pubblicato")
		.eq("nascosto", false)
		.eq("privato", false);
}

type AnnouncementQueryRow = QueryData<ReturnType<typeof publicAnnouncementQuery>>[number];

function officialAuthorQuery(supabase: SupabaseClient<Database>) {
	// uuid_utente is used only as a server-side filter and is intentionally not
	// selected. Anonymous publishing profiles never reach these child selects.
	return supabase
		.from("profilo")
		.select(`
			uuid,
			link_foto_profilo,
			confermato_il,
			verificato_il,
			localita_profilo(id_sottoprofilo, sottoprofilo, regione, citta),
			profilo_giocatore(id, nascosto, nome, cognome, disponibilita, presentazione, ruoli_sport, tipologie_sport, categorie_ricercate),
			profilo_squadra(id, nascosto, nome_societa, presentazione, sede_principale, tipologie_sport),
			profilo_staff_sportivo(id, nascosto, nome, cognome, disponibilita, figure_professionali, presentazione),
			profilo_professionista_studente(id, nascosto, nome, cognome, disponibilita, figure_professionali, presentazione, presentazione_servizi, specializzazioni, tipologie_sport),
			profilo_arbitro(id, nascosto, nome, cognome, disponibilita, presentazione),
			profilo_creator(id, nascosto, nome_creator, presentazione, tipologia_contenuti),
			profilo_torneo_evento(id, nascosto, nome_organizzazione, presentazione, sede_principale, tipologie_sport),
			profilo_campi_impianti(id, nascosto, nome_organizzazione, presentazione, sede_principale, tipologie_sport, costo_partenza, servizi_inclusi)
		`)
		.eq("nascosto", false)
		.not("uuid_utente", "is", null);
}

type OfficialAuthorQueryRow = QueryData<ReturnType<typeof officialAuthorQuery>>[number];

interface MappedAnnouncement {
	item: AnnouncementDirectoryItem;
	fields: AnnouncementDetailField[];
	playerRoles: AnnouncementPlayerRoles | null;
	filterData: AnnouncementFilterData;
	searchText: string;
	authorId: string | null;
	teamReferences: TeamProfileReference[];
}

interface AuthorLoadResult {
	authors: Map<string, AnnouncementAuthor>;
	error: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function relationRecords(value: unknown) {
	const values = Array.isArray(value) ? value : value ? [value] : [];
	return values.filter(isRecord);
}

function firstRelation(value: unknown) {
	return relationRecords(value)[0] ?? null;
}

function cleanText(value: unknown, maxLength = 5_000) {
	if (typeof value !== "string") return null;
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized ? normalized.slice(0, maxLength) : null;
}

function validExternalAnnouncementLink(value: unknown) {
	const link = cleanText(value, 2_048);
	if (!link) return null;

	try {
		const url = new URL(link);
		return (url.protocol === "http:" || url.protocol === "https:") && url.hostname
			? link
			: null;
	} catch {
		return null;
	}
}

function cleanStringArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return [...new Set(
		value
			.map((item) => cleanText(item, 160))
			.filter((item): item is string => Boolean(item)),
	)];
}

function jsonStringArray(value: unknown, key: string) {
	return isRecord(value) ? cleanStringArray(value[key]) : [];
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

function announcementLocations(row: AnnouncementQueryRow) {
	const source = (row as unknown as Record<string, unknown>).localita_annuncio;
	return relationRecords(source)
		.flatMap((location): AnnouncementLocation[] => {
			const region = cleanText(location.regione, 80);
			if (!region) return [];
			return [{region, city: cleanText(location.citta, 120)}];
		})
		.sort((left, right) => {
			const leftLabel = [left.city, left.region].filter(Boolean).join(", ");
			const rightLabel = [right.city, right.region].filter(Boolean).join(", ");
			return leftLabel.localeCompare(rightLabel, "it-IT");
		});
}

function anonymousAuthor(profileType: ProfileType): AnnouncementAuthor {
	return {
		kind: "anonymous",
		profileType,
		label: ANONYMOUS_LABEL_BY_PROFILE[profileType] ?? "Sottoprofilo anonimo",
	};
}

function unavailableAuthor(profileType: ProfileType): AnnouncementAuthor {
	return {
		kind: "unavailable",
		profileType,
		label: "Autore temporaneamente non disponibile",
	};
}

function detailForType(row: AnnouncementQueryRow, type: AnnouncementType) {
	return firstRelation((row as unknown as Record<string, unknown>)[type]) ?? {};
}

function mapAnnouncement(row: AnnouncementQueryRow): MappedAnnouncement | null {
	if (!isActiveAnnouncementType(row.tipologia_annuncio)) return null;
	const priorityEndsAt = row.priorita_fine_il ? Date.parse(row.priorita_fine_il) : NaN;
	const isPriority = row.livello_annuncio === "prioritario"
		&& row.stato_annuncio === "pubblicato"
		&& row.priorita_attiva
		&& priorityEndsAt > Date.now();
	const type = row.tipologia_annuncio;
	const option = announcementOption(type);
	const detail = detailForType(row, type);
	const locations = announcementLocations(row);
	const content = announcementContent(type, detail, locations);
	const teamReferences = experienceTeamReferences(detail.lista_esperienze);
	const searchText = normalizeAnnouncementSearchText([
		content.title,
		content.description,
		option.label,
		content.location,
		...content.searchValues,
		...teamReferences.map(({name}) => name),
		...locations.flatMap(({region, city}) => [region, city ?? ""]),
	].filter(Boolean).join(" "));

	return {
		item: {
			id: row.uuid,
			type,
			typeLabel: option.label,
			profileType: option.profileType,
			title: content.title,
			description: content.description,
			createdAt: row.creato_il,
			level: row.stato_annuncio === "pubblicato" && row.livello_annuncio === "prioritario" && !isPriority
				? "gratuito"
				: cleanText(row.livello_annuncio, 80),
			isPriority,
			location: content.location,
			facts: content.facts,
			author: anonymousAuthor(option.profileType),
			linkedTeams: [],
		},
		fields: content.fields,
		playerRoles: content.playerRoles,
		filterData: content.filters,
		searchText,
		authorId: isValidAnnouncementId(row.autore_annuncio) ? row.autore_annuncio : null,
		teamReferences,
	};
}

function normalizedIncludes(values: string[], selected: string) {
	const normalized = normalizeAnnouncementSearchText(selected);
	return values.some((value) => normalizeAnnouncementSearchText(value) === normalized);
}

function matchesDirectoryQuery(
	announcement: MappedAnnouncement,
	query: AnnouncementDirectoryQuery,
	requestedTypes: readonly AnnouncementType[],
) {
	if (!requestedTypes.includes(announcement.item.type)) return false;
	const tokens = normalizeAnnouncementSearchText(query.q).split(/\s+/).filter(Boolean);
	if (tokens.some((token) => !announcement.searchText.includes(token))) return false;
	if (query.types.length !== 1) return true;

	const {filters} = query;
	const data = announcement.filterData;
	if (filters.regione && !normalizedIncludes(data.regions, filters.regione)) return false;
	if (filters.tipologia && !normalizedIncludes(data.types, filters.tipologia)) return false;
	if (filters.ruolo && !normalizedIncludes(data.roles, filters.ruolo)) return false;
	if (filters.figura && !normalizedIncludes(data.figures, filters.figura)) return false;
	if (filters.categoria && !normalizedIncludes(data.categories, filters.categoria)) return false;
	if (filters.automunito && normalizeAnnouncementSearchText(data.car ?? "") !== normalizeAnnouncementSearchText(filters.automunito)) return false;
	if (filters.costoMax !== null && (data.cost === null || data.cost > filters.costoMax)) return false;
	if (filters.compensoMin !== null && (data.compensation === null || data.compensation < filters.compensoMin)) return false;
	return true;
}

function profileLocationRecords(row: OfficialAuthorQueryRow) {
	return relationRecords((row as unknown as Record<string, unknown>).localita_profilo);
}

function profileLocations(
	row: OfficialAuthorQueryRow,
	profileType: ProfileType,
	childId: number,
) {
	const locations = profileLocationRecords(row).flatMap((location): AnnouncementLocation[] => {
		if (location.sottoprofilo !== profileType) return [];
		const scopedChildId = finiteNumber(location.id_sottoprofilo);
		if (scopedChildId !== null && scopedChildId !== childId) return [];
		const region = cleanText(location.regione, 80);
		if (!region) return [];
		return [{region, city: cleanText(location.citta, 120)}];
	});
	return locations
		.filter((location, index, all) =>
			all.findIndex((candidate) => candidate.region === location.region && candidate.city === location.city) === index,
		)
		.sort((left, right) => {
			const leftLabel = [left.region, left.city].filter(Boolean).join(", ");
			const rightLabel = [right.region, right.city].filter(Boolean).join(", ");
			return leftLabel.localeCompare(rightLabel, "it-IT");
		});
}

function fullName(name: unknown, surname: unknown) {
	return [cleanText(name, 160), cleanText(surname, 160)].filter(Boolean).join(" ") || null;
}

function registeredAuthor(
	row: OfficialAuthorQueryRow,
	profileType: ProfileType,
	profileImages: ReadonlyMap<string, string>,
): AnnouncementAuthor | null {
	const table = PROFILE_TABLE_BY_TYPE[profileType];
	if (!table) return null;
	const child = relationRecords((row as unknown as Record<string, unknown>)[table])
		.find((candidate) => candidate.nascosto === false);
	if (!child) return null;
	const childId = finiteNumber(child.id);
	if (childId === null) return null;
	const locations = profileLocations(row, profileType, childId);
	const location = formatLocation(locations);
	let title: string | null = null;
	let highlights: AnnouncementFact[] = [];

	if (profileType === "giocatore") {
		const roles = [
			...normalizePlayerPrimaryRoles(jsonStringArray(child.ruoli_sport, "principali")),
			...normalizePlayerSpecificRoles(jsonStringArray(child.ruoli_sport, "specifici")),
		];
		title = fullName(child.nome, child.cognome);
		highlights = [
			fact("roles", "Ruoli", formatSelection([...new Set(roles)], "selezionati")),
			fact("categories", "Categorie", formatSelection(cleanStringArray(child.categorie_ricercate), "selezionate")),
			fact("availability", "Disponibilità", humanizeValue(child.disponibilita)),
			fact("location", "Località", location),
		];
	} else if (profileType === "squadra") {
		title = cleanText(child.nome_societa, 160);
		highlights = [
			fact("types", "Tipologie", formatSelection(ordinaTipologieCalcio(cleanStringArray(child.tipologie_sport)), "selezionate")),
			fact("headquarters", "Sede", cleanText(child.sede_principale, 160)),
			fact("location", "Località", location),
		];
	} else if (profileType === "staff-sportivo") {
		title = fullName(child.nome, child.cognome);
		highlights = [
			fact("figures", "Figure", formatSelection(cleanStringArray(child.figure_professionali), "selezionate")),
			fact("availability", "Disponibilità", humanizeValue(child.disponibilita)),
			fact("location", "Località", location),
		];
	} else if (profileType === "professionisti-studi") {
		title = fullName(child.nome, child.cognome);
		highlights = [
			fact("figures", "Figure", formatSelection(cleanStringArray(child.figure_professionali), "selezionate")),
			fact("specializations", "Specializzazioni", cleanText(child.specializzazioni, 160)),
			fact("availability", "Disponibilità", humanizeValue(child.disponibilita)),
		];
	} else if (profileType === "arbitro") {
		title = fullName(child.nome, child.cognome);
		highlights = [
			fact("availability", "Disponibilità", humanizeValue(child.disponibilita)),
			fact("location", "Località", location),
		];
	} else if (profileType === "creators") {
		title = cleanText(child.nome_creator, 160);
		highlights = [
			fact("content", "Contenuti", cleanText(child.tipologia_contenuti, 160)),
		];
	} else if (profileType === "torneo-evento") {
		title = cleanText(child.nome_organizzazione, 160);
		highlights = [
			fact("types", "Tipologie", formatSelection(ordinaTipologieCalcio(cleanStringArray(child.tipologie_sport)), "selezionate")),
			fact("headquarters", "Sede", cleanText(child.sede_principale, 160)),
			fact("location", "Località", location),
		];
	} else {
		title = cleanText(child.nome_organizzazione, 160);
		const cost = finiteNumber(child.costo_partenza);
		highlights = [
			fact("types", "Tipologie", formatSelection(ordinaTipologieCalcio(cleanStringArray(child.tipologie_sport)), "selezionate")),
			fact("price", "Costo", cost === null ? null : `Da ${formatCurrency(cost)}`),
			fact("location", "Località", location),
		];
	}

	if (!title) return null;
	return {
		kind: "registered",
		profileId: row.uuid,
		profileType,
		title,
		imageUrl: resolvedProfileImageUrl(profileImages, row.uuid, profileType, cleanText(row.link_foto_profilo, 2_000)),
		emailConfirmed: Boolean(row.confermato_il),
		officialVerified: Boolean(row.verificato_il),
		presentation: cleanText(child.presentazione),
		location,
		locations,
		highlights,
	};
}

function authorMapKey(profileId: string, profileType: ProfileType) {
	return `${profileId}:${profileType}`;
}

function queryErrorCode(error: unknown) {
	return isRecord(error) && typeof error.code === "string" ? error.code : "UNKNOWN";
}

function logQueryError(source: string, error: unknown) {
	console.error("[annunci] Public query failed", {
		source,
		code: queryErrorCode(error),
	});
}

async function loadOfficialAuthors(
	supabase: SupabaseClient<Database>,
	announcements: MappedAnnouncement[],
): Promise<AuthorLoadResult> {
	const requestedTypesById = new Map<string, Set<ProfileType>>();
	for (const announcement of announcements) {
		if (!announcement.authorId) continue;
		const requested = requestedTypesById.get(announcement.authorId) ?? new Set<ProfileType>();
		requested.add(announcement.item.profileType);
		requestedTypesById.set(announcement.authorId, requested);
	}

	const ids = [...requestedTypesById.keys()];
	const authors = new Map<string, AnnouncementAuthor>();
	for (let offset = 0; offset < ids.length; offset += AUTHOR_BATCH_SIZE) {
		const chunk = ids.slice(offset, offset + AUTHOR_BATCH_SIZE);
		const [{data, error}, profileImages] = await Promise.all([
			officialAuthorQuery(supabase).in("uuid", chunk),
			loadProfileImageUrlMap(supabase, chunk),
		]);
		if (error) {
			logQueryError("authors", error);
			return {authors: new Map(), error: true};
		}

		for (const row of data ?? []) {
			const requestedTypes = requestedTypesById.get(row.uuid);
			if (!requestedTypes) continue;
			for (const profileType of requestedTypes) {
				const author = registeredAuthor(row, profileType, profileImages);
				if (author) authors.set(authorMapKey(row.uuid, profileType), author);
			}
		}
	}

	return {authors, error: false};
}

function withLoadedAuthor(
	announcement: MappedAnnouncement,
	authors: Map<string, AnnouncementAuthor>,
	authorsUnavailable = false,
) {
	if (!announcement.authorId) return announcement.item;
	if (authorsUnavailable) {
		return {
			...announcement.item,
			author: unavailableAuthor(announcement.item.profileType),
		};
	}
	const author = authors.get(authorMapKey(
		announcement.authorId,
		announcement.item.profileType,
	));
	return author ? {...announcement.item, author} : announcement.item;
}

function emptyDirectoryResult(error = false): AnnouncementDirectoryResult {
	return {
		announcements: [],
		total: 0,
		currentPage: 1,
		totalPages: 1,
		error,
	};
}

/** Used by private bookmarks; public visibility and DTO allowlists still apply. */
export async function loadPublicAnnouncementsByIds(ids: readonly string[]): Promise<AnnouncementDirectoryItem[]> {
	const supabase = createAdminClient();
	const announcements: AnnouncementDirectoryItem[] = [];
	const uniqueIds = [...new Set(ids)];
	for (let offset = 0; offset < uniqueIds.length; offset += 200) {
		const {data, error} = await publicAnnouncementQuery(supabase).in("uuid", uniqueIds.slice(offset, offset + 200));
		if (error) throw new Error("SAVED_ANNOUNCEMENT_CONTENT_UNAVAILABLE");
		const mapped = (data ?? []).map(mapAnnouncement).filter((item): item is MappedAnnouncement => Boolean(item));
		const [authors, teams] = await Promise.all([
			loadOfficialAuthors(supabase, mapped),
			loadAnnouncementTeams(supabase, mapped),
		]);
		announcements.push(...mapped.map((item) => withLoadedRelations(item, authors.authors, teams, authors.error)));
	}
	return announcements;
}

export async function loadLatestPublicAnnouncements(): Promise<LatestAnnouncementsResult> {
	try {
		const supabase = createAdminClient();

		const {data, error} = await publicAnnouncementQuery(supabase)
			.in("tipologia_annuncio", ACTIVE_ANNOUNCEMENT_TYPES)
			.order("creato_il", {ascending: false, nullsFirst: false})
			.order("uuid", {ascending: false})
			.limit(6);

		if (error) {
			logQueryError("latest", error);
			return {announcements: [], error: true};
		}

		const announcements = (data ?? [])
			.map(mapAnnouncement)
			.filter((item): item is MappedAnnouncement => Boolean(item))
			.map(({item}) => ({
				id: item.id,
				profileType: item.profileType,
				typeLabel: item.typeLabel,
				title: item.title,
				location: item.location,
				createdAt: item.createdAt,
			}));

		return {announcements, error: false};
	} catch (error) {
		logQueryError("latest-unexpected", error);
		return {announcements: [], error: true};
	}
}

async function loadAnnouncementTeams(
	supabase: SupabaseClient<Database>,
	announcements: readonly MappedAnnouncement[],
) {
	const playerAuthorIds = [...new Set(announcements.flatMap((announcement) => (
		announcement.item.type === "annuncio_giocatore" && announcement.authorId
			? [announcement.authorId]
			: []
	)))];
	if (playerAuthorIds.length > 0) {
		const {data, error} = await supabase
			.from("profilo_giocatore")
			.select("uuid_profilo, storico_carriera")
			.in("uuid_profilo", playerAuthorIds);
		if (error) {
			logQueryError("player-linked-teams", error);
		} else {
			const referencesByAuthor = new Map((data ?? []).map((profile) => [
				profile.uuid_profilo,
				experienceTeamReferences(profile.storico_carriera, "titolo"),
			]));
			for (const announcement of announcements) {
				if (announcement.item.type !== "annuncio_giocatore" || !announcement.authorId) continue;
				announcement.teamReferences = referencesByAuthor.get(announcement.authorId) ?? [];
			}
		}
	}
	const ids = announcements.flatMap(({teamReferences}) => teamReferences.map(({profileId}) => profileId));
	try {
		const teams = await loadPublicTeamProfiles(supabase, ids);
		return new Map<string, PublicTeamProfile>(teams.map((team) => [team.profileId, team]));
	} catch (error) {
		logQueryError("linked-teams", error);
		return new Map<string, PublicTeamProfile>();
	}
}

function withLoadedRelations(
	announcement: MappedAnnouncement,
	authors: Map<string, AnnouncementAuthor>,
	teams: Map<string, PublicTeamProfile>,
	authorsUnavailable = false,
) {
	return {
		...withLoadedAuthor(announcement, authors, authorsUnavailable),
		linkedTeams: announcement.teamReferences.map((reference) => teams.get(reference.profileId) ?? reference),
	};
}

const RELATED_ANNOUNCEMENT_TYPES: Record<AnnouncementType, readonly AnnouncementType[]> = {
	annuncio_giocatore: ["annuncio_squadra_cerca_giocatore"],
	annuncio_squadra_cerca_giocatore: ["annuncio_giocatore"],
	annuncio_staff_sportivo: ["annuncio_squadra_cerca_staff"],
	annuncio_squadra_cerca_staff: ["annuncio_staff_sportivo"],
	annuncio_squadra_cerca_partita: ["annuncio_squadra_cerca_partita", "annuncio_campo_impianto"],
	annuncio_squadra_cerca_sponsor: [],
	annuncio_arbitro: ["annuncio_torneo_evento", "annuncio_squadra_cerca_partita"],
	annuncio_torneo_evento: ["annuncio_arbitro", "annuncio_campo_impianto"],
	annuncio_campo_impianto: ["annuncio_torneo_evento", "annuncio_squadra_cerca_partita"],
	annuncio_professionisti_studi: ["annuncio_squadra_cerca_staff", "annuncio_torneo_evento"],
	annuncio_creators: ["annuncio_torneo_evento"]
};

export async function loadRelatedPublicAnnouncements(
	sourceId: string,
	sourceType: AnnouncementType,
	sourceRegions: readonly string[],
): Promise<AnnouncementDirectoryItem[]> {
	const relatedTypes = RELATED_ANNOUNCEMENT_TYPES[sourceType];
	if (relatedTypes.length === 0) return [];

	try {
		const supabase = createAdminClient();
		const {data, error} = await publicAnnouncementQuery(supabase)
			.in("tipologia_annuncio", relatedTypes)
			.neq("uuid", sourceId)
			.order("creato_il", {ascending: false, nullsFirst: false})
			.order("uuid", {ascending: false})
			.limit(100);
		if (error) {
			logQueryError("related", error);
			return [];
		}

		const normalizedRegions = new Set(sourceRegions.map(normalizeAnnouncementSearchText));
		const mapped = (data ?? [])
			.map(mapAnnouncement)
			.filter((item): item is MappedAnnouncement => Boolean(item))
			.sort((left, right) => {
				const leftLocal = left.filterData.regions.some((region) => normalizedRegions.has(normalizeAnnouncementSearchText(region)));
				const rightLocal = right.filterData.regions.some((region) => normalizedRegions.has(normalizeAnnouncementSearchText(region)));
				return Number(rightLocal) - Number(leftLocal);
			})
			.slice(0, 3);
		const [authorResult, teams] = await Promise.all([
			loadOfficialAuthors(supabase, mapped),
			loadAnnouncementTeams(supabase, mapped),
		]);
		return mapped.map((item) => withLoadedRelations(item, authorResult.authors, teams, authorResult.error));
	} catch (error) {
		logQueryError("related-unexpected", error);
		return [];
	}
}

export async function loadPublicAnnouncementDirectory(
	query: AnnouncementDirectoryQuery,
): Promise<AnnouncementDirectoryResult> {
	try {
		const supabase = createAdminClient();
		const requestedTypes = getAnnouncementStorageTypes(query).filter(isActiveAnnouncementType);
		if (requestedTypes.length === 0) return emptyDirectoryResult(false);
		const requiresClientFiltering = Boolean(query.q)
			|| getAnnouncementFilterEntries(query.filters)
				.some(([key]) => key !== "ricercaSquadra");

		if (!requiresClientFiltering) {
			async function fetchPage(page: number) {
				const from = (page - 1) * ANNOUNCEMENTS_PER_PAGE;
				return publicAnnouncementQuery(supabase, {count: "exact"})
					.in("tipologia_annuncio", requestedTypes)
					.order("priorita_attiva", {ascending: false})
					.order("creato_il", {ascending: false, nullsFirst: false})
					.order("uuid", {ascending: false})
					.range(from, from + ANNOUNCEMENTS_PER_PAGE - 1);
			}

			let pageResult = await fetchPage(query.page);
			if (pageResult.error) {
				logQueryError("directory-page", pageResult.error);
				return emptyDirectoryResult(true);
			}

			const total = pageResult.count ?? 0;
			const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PER_PAGE));
			const currentPage = Math.min(query.page, totalPages);
			if (currentPage !== query.page) {
				pageResult = await fetchPage(currentPage);
				if (pageResult.error) {
					logQueryError("directory-last-page", pageResult.error);
					return emptyDirectoryResult(true);
				}
			}

			const page = (pageResult.data ?? [])
				.map(mapAnnouncement)
				.filter((item): item is MappedAnnouncement => Boolean(item));
			const [authorResult, teams] = await Promise.all([
				loadOfficialAuthors(supabase, page),
				loadAnnouncementTeams(supabase, page),
			]);

			return {
				announcements: page.map((item) => withLoadedRelations(
					item,
					authorResult.authors,
					teams,
					authorResult.error,
				)),
				total,
				currentPage,
				totalPages,
				error: false,
			};
		}

		const rows: AnnouncementQueryRow[] = [];

		for (let offset = 0; ; offset += ANNOUNCEMENT_BATCH_SIZE) {
			const {data, error} = await publicAnnouncementQuery(supabase)
				.in("tipologia_annuncio", requestedTypes)
				.order("priorita_attiva", {ascending: false})
				.order("creato_il", {ascending: false, nullsFirst: false})
				.order("uuid", {ascending: false})
				.range(offset, offset + ANNOUNCEMENT_BATCH_SIZE - 1);
			if (error) {
				logQueryError("directory", error);
				return emptyDirectoryResult(true);
			}

			const batch = data ?? [];
			rows.push(...batch);
			if (batch.length < ANNOUNCEMENT_BATCH_SIZE) break;
		}

		const filtered = rows
			.map(mapAnnouncement)
			.filter((item): item is MappedAnnouncement => Boolean(item))
			.filter((item) => matchesDirectoryQuery(item, query, requestedTypes));
		const total = filtered.length;
		const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PER_PAGE));
		const currentPage = Math.min(query.page, totalPages);
		const start = (currentPage - 1) * ANNOUNCEMENTS_PER_PAGE;
		const page = filtered.slice(start, start + ANNOUNCEMENTS_PER_PAGE);
		const [authorResult, teams] = await Promise.all([
			loadOfficialAuthors(supabase, page),
			loadAnnouncementTeams(supabase, page),
		]);

		return {
			announcements: page.map((item) => withLoadedRelations(
				item,
				authorResult.authors,
				teams,
				authorResult.error,
			)),
			total,
			currentPage,
			totalPages,
			error: false,
		};
	} catch (error) {
		logQueryError("directory-unexpected", error);
		return emptyDirectoryResult(true);
	}
}

async function loadSimilarPublicAnnouncements(supabase: SupabaseClient<Database>, id: string, type: AnnouncementType) {
	try {
		const {data, error} = await publicAnnouncementQuery(supabase)
			.eq("tipologia_annuncio", type).neq("uuid", id)
			.order("creato_il", {ascending: false, nullsFirst: false})
			.order("uuid", {ascending: false}).limit(6);
		if (error) throw error;
		const mapped = (data ?? []).map(mapAnnouncement).filter((item): item is MappedAnnouncement => Boolean(item));
		const [authorResult, teams] = await Promise.all([
			loadOfficialAuthors(supabase, mapped), loadAnnouncementTeams(supabase, mapped),
		]);
		return {announcements: mapped.map(item => withLoadedRelations(item, authorResult.authors, teams, authorResult.error)), unavailable: false};
	} catch (error) {
		logQueryError("similar", error);
		return {announcements: [], unavailable: true};
	}
}

export async function loadPublicProfileAnnouncements(
	supabase: SupabaseClient<Database>,
	profileId: string,
	profileType: ProfileType,
): Promise<{announcements: AnnouncementDirectoryItem[]; announcementCount: number | null; unavailable: boolean}> {
	const allowedTypes = PROFILE_ANNOUNCEMENT_TYPES[profileType];
	if (allowedTypes.length === 0) return {announcements: [], announcementCount: 0, unavailable: false};

	try {
		const {data, error, count} = await publicAnnouncementQuery(supabase, {count: "exact"})
			.eq("autore_annuncio", profileId)
			.in("tipologia_annuncio", allowedTypes)
			.order("creato_il", {ascending: false, nullsFirst: false})
			.order("uuid", {ascending: false})
			.limit(4);
		if (error) {
			logQueryError("profile-announcements", error);
			return {announcements: [], announcementCount: null, unavailable: true};
		}

		const mapped = (data ?? []).map(mapAnnouncement).filter((item): item is MappedAnnouncement => Boolean(item));
		const [authorResult, teams] = await Promise.all([
			loadOfficialAuthors(supabase, mapped),
			loadAnnouncementTeams(supabase, mapped),
		]);
		return {
			announcements: mapped.map(item => withLoadedRelations(item, authorResult.authors, teams, authorResult.error)),
			announcementCount: count,
			unavailable: false,
		};
	} catch (error) {
		logQueryError("profile-announcements-unexpected", error);
		return {announcements: [], announcementCount: null, unavailable: true};
	}
}

async function loadAnnouncementSaveCount(supabase: SupabaseClient<Database>, id: string): Promise<number | null> {
	try {
		// Aggregate only: never return the identities of users who saved an announcement.
		const {count, error} = await supabase.from("annuncio_salvato")
			.select("uuid_annuncio", {count: "exact", head: true}).eq("uuid_annuncio", id);
		if (error) throw error;
		return count;
	} catch (error) {
		logQueryError("save-count", error);
		return null;
	}
}

async function loadAnnouncementAuthorFollowerCount(supabase: SupabaseClient<Database>, profileId: string): Promise<number | null> {
	try {
		// Called only after the author has been resolved as a public registered profile.
		const {count, error} = await supabase.from("profilo_follow")
			.select("uuid_profilo_seguito", {count: "exact", head: true}).eq("uuid_profilo_seguito", profileId);
		if (error) throw error;
		return count;
	} catch (error) {
		logQueryError("author-follower-count", error);
		return null;
	}
}

function validContact(row: {tipo: string; valore: string}): AnnouncementContact | null {
	const value = row.valore.trim();
	if (row.tipo === "email") {
		if (value.length > 254 || !/^[^@\s?&#]+@[^@\s?&#]+\.[^@\s?&#]+$/.test(value)) return null;
		return {kind: "email", label: "Email", value, href: `mailto:${value}`};
	}
	if (row.tipo !== "telefono" || value.length > 40) return null;
	const digits = value.replace(/\D/g, "");
	if (digits.length < 6 || digits.length > 20 || !/^[+0-9().\s-]+$/.test(value)) return null;
	const hrefValue = `${value.startsWith("+") ? "+" : ""}${digits}`;
	return {kind: "phone", label: "Telefono", value, href: `tel:${hrefValue}`};
}

export async function loadPublicAnnouncementDetail(
	id: string,
): Promise<AnnouncementDetailResult> {
	if (!isValidAnnouncementId(id)) return {status: "not-found"};

	try {
		const supabase = createAdminClient();
		const {data, error} = await announcementContentQuery(supabase)
			.eq("uuid", id)
			.maybeSingle();
		if (error) {
			logQueryError("detail", error);
			return {status: "error"};
		}
		if (!data || !isActiveAnnouncementType(data.tipologia_annuncio)) {
			return {status: "not-found"};
		}

		const mapped = mapAnnouncement(data);
		if (!mapped) return {status: "not-found"};
		const content = announcementContent(data.tipologia_annuncio, detailForType(data, data.tipologia_annuncio), announcementLocations(data), true);
		const isListed = isAnnouncementListed(data.stato_annuncio, data.nascosto, data.privato);
		const [authorResult, linkedTeams, contactResult, linkResult, mediaResult, saveCount, similar] = await Promise.all([
			loadOfficialAuthors(supabase, [mapped]),
			loadAnnouncementTeams(supabase, [mapped]),
			supabase
				.from("contatto_annuncio")
				.select("tipo, valore")
				.eq("uuid_annuncio", data.uuid)
				.order("id", {ascending: true}),
			supabase
				.from("link_social_annuncio")
				.select("sublink")
				.eq("uuid_annuncio", data.uuid)
				.eq("piattaforma", "link_annuncio")
				.order("id", {ascending: true})
				.limit(1)
				.maybeSingle(),
			supabase
				.from("media_annuncio")
				.select("id")
				.eq("uuid_annuncio", data.uuid)
				.like("formato_media", "image/%")
				.limit(1),
			isListed ? loadAnnouncementSaveCount(supabase, id) : Promise.resolve(null),
			loadSimilarPublicAnnouncements(supabase, id, mapped.item.type),
		]);

		if (contactResult.error) logQueryError("contacts", contactResult.error);
		if (linkResult.error) logQueryError("detail-link", linkResult.error);
		if (mediaResult.error) logQueryError("share-image", mediaResult.error);
		const hasShareImage = !mediaResult.error && Boolean(mediaResult.data?.length);
		const announcementLink = linkResult.error
			? null
			: validExternalAnnouncementLink(linkResult.data?.sublink);

		const contacts = (contactResult.error ? [] : contactResult.data ?? [])
			.map(validContact)
			.filter((contact): contact is AnnouncementContact => Boolean(contact));
		const announcement = withLoadedRelations(mapped, authorResult.authors, linkedTeams, authorResult.error);
		const authorFollowerCount = announcement.author.kind === "registered"
			? await loadAnnouncementAuthorFollowerCount(supabase, announcement.author.profileId)
			: null;
		return {
			status: "success",
			announcement: {
				...announcement,
				moderationStatus: data.stato_annuncio,
				isListed,
				announcementLink,
				shareImageUrl: hasShareImage
					? `/api/metadata/annuncio-immagine?${new URLSearchParams({id}).toString()}`
					: null,
				location: content.location,
				locations: content.locations,
				facts: content.facts,
				fields: content.fields,
				saveCount,
				authorFollowerCount,
				similarAnnouncements: similar.announcements,
				similarAnnouncementsUnavailable: similar.unavailable,
				...(mapped.playerRoles ? {playerRoles: mapped.playerRoles} : {}),
				contacts,
				contactsUnavailable: Boolean(contactResult.error),
			},
		};
	} catch (error) {
		logQueryError("detail-unexpected", error);
		return {status: "error"};
	}
}
