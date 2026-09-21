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
import {normalizePlayerPrimaryRoles, normalizePlayerSpecificRoles,} from "@/features/profilo/player-roles";

type PlayerRow = Pick<Tables<"profilo_giocatore">,
	"giorno_nascita" | "mese_nascita" | "anno_nascita" | "tipologie_sport" | "ruoli_sport" |
	"categorie_ricercate" | "piede_principale" | "altezza" | "peso" | "presentazione" | "storico_carriera"
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

// Explicit public projection: birth-date parts must never leave this server module.
export function toPublicPlayerData(data: PlayerRow, highlights: unknown, now = new Date()): PlayerProfileData {
	const roles = record(data.ruoli_sport);
	const url = cleanText(highlights);
	return {
		age: publicPlayerAge({day: data.giorno_nascita, month: data.mese_nascita, year: data.anno_nascita}, now),
		sportTypes: strings(data.tipologie_sport),
		primaryRoles: normalizePlayerPrimaryRoles(strings(roles?.principali)),
		specificRoles: normalizePlayerSpecificRoles(strings(roles?.specifici)),
		preferredCategories: strings(data.categorie_ricercate),
		preferredFoot: cleanText(data.piede_principale),
		height: cleanText(data.altezza),
		weight: cleanText(data.peso),
		presentation: cleanText(data.presentazione),
		career: parsePlayerCareer(data.storico_carriera),
		highlightsUrl: url && isLinkAnnuncioValid(url) ? url : null,
	};
}
