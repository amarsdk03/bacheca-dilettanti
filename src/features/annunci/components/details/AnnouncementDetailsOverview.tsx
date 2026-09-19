import type {LucideIcon} from "lucide-react";
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
	InfoIcon,
	MapPinIcon,
	TagsIcon,
	UserSearchIcon,
	UsersIcon,
	WrenchIcon,
} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import type {
	AnnouncementDetail,
	AnnouncementDetailField,
	AnnouncementFact,
	AnnouncementFactKind,
} from "@/features/annunci/announcement-model";
import {cn} from "@/lib/utils";
import {type AnnouncementDetailPresentation, isSpecifiedAnnouncementValue,} from "./announcement-detail-presentation";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";

const ANNOUNCEMENT_FACT_ICONS: Record<AnnouncementFactKind, LucideIcon> = {
	availability: CalendarCheckIcon,
	car: CarIcon,
	categories: TagsIcon,
	content: ClapperboardIcon,
	compensation: BadgeEuroIcon,
	figures: BriefcaseBusinessIcon,
	headquarters: Building2Icon,
	location: MapPinIcon,
	participation: UsersIcon,
	period: CalendarRangeIcon,
	price: CircleDollarSignIcon,
	registration: CalendarCheckIcon,
	roles: UserSearchIcon,
	season: CalendarRangeIcon,
	sector: Building2Icon,
	services: WrenchIcon,
	specializations: GraduationCapIcon,
	time: ClockIcon,
	types: TagsIcon,
};

function orderedFacts(
	facts: readonly AnnouncementFact[],
	presentation: AnnouncementDetailPresentation,
) {
	const specifiedFacts = facts.filter((fact) => isSpecifiedAnnouncementValue(fact.value));
	const prioritized = presentation.primaryFactKinds.flatMap((kind) =>
		specifiedFacts.filter((fact) => fact.kind === kind),
	);
	const remaining = specifiedFacts.filter((fact) => !presentation.primaryFactKinds.includes(fact.kind));
	return [...prioritized, ...remaining];
}

function AnnouncementFactGrid({facts}: {facts: readonly AnnouncementFact[]}) {
	if (facts.length === 0) return null;

	return (
		<dl className={cn("grid gap-3 sm:grid-cols-2", facts.length > 2 && "xl:grid-cols-3")}>
			{facts.map((fact, index) => {
				const Icon = ANNOUNCEMENT_FACT_ICONS[fact.kind];
				return (
					<div key={`${fact.kind}:${fact.label}:${index}`} className="min-w-0 rounded-xl bg-muted/55 p-4">
						<dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
							<Icon className="size-4 shrink-0" aria-hidden="true" />
							<span className="truncate">{fact.label}</span>
						</dt>
						<dd className="mt-1.5 wrap-anywhere text-base font-semibold" title={fact.value}>{fact.value}</dd>
					</div>
				);
			})}
		</dl>
	);
}

function AnnouncementFieldGrid({fields}: {fields: readonly AnnouncementDetailField[]}) {
	if (fields.length === 0) return null;

	return (
		<dl className="grid gap-3 sm:grid-cols-2">
			{fields.map((field, index) => (
				<div
					key={`${field.label}:${index}`}
					className={cn(
						"min-w-0 rounded-xl border bg-background/60 p-4",
						field.wide && "sm:col-span-2",
					)}
				>
					<dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
					<dd className="mt-1.5 whitespace-pre-wrap wrap-anywhere font-medium">{field.value}</dd>
				</div>
			))}
		</dl>
	);
}

export default function AnnouncementDetailsOverview({
	announcement,
	presentation,
}: {
	announcement: AnnouncementDetail;
	presentation: AnnouncementDetailPresentation;
}) {
	const facts = orderedFacts(announcement.facts, presentation);
	const fields = announcement.fields.filter((field) =>
		presentation.detailFieldLabels.includes(field.label)
		&& isSpecifiedAnnouncementValue(field.value)
		&& field.value !== announcement.description,
	);

	return (
		<section aria-label="Informazioni dell’annuncio" className="flex min-w-0 flex-col gap-5">
			<Card>
				<CardHeader>
					<CardTitle><h2 className="font-home-display text-2xl uppercase">{presentation.narrativeTitle}</h2></CardTitle>
					<CardDescription>{presentation.summary}</CardDescription>
				</CardHeader>
				<CardContent>
					{announcement.description ? (
						<p className="leading-7 whitespace-pre-wrap wrap-anywhere">{announcement.description}</p>
					) : (
						<div className="flex items-center gap-3 text-muted-foreground">
							<InfoIcon className="size-5 shrink-0" aria-hidden="true" />
							<p>{presentation.emptyNarrative}</p>
						</div>
					)}
				</CardContent>
			</Card>

			{facts.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle><h2 className="font-home-display text-2xl uppercase">In evidenza</h2></CardTitle>
						<CardDescription>{presentation.summary}</CardDescription>
					</CardHeader>
					<CardContent><AnnouncementFactGrid facts={facts} /></CardContent>
				</Card>
			)}

			{(announcement.linkedTeams?.length ?? 0) > 0 && (
				<Card>
					<CardHeader>
						<CardTitle><h2 className="font-home-display text-2xl uppercase">Squadre collegate</h2></CardTitle>
						<CardDescription>Società indicate nelle esperienze dell’autore.</CardDescription>
					</CardHeader>
					<CardContent><TeamProfileLinks teams={announcement.linkedTeams ?? []} /></CardContent>
				</Card>
			)}

			{fields.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle><h2 className="font-home-display text-2xl uppercase">{presentation.detailsTitle}</h2></CardTitle>
						<CardDescription>Le informazioni pubblicate dall’autore.</CardDescription>
					</CardHeader>
					<CardContent><AnnouncementFieldGrid fields={fields} /></CardContent>
				</Card>
			)}
		</section>
	);
}
