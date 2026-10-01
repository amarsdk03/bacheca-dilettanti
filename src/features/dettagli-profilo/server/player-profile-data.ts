import "server-only";

import {
	type BirthDateValue,
	birthMonthNumber,
	getItalyDateParts,
	isCompleteValidBirthDate
} from "@/features/profilo/birth-date";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/announcementExtras";
import type {Tables} from "@/server/supabase";
import type {PlayerCareerEntry, PlayerProfileData} from "../profile-detail-model";
import {UUID_PATTERN} from "@/features/profilo/team-profile";
import {ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {normalizePlayerPrimaryRoles, normalizePlayerSpecificRoles,} from "@/features/profilo/player-roles";
import {categoryLabel, normalizeCategories} from "@/features/pubblica-annuncio/types/category-catalog";
import {nationalityLabel} from "@/features/profilo/player-nationalities";

type PlayerRow = Pick<Tables<"profilo_giocatore">,
	"giorno_nascita" | "mese_nascita" | "anno_nascita" | "tipologie_sport" | "ruoli_sport" |
	"categoria_attuale" | "categorie_ricercate" | "piede_principale" | "genere" | "nazionalita" | "altezza" | "peso" | "presentazione" | "storico_carriera"
>;

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function record(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown> : null;
}

function strings(value: unknown): string[] {
	return Array.isArray(value)
		? [...new Set(value.map(cleanText).filter((item): item is string => item !== null))]
		: [];
}

export function publicPlayerAge(birth: BirthDateValue, now = new Date()): number | null {
	if (!isCompleteValidBirthDate(birth, now)) return null;
	const today = getItalyDateParts(now);
	const month = birthMonthNumber(birth.month)!;
	const birthdayPending = today.month < month || (today.month === month && today.day < Number(birth.day));
	return today.year - Number(birth.year) - Number(birthdayPending);
}

export function parsePlayerCareer(value: unknown): PlayerCareerEntry[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item, index): PlayerCareerEntry[] => {
		const entry = record(item);
		if (!entry) return [];
		const title = cleanText(entry.titolo);
		const organization = cleanText(entry.ente);
		const from = cleanText(entry.periodoDa);
		const to = cleanText(entry.periodoA);
		const description = cleanText(entry.descrizione);
		const storedId = cleanText(entry.id);
		const teamProfileId = cleanText(entry.squadraProfiloId)?.toLocaleLowerCase("en-US") ?? null;
		const status = entry.stato === "in-corso" || entry.stato === "conseguito" ? entry.stato : null;
		if (![title, organization, from, to, description, status].some(Boolean)) return [];
		return [{
			id: storedId ?? `career-${index}`,
			title: title ?? `Esperienza ${index + 1}`,
			organization,
			from,
			to,
			status,
			description,
			teamProfileId: teamProfileId && UUID_PATTERN.test(teamProfileId) ? teamProfileId : null,
			linkedTeam: null,
		}];
	});
}

export function parseLegacyStaffQualifications(value: unknown): PlayerCareerEntry[] {
	if (!Array.isArray(value)) return [];
	return value.map((item, index) => {
		const parsed = parsePlayerCareer([item])[0];
		const entry = record(item);
		const extra = entry ? Object.entries(entry)
			.filter(([key, field]) => !["id", "titolo", "ente", "periodoDa", "periodoA", "descrizione", "squadraProfiloId"].includes(key) && !(key === "stato" && ["in-corso", "conseguito", "non-specificare"].includes(String(field))))
			.map(([key, field]) => `${key}: ${typeof field === "string" ? field : JSON.stringify(field)}`)
			.join("\n") : typeof item === "string" ? item : JSON.stringify(item);
		return {
			id: cleanText(entry?.id) ?? `staff-legacy-${index}`,
			title: parsed?.title ?? `Qualifica / Licenza ${index + 1}`,
			organization: parsed?.organization ?? null,
			from: parsed?.from ?? null,
			to: parsed?.to ?? null,
			status: parsed?.status ?? null,
			description: [parsed?.description, extra].filter(Boolean).join("\n") || null,
			teamProfileId: parsed?.teamProfileId ?? null,
			linkedTeam: null,
		};
	});
}

// Explicit public projection: birth-date parts must never leave this server module.
export function toPublicPlayerData(data: PlayerRow, highlights: unknown, now = new Date()): PlayerProfileData {
	const roles = record(data.ruoli_sport);
	const url = cleanText(highlights);
	const category = cleanText(data.categoria_attuale);
	const nationality = nationalityLabel(data.nazionalita);
	const age = publicPlayerAge({day: data.giorno_nascita, month: data.mese_nascita, year: data.anno_nascita}, now);
	return {
		age,
		birthYear: age === null ? null : cleanText(data.anno_nascita),
		sportTypes: ordinaTipologieCalcio(strings(data.tipologie_sport)),
		primaryRoles: normalizePlayerPrimaryRoles(strings(roles?.principali)),
		specificRoles: normalizePlayerSpecificRoles(strings(roles?.specifici)),
		currentCategory: category ? categoryLabel(category) : null,
		preferredCategories: normalizeCategories(strings(data.categorie_ricercate)).map(categoryLabel),
		preferredFoot: data.piede_principale === "Ambipiede" ? "Ambidestro" : cleanText(data.piede_principale),
		gender: cleanText(data.genere),
		nationality,
		nationalityCode: nationality ? cleanText(data.nazionalita) : null,
		height: cleanText(data.altezza),
		weight: cleanText(data.peso),
		presentation: cleanText(data.presentazione),
		career: parsePlayerCareer(data.storico_carriera),
		highlightsUrl: url && isLinkAnnuncioValid(url) ? url : null,
	};
}
