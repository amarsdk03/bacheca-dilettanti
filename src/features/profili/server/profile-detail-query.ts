import "server-only";

import type {SupabaseClient} from "@supabase/supabase-js";

import {availabilityLabel} from "@/features/profili/profile-directory-model";
import type {
	ProfileDetail,
	ProfileDetailField,
	ProfileDetailResult,
} from "@/features/profili/profile-detail-model";
import {loadPublicProfileAnnouncements} from "@/features/profili/server/profile-announcements-query";
import {
	DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import {createAdminClient} from "@/lib/supabase/admin";
import type {Database, Json} from "@/server/supabase";

const NOT_SPECIFIED = "Non specificato";

const PRIMARY_FIELD_LABELS = {
	giocatore: ["Ruoli principali", "Tipologie sportive", "Località", "Disponibilità"],
	squadra: ["Tipologie sportive", "Località", "Sede principale"],
	"staff-sportivo": ["Figure professionali", "Località", "Disponibilità"],
	"professionisti-studi": ["Figure professionali", "Specializzazioni", "Località", "Disponibilità"],
	arbitro: ["Località", "Disponibilità"],
	creators: ["Località", "Tipologia di contenuti"],
	"torneo-evento": ["Tipologie sportive", "Località", "Sede principale"],
	"campi-impianti-sportivi": ["Tipologie sportive", "Località", "Costo di partenza", "Servizi inclusi"],
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

function jsonStringArray(value: Json | null, key: string) {
	const record = value ? asJsonRecord(value) : null;
	return cleanStringArray(record?.[key]);
}

function jsonText(record: Record<string, Json | undefined>, key: string) {
	return cleanText(record[key]);
}

function formatExperiences(value: Json | null) {
	if (!Array.isArray(value)) return NOT_SPECIFIED;

	const entries = value.flatMap((entry, index): string[] => {
		const record = asJsonRecord(entry);
		if (!record) return [];

		const title = jsonText(record, "titolo");
		const organization = jsonText(record, "ente");
		const from = jsonText(record, "periodoDa");
		const to = jsonText(record, "periodoA");
		const state = jsonText(record, "stato");
		const description = jsonText(record, "descrizione");
		const hasContent = [title, organization, from, to, description]
			.some(Boolean) || state === "in-corso" || state === "conseguito";
		if (!hasContent) return [];

		const heading = [title ?? `Esperienza ${index + 1}`, organization]
			.filter(Boolean)
			.join(" · ");
		const periodEnd = to ?? (state === "in-corso" ? "in corso" : null);
		const period = from && periodEnd
			? `${from}–${periodEnd}`
			: from ?? periodEnd;
		const summary = [heading, period].filter(Boolean).join(" · ");
		const formatted = description
			? `${summary}${summary ? " — " : ""}${description}`
			: summary;

		return formatted ? [formatted] : [];
	});

	return entries.join("\n\n") || NOT_SPECIFIED;
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

function detailField(label: string, value: string | null | undefined, wide = false): ProfileDetailField {
	return {
		label,
		value: cleanText(value) ?? NOT_SPECIFIED,
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
		const {data, error} = await supabase
			.from("profilo_giocatore")
			.select("id, nome, cognome, sport_principale, tipologie_sport, categorie_ricercate, disponibilita, ruoli_sport, piede_principale, altezza, peso, presentazione, storico_carriera")
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
					detailField("Tipologie sportive", formatList(data.tipologie_sport)),
					detailField("Ruoli principali", formatList(jsonStringArray(data.ruoli_sport, "principali"))),
					detailField("Ruoli specifici", formatList(jsonStringArray(data.ruoli_sport, "specifici"))),
					detailField("Categorie ricercate", formatList(data.categorie_ricercate)),
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Piede principale", data.piede_principale),
					detailField("Altezza (cm)", data.altezza),
					detailField("Peso (kg)", data.peso),
					detailField("Presentazione", data.presentazione, true),
					detailField("Storico carriera", formatExperiences(data.storico_carriera), true),
				],
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
					detailField("Tipologie sportive", formatList(data.tipologie_sport)),
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
					detailField("Storico esperienze", formatExperiences(data.storico_esperienze), true),
				],
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
					detailField("Tipologie sportive", formatList(data.tipologie_sport)),
					detailField("Figure professionali", formatList(data.figure_professionali)),
					detailField("Disponibilità", availabilityValue(data.disponibilita)),
					detailField("Automunito", formatVehicleAvailability(data.automunito)),
					detailField("Specializzazioni", data.specializzazioni, true),
					detailField("Presentazione", data.presentazione, true),
					detailField("Servizi offerti", data.presentazione_servizi, true),
					detailField("Storico esperienze", formatExperiences(data.storico_esperienze), true),
				],
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
					detailField("Storico esperienze", formatExperiences(data.storico_esperienze), true),
				],
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
					detailField("Tipologie sportive", formatList(data.tipologie_sport)),
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
				detailField("Tipologie sportive", formatList(data.tipologie_sport)),
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

function formatLocations(locations: ProfileLocation[], childId: number) {
	const values = locations
		.filter((location) => location.id_sottoprofilo === childId)
		.map((location) => [cleanText(location.citta), cleanText(location.regione)].filter(Boolean).join(", "))
		.filter(Boolean);
	return [...new Set(values)].join("\n") || NOT_SPECIFIED;
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
		// public allowlist: never add identity, contact, notes or birth-date fields.
		const baseProfilePromise = supabase
			.from("profilo")
			.select("uuid, link_foto_profilo, verificato_il, tipologia_principale")
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
		const contentPromise = loadProfileContent(supabase, id, type);
		const announcementsPromise = loadPublicProfileAnnouncements(supabase, id, type);
		const [baseResult, locationsResult, contentResult, announcementsResult] = await Promise.all([
			baseProfilePromise,
			locationsPromise,
			contentPromise,
			announcementsPromise,
		]);

		if (baseResult.error || locationsResult.error || contentResult.status === "error") {
			console.error("[dettagli-profilo] Profile lookup failed", {
				baseCode: baseResult.error?.code,
				locationsCode: locationsResult.error?.code,
				contentCode: contentResult.status === "error" ? contentResult.code : undefined,
			});
			return {status: "error"};
		}

		if (!baseResult.data || contentResult.status === "not-found") {
			return {status: "not-found"};
		}

		const {content} = contentResult;
		const typeLabel = profileTypeLabel(type);
		const locationField = detailField(
			"Località",
			formatLocations(locationsResult.data ?? [], content.childId),
			true,
		);
		const [firstField, ...remainingFields] = content.fields;
		const fields = firstField
			? [firstField, locationField, ...remainingFields]
			: [locationField];
		const splitFields = splitProfileFields(type, fields);
		const profile: ProfileDetail = {
			id: baseResult.data.uuid,
			type,
			title: content.title ?? `Profilo ${typeLabel.toLocaleLowerCase("it-IT")}`,
			imageUrl: cleanText(baseResult.data.link_foto_profilo),
			verified: Boolean(baseResult.data.verificato_il),
			primary: baseResult.data.tipologia_principale === type,
			availabilityLabel: availabilityLabel(content.availability),
			primaryFields: splitFields.primaryFields,
			fields: splitFields.fields,
			announcements: announcementsResult.announcements,
			announcementsUnavailable: announcementsResult.unavailable,
		};

		return {status: "ok", profile};
	} catch (error) {
		console.error("[dettagli-profilo] Profile lookup unavailable", {
			message: error instanceof Error ? error.message : "Unknown error",
		});
		return {status: "error"};
	}
}
