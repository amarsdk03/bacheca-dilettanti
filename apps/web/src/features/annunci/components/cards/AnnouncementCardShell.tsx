import type {CSSProperties} from "react";
import Link from "next/link";
import {
	ArrowUpRightIcon,
	CalendarDaysIcon,
	PinIcon,
	SparklesIcon,
} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import AnnouncementAuthorHoverCard from "@/features/annunci/AnnouncementAuthorHoverCard";
import {
	type AnnouncementFact,
	announcementOption,
} from "@/features/annunci/announcement-model";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import type {AnnouncementCardData} from "./announcement-card-model";
import {cn} from "@/lib/utils";
import {MISSING_ANNOUNCEMENT_CARD_VALUE} from "@/features/annunci/announcement-card-rows";

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "short",
	timeZone: "Europe/Rome",
	year: "numeric",
});

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

export default function AnnouncementCardShell({
	announcement,
}: {
	announcement: AnnouncementCardData;
	summary?: string;
	emptyDescription?: string;
	facts?: readonly AnnouncementFact[];
}) {
	const accent = getProfileAccent(announcement.profileType);
	const TypeIcon = announcementOption(announcement.type).icon;
	const detailHref = `/dettagli-annuncio?${new URLSearchParams({id: announcement.id}).toString()}`;
	const formattedDate = formatAnnouncementDate(announcement.createdAt);
	const style = {"--announcement-accent": accent} as CSSProperties;

	const card = (
		<Card
			className={cn(
				"group/card relative h-full gap-5 overflow-hidden font-home-body transition duration-200 focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:shadow-lg",
				announcement.isPriority && "priority-announcement priority-announcement-card",
				!announcement.isPriority && (announcement.type === "annuncio_servizi_consulenze" || announcement.type === "annuncio_creators") && "announcement-themed-card",
			)}
			style={style}
		>
			<Link
				href={detailHref}
				className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				aria-label={`Apri l’annuncio: ${announcement.title}`}
			/>
			<div aria-hidden="true" className={cn("absolute inset-x-0 top-0 z-10 h-1 bg-(--announcement-accent)", announcement.isPriority && "priority-announcement-accent")} />
			<CardHeader className="pointer-events-none relative z-10 gap-4">
				<div className={cn("flex flex-wrap items-center gap-2", announcement.isPriority && "pr-8")}>
					<Badge className={cn("border-0", announcement.isPriority && "priority-announcement-type-badge")} style={announcement.isPriority ? undefined : {backgroundColor: `${accent}18`, color: accent}}>
						<TypeIcon data-icon="inline-start" aria-hidden="true" />
						{announcement.typeLabel}
					</Badge>
					{announcement.level && <Badge variant="secondary" className={cn(announcement.isPriority && "priority-announcement-level-badge")}>
						{announcement.isPriority && <SparklesIcon data-icon="inline-start" aria-hidden="true" />}
						{humanizeValue(announcement.level)}
					</Badge>}
				</div>
				<div className="flex min-w-0 flex-col gap-2">
					<CardTitle>
						<h3 className={cn("font-home-display text-2xl uppercase wrap-anywhere", announcement.isPriority && "underline decoration-violet-400 decoration-1 underline-offset-5 decoration-wavy")}>
							{announcement.title}
						</h3>
					</CardTitle>
					<p className="text-xs font-semibold text-muted-foreground">
						{announcement.createdAt ? (
							<time dateTime={announcement.createdAt} className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<CalendarDaysIcon className="size-3.5 mb-0.5" aria-hidden="true" />
								{formattedDate}
							</time>
						) : (
							<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<CalendarDaysIcon className="size-3.5 mb-0.5" aria-hidden="true" />
								{formattedDate}
							</p>
						)}
					</p>
				</div>
			</CardHeader>
			<CardContent className="pointer-events-none relative z-10 mt-auto pt-0">
				<dl className="flex flex-col gap-2 text-sm">
					{(announcement.cardRows ?? []).map(({key,label,value}) => (
						<div key={key} className="flex min-w-0 gap-1.5">
							<dt className="shrink-0 font-semibold">{label}:</dt>
							<dd className={cn("min-w-0 line-clamp-2 wrap-anywhere", !value && "text-muted-foreground")} title={value ?? undefined}>{value ?? MISSING_ANNOUNCEMENT_CARD_VALUE}</dd>
						</div>
					))}
				</dl>
				<p className="pt-1 text-center text-muted-foreground" aria-hidden="true">...</p>
			</CardContent>
			<CardFooter className="pointer-events-none mt-auto relative z-10 justify-between gap-3">
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

	if (!announcement.isPriority) return card;
	return (
		<div className="relative h-full">
			{card}
			<PinIcon
				aria-hidden="true"
				className="pointer-events-none absolute -top-3 -right-2 sm:-top-3 sm:-right-3 z-20 size-8 sm:size-10 rotate-30 fill-violet-200"
				style={{stroke: "color-mix(in srgb, var(--brand-indigo) 85%, black)"}}
				strokeWidth={1.2}
			/>
		</div>
	);
}
