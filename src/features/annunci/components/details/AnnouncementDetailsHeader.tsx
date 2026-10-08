import type {ReactNode} from "react";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import {announcementAuthorBadges} from "@/features/annunci/announcement-detail-sections";
import {profileInitials} from "@/features/profilo/public-profile-display";
import {OfficialVerificationIcon} from "@/features/profilo/ProfileVerificationStatus";
import {cn} from "@/lib/utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome"});

export default function AnnouncementDetailsHeader({announcement, actions}: {
	announcement: AnnouncementDetail;
	actions?: ReactNode;
}) {
	const {author} = announcement;
	const name = author.kind === "registered" ? author.title : announcement.anonymousAuthorInfo?.name ?? author.label;
	const image = author.kind === "registered" ? author.imageUrl : null;
	const badges = announcementAuthorBadges(announcement.type, announcement.authorProfile, announcement.sections);
	const date = announcement.createdAt ? new Date(announcement.createdAt) : null;
	const validDate = date && !Number.isNaN(date.getTime());
	return <header aria-labelledby="announcement-detail-title">
		<Card className={cn("public-profile-hero gap-5 rounded-2xl [--card-spacing:--spacing(5)] sm:gap-6 sm:[--card-spacing:--spacing(6)]", announcement.isPriority && "priority-announcement priority-announcement-header")}>
			<CardHeader className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-6">
					<h1 id="announcement-detail-title" className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">{announcement.title}</h1>
					<div className="flex min-w-0 items-center gap-4">
						<Avatar className="size-16 shrink-0 ring-2 ring-border sm:size-20">
							{image && <AvatarImage src={image} alt={`Foto profilo di ${name}`} />}
							<AvatarFallback><span className="font-home-display text-2xl">{profileInitials(name)}</span></AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<p className="font-home-display text-2xl leading-tight font-medium uppercase wrap-anywhere sm:text-3xl lg:text-4xl">
								{name} <OfficialVerificationIcon officialVerified={author.kind === "registered" && author.officialVerified} className="size-5 align-[0.16em]" />
							</p>
							{badges.length > 0 && <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Caratteristiche del profilo autore">
								{badges.map(badge => <Badge key={badge.label} variant="default" title={badge.title} className="h-auto max-w-full whitespace-normal wrap-anywhere">{badge.label}</Badge>)}
							</div>}
						</div>
					</div>
				</div>
				{actions && <div className="w-full min-w-0 xl:w-auto xl:shrink-0 xl:mt-4.5">{actions}</div>}
			</CardHeader>
			<CardContent><p className="text-xs text-muted-foreground">Pubblicato il: {validDate ? <time dateTime={announcement.createdAt!}>{DATE_FORMATTER.format(date)}</time> : "Data non disponibile"}</p></CardContent>
		</Card>
	</header>;
}
