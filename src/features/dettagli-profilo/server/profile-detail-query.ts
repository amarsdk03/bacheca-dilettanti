import "server-only";
import {publicProfileName} from "@/features/profilo/profile-public-name";
import {teamCategoryLabel} from "@/features/profilo/team-category-catalog";

import type {SupabaseClient} from "@supabase/supabase-js";

import {availabilityLabel} from "@/features/profilo/public-profile-display";
import type {
	PlayerProfileData,
	ProfileDetail,
	ProfileDetailField,
	ProfileDetailResult,
	PublicProfileExperience,
} from "@/features/dettagli-profilo/profile-detail-model";
import {loadPublicProfileAnnouncements} from "@/features/annunci/server/queries";
import {
	ordinaTipologieCalcio,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {normalizeFigures} from "@/features/pubblica-annuncio/types/category-catalog";
import {parsePlayerCareer, publicPlayerAge, toPublicPlayerData} from "./player-profile-data";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import {
	PROFILE_SOCIAL_PLATFORMS,
	type ProfileSocialLinks,
	profileSocialLinksFromRows,
} from "@/features/profilo/profile-social-links";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Database} from "@/server/supabase";
import {loadPublicTeamProfiles} from "@/features/profilo/server/public-team-profiles";
import {resolvedProfileImageUrl} from "@/features/profilo/profile-image";
import {loadProfileImageUrlMap} from "@/features/profilo/server/profile-images";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/announcementExtras";
import {loadRecentSimilarProfiles} from "@/features/profili/server/queries";
import {loadProfileFollowerCount} from "./profile-follower-count";

const NOT_SPECIFIED = "Non specificato";

const PRIMARY_FIELD_LABELS = {
	giocatore: ["Ruoli principali", "Tipologie sportive", "Disponibilità"],
	squadra: ["Tipologia calcio", "Categoria attuale Prima Squadra"],
	"staff-sportivo": ["Figure professionali", "Disponibilità"],
	"servizi-consulenze": ["Tipo di azienda / professione", "Sede Azienda / Professionista", "Disponibilità"],
	arbitro: ["Età", "Disponibilità"],
	creators: ["Tipologia di contenuti"],
	"torneo-evento": ["Tipologie sportive"],
	"campi-impianti-sportivi": ["Tipologia campi disponibili", "Indirizzo del campo"],
} as const satisfies Record<ProfileType, readonly string[]>;

