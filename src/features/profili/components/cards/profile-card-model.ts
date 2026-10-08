import type {DirectoryProfile, DirectoryProfileFact, DirectoryProfileFactKind,} from "../../profile-directory-model";
import type {ProfileType} from "@/features/profilo/profile-model";

export type ProfileCardData<Type extends ProfileType = ProfileType> = Pick<DirectoryProfile,
	"id" | "title" | "presentation" | "imageUrl" | "emailConfirmed" | "officialVerified" | "facts"
> & {type: Type; summary?: string};

export type PlayerCardData = ProfileCardData<"giocatore"> & {
	roles: string[];
	nationalityCode?: string | null;
};

export type ProfileCardFact = DirectoryProfileFact & {unspecified: boolean};

type CardFactDefinition = {kind: DirectoryProfileFactKind; label: string; emptyValue: string};
const location: CardFactDefinition = {kind: "location", label: "Località", emptyValue: "Non specificata"};
const availability: CardFactDefinition = {kind: "availability", label: "Disponibilità", emptyValue: "Non specificata"};
const types: CardFactDefinition = {kind: "types", label: "Tipologie", emptyValue: "Non specificate"};

export const PROFILE_CARD_FACTS: Record<ProfileType, readonly CardFactDefinition[]> = {
	giocatore: [
		{kind: "age", label: "Età", emptyValue: "Non specificata"},
		{kind: "gender", label: "Genere", emptyValue: "Non specificato"},
		availability,
		{kind: "category", label: "Categoria attuale", emptyValue: "Non specificata"},
	],
	squadra: [types, {kind: "category", label: "Categoria attuale Prima Squadra", emptyValue: "Non specificata"}, location],
	"staff-sportivo": [{kind: "figures", label: "Figure", emptyValue: "Non specificate"}, availability, location],
	arbitro: [availability, location],
	"torneo-evento": [types, location],
	"campi-impianti-sportivi": [{...types, label: "Tipologia campi disponibili", emptyValue: "Non specificata"}, location],
	"servizi-consulenze": [{kind: "specializations", label: "Tipo di azienda / professione", emptyValue: "Non specificato"}, availability, location],
	creators: [{kind: "content", label: "Contenuti", emptyValue: "Non specificati"}, location],
};

export function toPlayerCardData(profile: DirectoryProfile): PlayerCardData {
	return {
		id: profile.id,
		type: "giocatore",
		title: profile.title,
		presentation: profile.presentation,
		imageUrl: profile.imageUrl,
		emailConfirmed: profile.emailConfirmed,
		officialVerified: profile.officialVerified,
		facts: profile.facts,
		roles: profile.filterData.ruoli,
		nationalityCode: profile.nationalityCode ?? null,
	};
}

function isSpecifiedFact(fact: DirectoryProfileFact | undefined): fact is DirectoryProfileFact {
	const value = typeof fact?.value === "string" ? fact.value.trim() : "";
	return Boolean(value && !/^non specificat[oaie]$/i.test(value));
}

export function getProfileFact(
	profile: Pick<DirectoryProfile, "facts">,
	kind: DirectoryProfileFactKind,
) {
	return profile.facts.find((fact) => fact.kind === kind);
}

export function getProfileFactValue(
	profile: Pick<DirectoryProfile, "facts">,
	kind: DirectoryProfileFactKind,
) {
	const fact = getProfileFact(profile, kind);
	return isSpecifiedFact(fact) ? fact.value : null;
}

export function getProfileFacts(
	profile: Pick<DirectoryProfile, "type" | "facts">,
): ProfileCardFact[] {
	return PROFILE_CARD_FACTS[profile.type].map(({kind, label, emptyValue}) => {
		const fact = getProfileFact(profile, kind);
		const unspecified = !isSpecifiedFact(fact);
		return {kind, label, value: !unspecified && fact ? fact.value.trim() : emptyValue, unspecified};
	});
}

export function summarizeProfileValues(values: readonly string[], fallback: string) {
	const summary = values.map((value) => value.trim()).filter(Boolean).join(" · ");
	return summary || fallback;
}

export function summarizeStaffFigures(values: readonly string[], fallback: string) {
	const figures = values.map((value) => value.trim()).filter(Boolean);
	if (figures.length === 0) return fallback;

	const visibleFigures = figures.slice(0, 2);
	const remainingCount = figures.length - visibleFigures.length;
	return remainingCount > 0
		? `${visibleFigures.join(" · ")}... +${remainingCount}`
		: visibleFigures.join(" · ");
}
