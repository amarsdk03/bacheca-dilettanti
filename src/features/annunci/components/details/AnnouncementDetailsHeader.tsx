import type {ReactNode} from "react";
import {CalendarDaysIcon, SparklesIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import AnnouncementAuthorHoverCard from "@/features/annunci/AnnouncementAuthorHoverCard";
import {type AnnouncementDetail, announcementOption} from "@/features/annunci/announcement-model";
import ProfileFactsGrid from "@/features/dettagli-profilo/components/ProfileFactsGrid";
import {getAnnouncementDetailFacts} from "./announcement-detail-facts";
import type {AnnouncementDetailPresentation} from "./announcement-detail-presentation";
import {cn} from "@/lib/utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome"});

export default function AnnouncementDetailsHeader({announcement, presentation, actions}: {
	announcement: AnnouncementDetail;
	presentation: AnnouncementDetailPresentation;
	actions?: ReactNode;
}) {
	const TypeIcon = announcementOption(announcement.type).icon;
	const date = announcement.createdAt ? new Date(announcement.createdAt) : null;
	const validDate = date && !Number.isNaN(date.getTime());
	const level = announcement.level?.trim().replaceAll("_", " ").replaceAll("-", " ");

	return (
		<header aria-labelledby="announcement-detail-title">
			<Card className={cn("public-profile-hero gap-5 rounded-2xl [--card-spacing:--spacing(5)] sm:gap-6 sm:[--card-spacing:--spacing(6)]", announcement.isPriority && "priority-announcement priority-announcement-header")}>
				<CardHeader className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<h1 id="announcement-detail-title" className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">{announcement.title}</h1>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" className="public-profile-type-badge"><TypeIcon data-icon="inline-start" aria-hidden="true" />{announcement.typeLabel}</Badge>
							{level && <Badge variant="outline" className={cn(announcement.isPriority && "priority-announcement-level-badge")}>
								{announcement.isPriority && <SparklesIcon data-icon="inline-start" aria-hidden="true" />}
								{level.charAt(0).toLocaleUpperCase("it-IT") + level.slice(1)}
							</Badge>}
						</div>
						<div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
							<div className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">{announcement.moderationStatus === "pubblicato" ? "Pubblicato da" : "Inserito da"}</span><AnnouncementAuthorHoverCard author={announcement.author} /></div>
							<div className="flex items-center gap-2 text-muted-foreground"><CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />{validDate ? <time dateTime={announcement.createdAt!}>{DATE_FORMATTER.format(date)}</time> : "Data non disponibile"}</div>
						</div>
					</div>
					{actions && <div className="w-full min-w-0 xl:w-auto xl:shrink-0">{actions}</div>}
				</CardHeader>
				<CardContent><ProfileFactsGrid facts={getAnnouncementDetailFacts(announcement, presentation)} layout="balanced" /></CardContent>
			</Card>
		</header>
	);
}
