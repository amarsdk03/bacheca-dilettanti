import "server-only";

import type {SupabaseClient} from "@supabase/supabase-js";

import {availabilityLabel} from "@/features/profilo/public-profile-display";
import type {
	PlayerProfileData,
	ProfileDetail,
	ProfileDetailField,
	ProfileDetailResult,
	PublicProfileExperience,
} from "@/features/dettagli-profilo/profile-detail-model";
import {loadPublicProfileAnnouncements} from "@/features/dettagli-profilo/server/profile-announcements-query";
import {DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS,} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {parsePlayerCareer, toPublicPlayerData} from "./player-profile-data";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import {
	PROFILE_SOCIAL_PLATFORMS,
	type ProfileSocialLinks,
	profileSocialLinksFromRows,
} from "@/features/profilo/profile-social-links";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Database, Json} from "@/server/supabase";
import {loadPublicTeamProfiles} from "@/features/profilo/server/public-team-profiles";
import {resolvedProfileImageUrl} from "@/features/profilo/profile-image";
import {loadProfileImageUrlMap} from "@/features/profilo/server/profile-images";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/announcementExtras";
import {ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {loadRecentSimilarProfiles} from "@/features/profili/server/queries";

const NOT_SPECIFIED = "Non specificato";

const PRIMARY_FIELD_LABELS = {
	giocatore: ["Ruoli principali", "Tipologie sportive", "Disponibilità"],
	squadra: ["Tipologie sportive", "Sede principale"],
	"staff-sportivo": ["Figure professionali", "Disponibilità"],
	"professionisti-studi": ["Figure professionali", "Specializzazioni", "Disponibilità"],
	arbitro: ["Disponibilità"],
	creators: ["Tipologia di contenuti"],
	"torneo-evento": ["Tipologie sportive", "Sede principale"],
	"campi-impianti-sportivi": ["Tipologie sportive", "Costo di partenza", "Servizi inclusi"],
} as const satisfies Record<ProfileType, readonly string[]>;

const DAY_LABELS: Record<string, string> = {
	lunedi: "Lunedì",
	martedi: "Martedì",
	mercoledi: "Mercoledì",
	giovedi: "Giovedì",
	venerdi: "Venerdì",
	sabato: "Sabato",
	domenica: "Domenica",
};

interface ProfileContent {
	childId: number;
	title: string | null;
	availability: string | null;
	fields: ProfileDetailField[];
	player?: PlayerProfileData;
	experiences?: PublicProfileExperience[];
}

type ProfileContentResult =
	| {status: "ok"; content: ProfileContent}
	| {status: "not-found"}
	| {status: "error"; code: string};

interface ProfileLocation {
	id_sottoprofilo: number | null;
	regione: string;
	citta: string | null;
}

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function publicSocialLinks(
	rows: readonly {piattaforma: string | null; sublink: string}[],
): ProfileSocialLinks {
	const links = profileSocialLinksFromRows(rows);
	for (const platform of PROFILE_SOCIAL_PLATFORMS) {
		if (!isLinkAnnuncioValid(links[platform])) links[platform] = "";
	}
	return links;
}

function fullName(name: string | null, surname: string | null) {
	return [cleanText(name), cleanText(surname)].filter(Boolean).join(" ") || null;
}

function cleanStringArray(value: unknown) {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.map(cleanText).filter((item): item is string => Boolean(item)))];
}

function formatList(value: unknown) {
	return cleanStringArray(value).join(", ") || NOT_SPECIFIED;
}

function asJsonRecord(value: Json | undefined): Record<string, Json | undefined> | null {
	if (!value || Array.isArray(value) || typeof value !== "object") return null;
	return value as Record<string, Json | undefined>;
}

function jsonText(record: Record<string, Json | undefined>, key: string) {
	return cleanText(record[key]);
}

function formatOpeningHours(value: Json | null) {
	if (!Array.isArray(value)) return NOT_SPECIFIED;

	const entries = value.flatMap((entry): string[] => {
		const record = asJsonRecord(entry);
		if (!record || record.attivo !== true) return [];

		const day = jsonText(record, "giorno");
		if (!day) return [];
		const from = jsonText(record, "dalle");
		const to = jsonText(record, "alle");
		const hours = from && to ? `${from}–${to}` : from ?? to ?? "Aperto";
		return [`${DAY_LABELS[day] ?? day}: ${hours}`];
	});

	return entries.join("\n") || NOT_SPECIFIED;
}

