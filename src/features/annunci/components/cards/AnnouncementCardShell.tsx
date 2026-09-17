import type {CSSProperties} from "react";
import Link from "next/link";
import type {LucideIcon} from "lucide-react";
import {
	ArrowUpRightIcon,
	BadgeEuroIcon,
	BriefcaseBusinessIcon,
	Building2Icon,
	CalendarCheckIcon,
	CalendarDaysIcon,
	CalendarRangeIcon,
	CarIcon,
	CircleDollarSignIcon,
	ClapperboardIcon,
	ClockIcon,
	GraduationCapIcon,
	MapPinIcon,
	TagsIcon,
	UserSearchIcon,
	UsersIcon,
	WrenchIcon,
} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import AnnouncementAuthorHoverCard from "@/features/annunci/AnnouncementAuthorHoverCard";
import {
	announcementOption,
	type AnnouncementFact,
	type AnnouncementFactKind,
} from "@/features/annunci/announcement-model";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import type {AnnouncementCardData} from "./announcement-card-model";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "short",
	timeZone: "Europe/Rome",
	year: "numeric",
});

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

function formatAnnouncementDate(value: string | null) {
	if (!value) return "Data non disponibile";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Data non disponibile"
		: ANNOUNCEMENT_DATE_FORMATTER.format(date);
}

function humanizeValue(value: string) {
	const normalized = value.trim().replaceAll("_", " ").replaceAll("-", " ");
	return normalized
		? normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1)
		: value;
}

function AnnouncementFactGrid({facts}: {facts: readonly AnnouncementFact[]}) {
	if (facts.length === 0) {
		return <p className="rounded-xl bg-muted/55 p-3 text-sm text-muted-foreground">Informazioni non specificate.</p>;
	}

	return (
		<dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{facts.map(({kind, label, value}) => {
				const Icon = ANNOUNCEMENT_FACT_ICONS[kind];
				return (
					<div key={`${kind}:${label}`} className="min-w-0 rounded-xl bg-muted/55 p-3">
						<dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Icon className="size-3.5 shrink-0" aria-hidden="true" />
							<span className="truncate">{label}</span>
						</dt>
						<dd className="mt-1 truncate font-medium" title={value}>{value}</dd>
					</div>
				);
			})}
		</dl>
	);
}

export default function AnnouncementCardShell({
	announcement,
	summary,
	emptyDescription,
	facts,
}: {
	announcement: AnnouncementCardData;
	summary: string;
	emptyDescription: string;
	facts: readonly AnnouncementFact[];
}) {
	const accent = getProfileAccent(announcement.profileType);
	const TypeIcon = announcementOption(announcement.type).icon;
	const detailHref = `/dettagli-annuncio?${new URLSearchParams({id: announcement.id}).toString()}`;
	const formattedDate = formatAnnouncementDate(announcement.createdAt);
	const style = {"--announcement-accent": accent} as CSSProperties;

	return (
		<Card
			className="group/card relative h-full gap-5 overflow-hidden font-home-body transition duration-200 focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:shadow-lg"
			style={style}
		>
			<Link
				href={detailHref}
				className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				aria-label={`Apri l’annuncio: ${announcement.title}`}
			/>
			<div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-1 bg-[color:var(--announcement-accent)]" />
			<CardHeader className="pointer-events-none relative z-10 gap-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge className="border-0" style={{backgroundColor: `${accent}18`, color: accent}}>
						<TypeIcon data-icon="inline-start" aria-hidden="true" />
						{announcement.typeLabel}
					</Badge>
					{announcement.level && <Badge variant="secondary">{humanizeValue(announcement.level)}</Badge>}
				</div>
				<div className="flex min-w-0 flex-col gap-2">
					<CardTitle><h3 className="font-home-display text-2xl uppercase wrap-anywhere">{announcement.title}</h3></CardTitle>
					<p className="text-xs font-semibold text-muted-foreground">{summary}</p>
				</div>
				<CardDescription className="line-clamp-3 min-h-10 wrap-anywhere">
					{announcement.description ?? emptyDescription}
				</CardDescription>
			</CardHeader>
			<CardContent className="pointer-events-none relative z-10 mt-auto">
				<AnnouncementFactGrid facts={facts} />
				{(announcement.linkedTeams?.length ?? 0) > 0 && (
					<TeamProfileLinks teams={announcement.linkedTeams ?? []} limit={2} className="pointer-events-auto mt-3" />
				)}
				{announcement.createdAt ? (
					<time dateTime={announcement.createdAt} className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
						<CalendarDaysIcon className="size-3.5" aria-hidden="true" />
						{formattedDate}
					</time>
				) : (
					<p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
						<CalendarDaysIcon className="size-3.5" aria-hidden="true" />
						{formattedDate}
					</p>
				)}
			</CardContent>
			<CardFooter className="pointer-events-none relative z-10 justify-between gap-3">
				<div className="pointer-events-auto min-w-0 flex-1">
					<AnnouncementAuthorHoverCard author={announcement.author} />
				</div>
				<span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
					Apri annuncio
					<ArrowUpRightIcon className="size-5 transition-transform motion-safe:group-hover/card:-translate-y-0.5 motion-safe:group-hover/card:translate-x-0.5" aria-hidden="true" />
				</span>
			</CardFooter>
		</Card>
	);
}
