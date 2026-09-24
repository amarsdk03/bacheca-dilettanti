import {
	BadgeEuroIcon,
	BriefcaseBusinessIcon,
	Building2Icon,
	CalendarCheckIcon,
	CalendarRangeIcon,
	CarIcon,
	CircleDollarSignIcon,
	ClapperboardIcon,
	ClockIcon,
	GraduationCapIcon,
	HeartIcon,
	type LucideIcon,
	MapPinIcon,
	TagsIcon,
	UserRoundPlusIcon,
	UserSearchIcon,
	UsersIcon,
	WrenchIcon
} from "lucide-react";
import type {AnnouncementDetail, AnnouncementFactKind} from "@/features/annunci/announcement-model";
import type {ProfileFact} from "@/features/dettagli-profilo/components/ProfileFactsGrid";
import {type AnnouncementDetailPresentation, isSpecifiedAnnouncementValue} from "./announcement-detail-presentation";

export const FACT_ICONS: Record<AnnouncementFactKind, LucideIcon> = {
	availability: CalendarCheckIcon, car: CarIcon, categories: TagsIcon, content: ClapperboardIcon,
	compensation: BadgeEuroIcon, figures: BriefcaseBusinessIcon, headquarters: Building2Icon,
	location: MapPinIcon, participation: UsersIcon, period: CalendarRangeIcon, price: CircleDollarSignIcon,
	registration: CalendarCheckIcon, roles: UserSearchIcon, season: CalendarRangeIcon, sector: Building2Icon,
	services: WrenchIcon, specializations: GraduationCapIcon, time: ClockIcon, types: TagsIcon,
};

export function getAnnouncementDetailFacts(announcement: AnnouncementDetail, presentation: AnnouncementDetailPresentation): ProfileFact[] {
	// The presentation is an explicit allowlist: long-form and supporting facts remain in the overview.
	const heroFacts = presentation.heroFactKinds.flatMap(kind =>
		announcement.facts.filter(fact => fact.kind === kind),
	);
	return [
		...heroFacts.map(fact => ({label: fact.label, icon: FACT_ICONS[fact.kind], value: isSpecifiedAnnouncementValue(fact.value) ? fact.value : null})),
		{label: "Num. salvataggi", icon: HeartIcon, value: announcement.saveCount == null ? "Non disponibile" : String(announcement.saveCount)},
		{label: "Num. follower profilo", icon: UserRoundPlusIcon, value: announcement.authorFollowerCount == null ? "Non disponibile" : String(announcement.authorFollowerCount)},
	];
}