function formatCurrency(value: number | null) {
	if (value === null) return NOT_SPECIFIED;
	const price = new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 2,
	}).format(value);
	return `${price} / 1h`;
}

function formatVehicleAvailability(value: string | null) {
	const normalized = cleanText(value);
	if (!normalized) return NOT_SPECIFIED;
	return DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS
		.find((option) => option.valore === normalized)?.etichetta ?? normalized;
}

function detailField(
	label: string,
	value: string | null | undefined,
	wide = false,
	href?: string,
): ProfileDetailField {
	return {
		label,
		value: cleanText(value) ?? NOT_SPECIFIED,
		...(wide ? {wide: true} : {}),
		...(href ? {href} : {}),
	};
}

function availabilityValue(value: string | null) {
	return availabilityLabel(value) ?? NOT_SPECIFIED;
}

function contentError(code: string): ProfileContentResult {
	return {status: "error", code};
}

function unsupportedProfileType(type: never): ProfileContentResult {
	return contentError(`unsupported_profile_type:${String(type)}`);
}

async function loadProfileContent(
	supabase: SupabaseClient<Database>,
	id: string,
	type: ProfileType,
): Promise<ProfileContentResult> {
	if (type === "giocatore") {
		const [playerResult, mediaResult] = await Promise.all([
			supabase
				.from("profilo_giocatore")
				.select("id, nome, cognome, giorno_nascita, mese_nascita, anno_nascita, tipologie_sport, categorie_ricercate, disponibilita, ruoli_sport, piede_principale, altezza, peso, presentazione, storico_carriera")
				.eq("uuid_profilo", id)
				.eq("nascosto", false)
				.maybeSingle(),
			supabase
				.from("media_profilo")
				.select("link_media")
				.eq("uuid_profilo", id)
				.eq("formato_media", "video_highlights")
				.order("id", {ascending: false})
				.limit(1)
				.maybeSingle(),
		]);
		if (playerResult.error) return contentError(playerResult.error.code);
		if (mediaResult.error) return contentError(mediaResult.error.code);
		const data = playerResult.data;
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: fullName(data.nome, data.cognome),
				availability: data.disponibilita,
				fields: [],
				player: toPublicPlayerData(data, mediaResult.data?.link_media),
			},
		};
	}

	if (type === "squadra") {
		const {data, error} = await supabase
			.from("profilo_squadra")
			.select("id, nome_societa, sport_principale, tipologie_sport, sede_principale, presentazione")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: cleanText(data.nome_societa),
				availability: null,
				fields: [
					detailField("Tipologie sportive", formatList(ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport)))),
					detailField("Sede principale", data.sede_principale),
					detailField("Presentazione", data.presentazione, true),
				],
			},
		};
	}

	if (type === "staff-sportivo") {
		const {data, error} = await supabase
			.from("profilo_staff_sportivo")
			.select("id, nome, cognome, sport_principale, figure_professionali, disponibilita, presentazione, storico_esperienze")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: fullName(data.nome, data.cognome),
				availability: data.disponibilita,
				fields: [
					detailField("Figure professionali", formatList(data.figure_professionali)),
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Presentazione", data.presentazione, true),
				],
				experiences: parsePlayerCareer(data.storico_esperienze),
			},
		};
	}

	if (type === "professionisti-studi") {
		const {data, error} = await supabase
			.from("profilo_professionista_studente")
			.select("id, nome, cognome, sport_principale, tipologie_sport, figure_professionali, disponibilita, automunito, specializzazioni, presentazione, presentazione_servizi, storico_esperienze")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: fullName(data.nome, data.cognome),
				availability: data.disponibilita,
				fields: [
					detailField("Tipologie sportive", formatList(ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport)))),
					detailField("Figure professionali", formatList(data.figure_professionali)),
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Automunito", formatVehicleAvailability(data.automunito)),
					detailField("Specializzazioni", data.specializzazioni, true),
					detailField("Presentazione", data.presentazione, true),
					detailField("Servizi offerti", data.presentazione_servizi, true),
				],
				experiences: parsePlayerCareer(data.storico_esperienze),
			},
		};
	}

	if (type === "arbitro") {
		const {data, error} = await supabase
			.from("profilo_arbitro")
			.select("id, nome, cognome, sport_principale, disponibilita, presentazione, storico_esperienze")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: fullName(data.nome, data.cognome),
				availability: data.disponibilita,
				fields: [
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Presentazione", data.presentazione, true),
				],
				experiences: parsePlayerCareer(data.storico_esperienze),
			},
		};
	}

	if (type === "creators") {
		const {data, error} = await supabase
			.from("profilo_creator")
			.select("id, nome_creator, sport_principale, tipologia_contenuti, presentazione")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: cleanText(data.nome_creator),
				availability: null,
				fields: [
					detailField("Tipologia di contenuti", data.tipologia_contenuti),
					detailField("Presentazione", data.presentazione, true),
				],
			},
		};
	}

	if (type === "torneo-evento") {
		const {data, error} = await supabase
			.from("profilo_torneo_evento")
			.select("id, nome_organizzazione, sport_principale, tipologie_sport, sede_principale, presentazione")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: cleanText(data.nome_organizzazione),
				availability: null,
				fields: [
					detailField("Tipologie sportive", formatList(ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport)))),
					detailField("Sede principale", data.sede_principale),
					detailField("Presentazione", data.presentazione, true),
				],
			},
		};
	}

	if (type !== "campi-impianti-sportivi") return unsupportedProfileType(type);

	const {data, error} = await supabase
		.from("profilo_campi_impianti")
		.select("id, nome_organizzazione, sport_principale, tipologie_sport, sede_principale, costo_partenza, orari, presentazione, servizi_inclusi, info_aggiuntive")
		.eq("uuid_profilo", id)
		.eq("nascosto", false)
		.maybeSingle();
	if (error) return contentError(error.code);
	if (!data) return {status: "not-found"};
	return {
		status: "ok",
		content: {
			childId: data.id,
			title: cleanText(data.nome_organizzazione),
			availability: null,
			fields: [
				detailField("Tipologie sportive", formatList(ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport)))),
				detailField("Sede principale", data.sede_principale),
				detailField("Costo di partenza", formatCurrency(data.costo_partenza)),
				detailField("Orari", formatOpeningHours(data.orari), true),
				detailField("Presentazione", data.presentazione, true),
				detailField("Servizi inclusi", data.servizi_inclusi, true),
				detailField("Informazioni aggiuntive", data.info_aggiuntive, true),
			],
		},
	};
}

