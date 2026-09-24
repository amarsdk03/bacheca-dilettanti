import type {DirectoryProfile, DirectoryProfileFact, DirectoryProfileFactKind,} from "../../profile-directory-model";
import type {ProfileType} from "@/features/profilo/profile-model";

export type ProfileCardData<Type extends ProfileType = ProfileType> = Pick<DirectoryProfile,
	"id" | "title" | "presentation" | "imageUrl" | "emailConfirmed" | "officialVerified" | "facts"
> & {type: Type; summary?: string};

export type PlayerCardData = ProfileCardData<"giocatore"> & {
	roles: string[];
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
	};
}

function isSpecifiedFact(fact: DirectoryProfileFact | undefined): fact is DirectoryProfileFact {
	return Boolean(fact && fact.value.trim() && fact.value !== "Non specificato");
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
	profile: Pick<DirectoryProfile, "facts">,
	kinds: readonly DirectoryProfileFactKind[],
) {
	return kinds
		.map((kind) => getProfileFact(profile, kind))
		.filter(isSpecifiedFact);
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
