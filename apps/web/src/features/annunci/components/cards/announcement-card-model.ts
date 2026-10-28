import type {
	AnnouncementDirectoryItem,
	AnnouncementFact,
	AnnouncementType,
} from "@/features/annunci/announcement-model";

export type AnnouncementCardData<Type extends AnnouncementType = AnnouncementType> = Omit<
	AnnouncementDirectoryItem,
	"type"
> & {
	type: Type;
};

function isSpecifiedFact(fact: AnnouncementFact | undefined): fact is AnnouncementFact {
	return Boolean(fact && fact.value.trim() && fact.value.trim() !== "Non specificato");
}

export function getAnnouncementFact(
	announcement: Pick<AnnouncementDirectoryItem, "facts">,
	label: string,
) {
	return announcement.facts.find((fact) => fact.label === label);
}

export function getAnnouncementFacts(
	announcement: Pick<AnnouncementDirectoryItem, "facts">,
	labels: readonly string[],
) {
	return labels
		.map((label) => getAnnouncementFact(announcement, label))
		.filter(isSpecifiedFact);
}
