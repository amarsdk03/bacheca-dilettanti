import type {CSSProperties} from "react";
import Link from "next/link";
import {
	BadgeCheckIcon,
	BriefcaseBusinessIcon,
	CalendarCheckIcon,
	ClapperboardIcon,
	ListChecksIcon,
	MapPinIcon,
	TagsIcon,
	UsersIcon,
} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {HoverCard, HoverCardContent, HoverCardTrigger,} from "@/components/ui/hover-card";
import {ScrollArea} from "@/components/ui/scroll-area";
import type {AnnouncementAuthor, AnnouncementFactKind} from "@/features/annunci/announcement-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {groupPublicProfileLocations, type PublicProfileLocation,} from "@/features/profilo/public-profile-locations";

const AUTHOR_FACT_ICONS: Partial<Record<AnnouncementFactKind, typeof ListChecksIcon>> = {
	availability: CalendarCheckIcon,
	categories: TagsIcon,
	content: ClapperboardIcon,
	figures: BriefcaseBusinessIcon,
	roles: UsersIcon,
	specializations: BriefcaseBusinessIcon,
	types: TagsIcon,
};

function initials(value: string) {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase("it-IT"))
		.join("") || "PR";
}

function profileOption(type: AnnouncementAuthor["profileType"]) {
	return PROFILE_OPTIONS.find(({value}) => value === type) ?? PROFILE_OPTIONS[0];
}

function AuthorLocations({locations}: {locations: readonly PublicProfileLocation[]}) {
	const groups = groupPublicProfileLocations(locations);
	if (groups.length === 0) return null;

	return (
		<div className="flex flex-col gap-2">
			<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
				Zone selezionate
			</p>
			<ScrollArea className="rounded-lg bg-muted/50 [&>[data-slot=scroll-area-viewport]]:h-auto [&>[data-slot=scroll-area-viewport]]:max-h-44">
				<dl className="flex flex-col gap-2.5 p-2.5">
					{groups.map((group) => (
						<div key={group.region} className="flex flex-col gap-1.5">
							<dt className="text-xs font-semibold">{group.region}</dt>
							<dd className="flex flex-wrap gap-1">
								{group.hasWholeRegion && <Badge variant="outline">Tutta la regione</Badge>}
								{group.cities.map((city) => <Badge key={city} variant="secondary">{city}</Badge>)}
							</dd>
						</div>
					))}
				</dl>
			</ScrollArea>
		</div>
	);
}

export default function AnnouncementAuthorHoverCard({
	author,
}: {
	author: AnnouncementAuthor;
}) {
	if (author.kind !== "registered") {
		return (
			<span className="inline-flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
				<Avatar size="sm">
					<AvatarFallback>{initials(author.label)}</AvatarFallback>
				</Avatar>
				<span className="truncate">{author.label}</span>
			</span>
		);
	}

	const option = profileOption(author.profileType);
	const accent = getProfileAccent(author.profileType);
	const profileParams = new URLSearchParams({
		id: author.profileId,
		type: author.profileType,
	});
	const detailHref = `/dettagli-profilo?${profileParams.toString()}`;
	const highlights = author.highlights
		.filter(({value}) => value !== "Non specificato")
		.slice(0, 3);

	return (
		<HoverCard>
			<HoverCardTrigger
				render={<Link href={detailHref} />}
				delay={200}
				closeDelay={150}
				className="inline-flex min-w-0 items-center gap-2 rounded-lg text-xs font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				aria-label={`Apri il profilo di ${author.title}`}
			>
				<Avatar size="sm">
					{author.imageUrl && <AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />}
					<AvatarFallback>{initials(author.title)}</AvatarFallback>
				</Avatar>
				<span className="truncate underline-offset-4 hover:underline">{author.title}</span>
			</HoverCardTrigger>
			<HoverCardContent
				side="top"
				align="start"
				className="max-h-[var(--available-height)] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain p-4"
				style={{"--profile-accent": accent} as CSSProperties}
			>
				<div className="flex flex-col gap-4">
					<div className="flex min-w-0 items-start gap-3">
						<Avatar size="lg" className="ring-2 ring-[color:var(--profile-accent)]/20">
							{author.imageUrl && <AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />}
							<AvatarFallback>{initials(author.title)}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<p className="truncate font-semibold text-foreground">{author.title}</p>
							<div className="flex flex-wrap gap-1.5">
								<Badge variant="outline" style={{borderColor: accent, color: accent}}>
									<ProfilePngIcon type={author.profileType} color={accent} className="size-3" />
									{option.label}
								</Badge>
								{author.verified && <Badge variant="secondary"><BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />Verificato</Badge>}
							</div>
						</div>
					</div>

					{author.presentation && <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{author.presentation}</p>}

					{highlights.length > 0 && (
						<dl className="grid gap-2 sm:grid-cols-3">
							{highlights.map(({kind, label, value}) => {
								const Icon = AUTHOR_FACT_ICONS[kind] ?? ListChecksIcon;
								return (
									<div key={`${label}:${value}`} className="min-w-0 rounded-lg bg-muted/55 p-2.5">
										<dt className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
											<Icon className="size-3 shrink-0" aria-hidden="true" />
											<span className="truncate">{label}</span>
										</dt>
										<dd className="mt-1 line-clamp-2 text-xs font-medium wrap-anywhere" title={value}>{value}</dd>
									</div>
								);
							})}
						</dl>
					)}

					<AuthorLocations locations={author.locations} />
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
