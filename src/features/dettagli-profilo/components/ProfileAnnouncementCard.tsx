import type {CSSProperties} from "react";
import Link from "next/link";
import {ArrowUpRightIcon, CalendarDaysIcon, MapPinIcon, SparklesIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {announcementOption, type AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import {FACT_ICONS} from "@/features/annunci/components/details/announcement-detail-facts";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";
import {cn} from "@/lib/utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome",
});

function formatDate(value: string | null) {
	if (!value) return "Data non disponibile";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "Data non disponibile" : DATE_FORMATTER.format(date);
}

export default function ProfileAnnouncementCard({announcement}: {announcement: AnnouncementDirectoryItem}) {
	const accent = getProfileAccent(announcement.profileType);
	const TypeIcon = announcementOption(announcement.type).icon;
	const detailHref = `/dettagli-annuncio?${new URLSearchParams({id: announcement.id})}`;
	const facts = announcement.facts
		.filter(fact => fact.kind !== "location" && fact.value.trim() && fact.value !== "Non specificato")
		.slice(0, 3);
	const style = {"--announcement-accent": accent} as CSSProperties;

	return <Card
		size="sm"
		className={cn(
			"group/card relative h-full gap-4 overflow-hidden rounded-2xl font-home-body transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-3 focus-within:ring-ring/50",
			announcement.isPriority && "priority-announcement priority-announcement-card",
		)}
		style={style}
	>
		<Link href={detailHref} aria-label={`Apri l’annuncio: ${announcement.title}`} className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
		<span className={cn("absolute inset-x-0 top-0 z-10 h-1 bg-(--announcement-accent)", announcement.isPriority && "priority-announcement-accent")} aria-hidden="true" />
		<CardHeader className="pointer-events-none relative z-10 gap-3 pt-5">
			<div className="flex flex-wrap items-center gap-2">
				<Badge className={cn("border-0", announcement.isPriority && "priority-announcement-type-badge")} style={announcement.isPriority ? undefined : {backgroundColor: `${accent}18`, color: accent}}>
					<TypeIcon data-icon="inline-start" aria-hidden="true" />{announcement.typeLabel}
				</Badge>
				{announcement.level && <Badge variant="secondary" className={cn(announcement.isPriority && "priority-announcement-level-badge")}>
					{announcement.isPriority && <SparklesIcon data-icon="inline-start" aria-hidden="true" />}
					{announcement.isPriority ? "Prioritario" : "Gratuito"}
				</Badge>}
			</div>
			<CardTitle><h3 className="font-home-display text-2xl uppercase wrap-anywhere">{announcement.title}</h3></CardTitle>
			<CardDescription className="line-clamp-3 wrap-anywhere">{announcement.description ?? "Descrizione non disponibile"}</CardDescription>
		</CardHeader>
		<CardContent className="pointer-events-none relative z-10 mt-auto flex flex-col gap-4">
			{facts.length > 0 && <dl className="grid gap-2 sm:grid-cols-2">
				{facts.map(fact => {
					const Icon = FACT_ICONS[fact.kind];
					return <div key={`${fact.kind}-${fact.label}`} className="min-w-0 rounded-xl border border-border bg-muted/35 px-3 py-2.5">
						<dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-4 shrink-0" aria-hidden="true" />{fact.label}</dt>
						<dd className="mt-1 line-clamp-2 text-sm font-medium leading-5 wrap-anywhere">{fact.value}</dd>
					</div>;
				})}
			</dl>}
			{announcement.linkedTeams.length > 0 && <TeamProfileLinks teams={announcement.linkedTeams} limit={2} className="pointer-events-auto" />}
			<p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPinIcon className="mt-0.5 size-4 shrink-0 text-(--announcement-accent)" aria-hidden="true" /><span className="wrap-anywhere">{announcement.location}</span></p>
		</CardContent>
		<CardFooter className="pointer-events-none relative z-10 flex-wrap justify-between gap-2 text-xs text-muted-foreground">
			<time dateTime={announcement.createdAt ?? undefined} className="inline-flex items-center gap-1.5"><CalendarDaysIcon className="size-3.5" aria-hidden="true" />{formatDate(announcement.createdAt)}</time>
			<span className="inline-flex items-center gap-1 font-semibold text-foreground">Apri annuncio<ArrowUpRightIcon className="size-4" aria-hidden="true" /></span>
		</CardFooter>
	</Card>;
}