function profileTypeLabel(type: ProfileType) {
	return PROFILE_OPTIONS.find(({value}) => value === type)?.label ?? "Profilo";
}

function publicLocations(locations: ProfileLocation[], childId: number) {
	const values = locations
		.filter((location) => location.id_sottoprofilo === null || location.id_sottoprofilo === childId)
		.map((location) => ({region: cleanText(location.regione), city: cleanText(location.citta)}))
		.filter((location): location is {region: string; city: string | null} => Boolean(location.region));
	return values.filter((location, index, all) =>
		all.findIndex((candidate) => candidate.region === location.region && candidate.city === location.city) === index,
	);
}

function splitProfileFields(type: ProfileType, fields: ProfileDetailField[]) {
	const primaryFields = PRIMARY_FIELD_LABELS[type].flatMap((label) => {
		const field = fields.find((candidate) => candidate.label === label);
		return field ? [field] : [];
	});
	const primaryLabels = new Set(primaryFields.map(({label}) => label));
	return {
		primaryFields,
		fields: fields.filter(({label}) => !primaryLabels.has(label)),
	};
}

export async function getProfileDetail(id: string, type: ProfileType): Promise<ProfileDetailResult> {
	try {
		const supabase = createAdminClient();
		// This client bypasses owner-only RLS. Every select below is an explicit
		// public allowlist. Player birth-date parts are read only to compute age
		// in toPublicPlayerData; never return those parts, private identity, contacts or notes.
		const baseProfilePromise = supabase
			.from("profilo")
			.select("uuid, link_foto_profilo, confermato_il, verificato_il, tipologia_principale")
			.eq("uuid", id)
			.eq("nascosto", false)
			.not("uuid_utente", "is", null)
			.maybeSingle();
		const locationsPromise = supabase
			.from("localita_profilo")
			.select("id_sottoprofilo, regione, citta")
			.eq("uuid_profilo", id)
			.eq("sottoprofilo", type)
			.order("regione", {ascending: true})
			.order("citta", {ascending: true});
		const socialLinksPromise = supabase
			.from("link_social_profilo")
			.select("piattaforma, sublink")
			.eq("uuid_profilo", id)
			.eq("sottoprofilo", type)
			.in("piattaforma", PROFILE_SOCIAL_PLATFORMS);
		const contentPromise = loadProfileContent(supabase, id, type);
		const announcementsPromise = loadPublicProfileAnnouncements(supabase, id, type);
		const profileImagesPromise = loadProfileImageUrlMap(supabase, [id]);
		const [baseResult, locationsResult, socialLinksResult, contentResult, announcementsResult, profileImages] = await Promise.all([
			baseProfilePromise,
			locationsPromise,
			socialLinksPromise,
			contentPromise,
			announcementsPromise,
			profileImagesPromise,
		]);

		if (baseResult.error || locationsResult.error || socialLinksResult.error || contentResult.status === "error") {
			console.error("[dettagli-profilo] Profile lookup failed", {
				baseCode: baseResult.error?.code,
				locationsCode: locationsResult.error?.code,
				socialLinksCode: socialLinksResult.error?.code,
				contentCode: contentResult.status === "error" ? contentResult.code : undefined,
			});
			return {status: "error"};
		}

		if (!baseResult.data || contentResult.status === "not-found") {
			return {status: "not-found"};
		}

		// Only enrich a visible profile. Return an aggregate, never follower identities.
		const [followersResult, similarResult] = await Promise.allSettled([
			supabase.from("profilo_follow").select("uuid_profilo_seguito", {count: "exact", head: true})
				.eq("uuid_profilo_seguito", id),
			loadRecentSimilarProfiles(supabase, id, type),
		]);
		const followerCount = followersResult.status === "fulfilled" && !followersResult.value.error
			? followersResult.value.count ?? null : null;
		const similarProfiles = similarResult.status === "fulfilled" ? similarResult.value : [];
		if (followerCount === null || similarResult.status === "rejected") {
			console.error("[dettagli-profilo] Profile enrichment unavailable", {
				followersUnavailable: followerCount === null,
				similarProfilesUnavailable: similarResult.status === "rejected",
			});
		}

		const {content} = contentResult;
		const rawExperiences = type === "giocatore"
			? content.player?.career ?? []
			: content.experiences ?? [];
		let teamProfiles = new Map<string, Awaited<ReturnType<typeof loadPublicTeamProfiles>>[number]>();
		try {
			const teams = await loadPublicTeamProfiles(
				supabase,
				rawExperiences.flatMap(({teamProfileId}) => teamProfileId ? [teamProfileId] : []),
			);
			teamProfiles = new Map(teams.map((team) => [team.profileId, team]));
		} catch (error) {
			console.error("[dettagli-profilo] Linked team lookup failed", {
				cause: error instanceof Error ? error.name : "unknown",
			});
		}
		const experiences = rawExperiences.map((experience) => ({
			...experience,
			linkedTeam: experience.teamProfileId ? teamProfiles.get(experience.teamProfileId) ?? null : null,
		}));
		const typeLabel = profileTypeLabel(type);
		const locations = publicLocations(locationsResult.data ?? [], content.childId);
		const splitFields = splitProfileFields(type, content.fields);
		const common = {
			id: baseResult.data.uuid,
			title: content.title ?? `Profilo ${typeLabel.toLocaleLowerCase("it-IT")}`,
			imageUrl: resolvedProfileImageUrl(profileImages, id, type, cleanText(baseResult.data.link_foto_profilo)),
			emailConfirmed: Boolean(baseResult.data.confermato_il),
			officialVerified: Boolean(baseResult.data.verificato_il),
			primary: baseResult.data.tipologia_principale === type,
			availabilityLabel: availabilityLabel(content.availability),
			socialLinks: publicSocialLinks(socialLinksResult.data ?? []),
			announcements: announcementsResult.announcements,
			announcementsUnavailable: announcementsResult.unavailable,
			announcementCount: announcementsResult.announcementCount,
			followerCount,
			similarProfiles,
			similarProfilesUnavailable: similarResult.status === "rejected",
		};

		if (type === "giocatore") {
			if (!content.player) return {status: "error"};
			return {status: "ok", profile: {
				...common,
				type,
				player: {...content.player, career: experiences},
				locations,
			}};
		}

		const profile: ProfileDetail = {...common, type, locations, ...splitFields, experiences};
		return {status: "ok", profile};
	} catch (error) {
		console.error("[dettagli-profilo] Profile lookup unavailable", {
			message: error instanceof Error ? error.message : "Unknown error",
		});
		return {status: "error"};
	}
}
