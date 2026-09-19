import type {CSSProperties} from "react";
import {CalendarDaysIcon, MapPinIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import AnnouncementAuthorHoverCard from "@/features/annunci/AnnouncementAuthorHoverCard";
import {
	type AnnouncementDetail,
	announcementOption,
	type AnnouncementPlayerRoles,
} from "@/features/annunci/announcement-model";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import AnnouncementPlayerRolePitch from "./AnnouncementPlayerRolePitch";
import type {AnnouncementDetailPresentation} from "./announcement-detail-presentation";

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "long",
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

function humanizeLevel(value: string) {
	const normalized = value.trim().replaceAll("_", " ").replaceAll("-", " ");
	return normalized
		? normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1)
		: value;
}

export default function AnnouncementDetailsHeader({
	announcement,
	presentation,
	playerRoles,
}: {
	announcement: AnnouncementDetail;
	presentation: AnnouncementDetailPresentation;
	playerRoles?: AnnouncementPlayerRoles;
}) {
	const option = announcementOption(announcement.type);
	const TypeIcon = option.icon;
	const accent = getProfileAccent(announcement.profileType);
	const headerStyle = {"--announcement-accent": accent} as CSSProperties;
	const formattedDate = formatAnnouncementDate(announcement.createdAt);

	return (
		<header
			className="relative isolate overflow-hidden rounded-2xl border bg-card p-5 sm:p-8"
			style={{...headerStyle, borderColor: `color-mix(in oklab, ${accent} 28%, transparent)`}}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-[color:var(--announcement-accent)]/15 via-[color:var(--announcement-accent)]/5 to-transparent"
			/>
			<div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:gap-8">
				<div className="flex min-w-0 flex-1 flex-col gap-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" style={{borderColor: accent, color: accent}}>
							<TypeIcon data-icon="inline-start" aria-hidden="true" />
							{announcement.typeLabel}
						</Badge>
						{announcement.level && <Badge variant="secondary">{humanizeLevel(announcement.level)}</Badge>}
					</div>
					<h1 id="announcement-detail-title" className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">
						{announcement.title}
					</h1>
					<p className="text-base text-muted-foreground sm:text-lg">{presentation.intro}</p>
					<div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
						<p className="flex items-center gap-2">
							<MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
							<span>{announcement.location}</span>
						</p>
						{announcement.createdAt ? (
							<time dateTime={announcement.createdAt} className="flex items-center gap-2">
								<CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
								{formattedDate}
							</time>
						) : (
							<p className="flex items-center gap-2">
								<CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
								{formattedDate}
							</p>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<span className="text-muted-foreground">Pubblicato da</span>
						<AnnouncementAuthorHoverCard author={announcement.author} />
					</div>
				</div>
				{playerRoles && (
					<AnnouncementPlayerRolePitch
						primaryRoles={playerRoles.primaryRoles}
						secondaryRoles={playerRoles.secondaryRoles}
					/>
				)}
			</div>
		</header>
	);
}
