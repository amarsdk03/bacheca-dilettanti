import type {
	DirectoryProfile,
	DirectoryProfileFact,
	DirectoryProfileFactKind,
} from "../../profile-directory-model";
import type {ProfileType} from "@/features/profilo/profile-model";

export type ProfileCardData<Type extends ProfileType = ProfileType> = Pick<DirectoryProfile,
	"id" | "title" | "presentation" | "imageUrl" | "verified" | "facts"
> & {type: Type};

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
		verified: profile.verified,
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
