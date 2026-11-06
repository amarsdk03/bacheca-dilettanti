import {sortExperiencesNewestFirst} from "@/features/profilo/experience-order";
import type {AnnouncementAuthorProfileData} from "./announcement-model";
import type {ProfileType} from "@/features/profilo/profile-model";
import type {PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import {currentCategoryLabel, currentPlayerCareer} from "@/features/profilo/current-team";
import {normalizePlayerPrimaryRoles} from "@/features/profilo/player-roles";
import {availabilityLabel} from "@/features/profilo/public-profile-display";
import {normalizeFigures} from "@/features/pubblica-annuncio/types/category-catalog";
import {ordinaTipologieCalcio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const strings = (value: unknown) => [...new Set((Array.isArray(value) ? value : []).map(text).filter((item): item is string => Boolean(item)))];

/** Explicit public allowlist: never pass a full profile draft to a summary component. */
export function projectAnnouncementSummaryProfile(type: ProfileType, child: Record<string, unknown>, locations: PublicProfileLocation[], career = type === "giocatore" ? currentPlayerCareer(child) : []): AnnouncementAuthorProfileData {
	const roles = child.ruoli_sport && typeof child.ruoli_sport === "object" ? child.ruoli_sport as Record<string, unknown> : {};
	const birthYear = text(child.anno_nascita);
	const previousCareer = sortExperiencesNewestFirst(career).flatMap(entry => {
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
		const item = entry as Record<string, unknown>;
		const category = text(item.ente), team = text(item.titolo), from = text(item.periodoDa), to = text(item.periodoA);
		const period = from ? `Dal ${from}${to === "oggi" ? " ad oggi" : to ? ` al ${to}` : ""}` : to === "oggi" ? "Ad oggi" : to ? `Al ${to}` : null;
		return category || team || period ? [{category, team, period}] : [];
	});
	return {
		age: null,
		birthYear: type === "giocatore" && birthYear && /^\d{4}$/.test(birthYear) && Number(birthYear) >= 1900 && Number(birthYear) <= new Date().getFullYear() ? birthYear : null,
		sportTypes: ordinaTipologieCalcio(strings(child.tipologie_sport)),
		primaryRoles: type === "giocatore" ? normalizePlayerPrimaryRoles(strings(roles.principali)) : [],
		currentCategory: type === "squadra" ? currentCategoryLabel(text(child.categoria_attuale), text(child.torneo_attuale_nome)) : null,
		previousCategories: [...new Set(previousCareer.flatMap(row => row.category ? [row.category] : []))], previousCareer,
		figures: normalizeFigures(strings(child.figure_professionali)),
		companyType: text(child.specializzazioni), headquarters: text(child.sede_professionista), availabilityLabel: availabilityLabel(text(child.disponibilita)),
		contentTypes: strings(Array.isArray(child.tipologia_contenuti) ? child.tipologia_contenuti : [child.tipologia_contenuti]),
		locations,
	};
}