interface ProfileContent {
	anonymousName?: boolean;
	childId: number;
	title: string | null;
	availability: string | null;
	fields: ProfileDetailField[];
	player?: PlayerProfileData;
	experiences?: PublicProfileExperience[];
	qualifications?: PublicProfileExperience[];
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

function detailListField(
	label: string,
	items: string[],
	listStyle: "chips" | "rows" = "chips",
	wide = false,
): ProfileDetailField {
	return {
		label,
		value: items.join(", ") || NOT_SPECIFIED,
		items,
		listStyle,
		...(wide ? {wide: true} : {}),
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
				.select("highlights_privati, richiede_caricamento_highlights, nominativo_anonimo, id, nome, cognome, giorno_nascita, mese_nascita, anno_nascita, tipologie_sport, categoria_attuale, disponibilita, genere, nazionalita, ruoli_sport, piede_principale, altezza, peso, presentazione, storico_carriera")
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
				anonymousName: data.nominativo_anonimo,
				title: publicProfileName("giocatore", data.nominativo_anonimo, fullName(data.nome, data.cognome)),
				availability: data.disponibilita,
				fields: [],
				player: toPublicPlayerData(data, mediaResult.data?.link_media),
			},
		};
	}

	if (type === "squadra") {
		const {data, error} = await supabase
			.from("profilo_squadra")
			.select("nominativo_anonimo, id, nome_societa, sport_principale, tipologie_sport, categoria_attuale, presentazione")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				anonymousName: data.nominativo_anonimo,
				title: publicProfileName("squadra", data.nominativo_anonimo, cleanText(data.nome_societa)),
				availability: null,
				fields: [
					detailListField("Tipologia calcio", ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport))),
					detailField("Categoria attuale Prima Squadra", teamCategoryLabel(data.categoria_attuale)),
					detailField("Presentazione", data.presentazione, true),
				],
			},
		};
	}

	if (type === "staff-sportivo") {
		const {data, error} = await supabase
			.from("profilo_staff_sportivo")
			.select("nominativo_anonimo, id, nome, cognome, giorno_nascita, mese_nascita, anno_nascita, sport_principale, tipologie_sport, figure_professionali, disponibilita, disponibile_remoto, presentazione, lista_esperienze, qualifiche_licenze")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				anonymousName: data.nominativo_anonimo,
				title: publicProfileName("staff-sportivo", data.nominativo_anonimo, fullName(data.nome, data.cognome)),
				availability: data.disponibilita,
				fields: [
					detailListField("Tipologie calcio", ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport))),
					detailListField("Figure professionali", normalizeFigures(cleanStringArray(data.figure_professionali))),
					detailField("Età", (() => {
						const age = publicPlayerAge({day: data.giorno_nascita, month: data.mese_nascita, year: data.anno_nascita});
						return age === null ? null : `${age} (${data.anno_nascita})`;
					})()),
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Disponibile anche da remoto", data.disponibile_remoto ? "Sì" : "No"),
					detailField("Presentazione", data.presentazione, true),
				],
				experiences: parsePlayerCareer(data.lista_esperienze),
				qualifications: parsePlayerCareer(data.qualifiche_licenze),
			},
		};
	}

	if (type === "servizi-consulenze") {
		const {data, error} = await supabase
			.from("profilo_servizi_consulenze")
			.select("id, nome, sport_principale, tipologie_sport, disponibilita, specializzazioni, sede_professionista, presentazione, presentazione_servizi")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				title: cleanText(data.nome),
				availability: data.disponibilita,
				fields: [
					detailListField("Tipologie sportive", ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport))),
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Tipo di azienda / professione", data.specializzazioni, true),
					detailField("Sede Azienda / Professionista", data.sede_professionista),
					detailField("Presentazione", data.presentazione, true),
					detailField("Servizi offerti", data.presentazione_servizi, true),
				],
			},
		};
	}

	if (type === "arbitro") {
		const {data, error} = await supabase
			.from("profilo_arbitro")
			.select("nominativo_anonimo, id, nome, cognome, giorno_nascita, mese_nascita, anno_nascita, sport_principale, tipologie_sport, disponibilita, presentazione, lista_esperienze, qualifiche_licenze")
			.eq("uuid_profilo", id)
			.eq("nascosto", false)
			.maybeSingle();
		if (error) return contentError(error.code);
		if (!data) return {status: "not-found"};
		return {
			status: "ok",
			content: {
				childId: data.id,
				anonymousName: data.nominativo_anonimo,
				title: publicProfileName("arbitro", data.nominativo_anonimo, fullName(data.nome, data.cognome)),
				availability: data.disponibilita,
				fields: [
					detailListField("Tipologie calcio", ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport))),
					detailField("Età", (() => {
						const age = publicPlayerAge({day: data.giorno_nascita, month: data.mese_nascita, year: data.anno_nascita});
						return age === null ? null : `${age} (${data.anno_nascita})`;
					})()),
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Presentazione", data.presentazione, true),
				],
				experiences: parsePlayerCareer(data.lista_esperienze),
				qualifications: parsePlayerCareer(data.qualifiche_licenze),
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
			.select("id, nome_organizzazione, sport_principale, tipologie_sport, presentazione")
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
					detailListField("Tipologie sportive", ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport))),
					detailField("Presentazione", data.presentazione, true),
				],
			},
		};
	}

	if (type !== "campi-impianti-sportivi") return unsupportedProfileType(type);

	const {data, error} = await supabase
		.from("profilo_campi_impianti")
		.select("id, nome_organizzazione, sport_principale, tipologie_sport, indirizzo, presentazione, info_aggiuntive")
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
				detailListField("Tipologia campi disponibili", ordinaTipologieCalcio(cleanStringArray(data.tipologie_sport))),
				detailField("Indirizzo del campo", data.indirizzo),
				detailField("Presentazione", data.presentazione, true),
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
		// public allowlist. Player and referee birth-date parts are read only to
		// compute age; never return those parts, private identity, contacts or notes.
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
		const followerCountPromise = type === "giocatore" ? Promise.resolve(null) : loadProfileFollowerCount(supabase, id, type);
		const [baseResult, locationsResult, socialLinksResult, contentResult, announcementsResult, profileImages, followerCount] = await Promise.all([
			baseProfilePromise,
			locationsPromise,
			socialLinksPromise,
			contentPromise,
			announcementsPromise,
			profileImagesPromise,
			followerCountPromise,
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
		if (type === "servizi-consulenze" && locationsResult.data?.length === 0) return {status: "not-found"};

		const [similarResult] = await Promise.allSettled([loadRecentSimilarProfiles(supabase, id, type)]);
		const similarProfiles = similarResult.status === "fulfilled" ? similarResult.value : [];
		if (similarResult.status === "rejected") {
			console.error("[dettagli-profilo] Similar profiles unavailable");
		}

		const {content} = contentResult;
		const rawExperiences = type === "giocatore"
			? content.player?.career ?? []
			: [...(content.experiences ?? []), ...(content.qualifications ?? [])];
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
		const enrichedExperiences = rawExperiences.map((experience, index) => {
   const team = experience.teamProfileId ? teamProfiles.get(experience.teamProfileId) ?? null : null;
   const teamName = team?.name ?? "Squadra";
   const concealSavedName = Boolean(experience.teamProfileId && (!team || team.anonymousName));
   const teamIsTitle = type === "giocatore" || (type === "staff-sportivo" && index < (content.experiences?.length ?? 0));
   return {
    ...experience,
    title: concealSavedName && teamIsTitle ? teamName : experience.title,
    organization: concealSavedName && (!teamIsTitle || experience.organization === experience.title) ? teamName : experience.organization,
    linkedTeam: team,
   };
  });
		const typeLabel = profileTypeLabel(type);
		const locations = publicLocations(locationsResult.data ?? [], content.childId);
		const splitFields = splitProfileFields(type, content.fields);
		const common = {
			anonymousName: content.anonymousName === true,
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
			similarProfiles,
			similarProfilesUnavailable: similarResult.status === "rejected",
		};

		if (type === "giocatore") {
			if (!content.player) return {status: "error"};
			return {status: "ok", profile: {
				...common,
				type,
				player: {...content.player, career: enrichedExperiences},
				locations,
			}};
		}

		const experiences = enrichedExperiences.slice(0, content.experiences?.length ?? 0);
		const qualifications = enrichedExperiences.slice(content.experiences?.length ?? 0);
		const profile: ProfileDetail = {...common, type, followerCount, locations, ...splitFields, experiences, qualifications};
		return {status: "ok", profile};
	} catch (error) {
		console.error("[dettagli-profilo] Profile lookup unavailable", {
			message: error instanceof Error ? error.message : "Unknown error",
		});
		return {status: "error"};
	}
}
