import Link from "next/link";
import {BadgeCheckIcon, MapPinIcon} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import type {AnnouncementAuthor} from "@/features/annunci/announcement-model";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";

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
	const TypeIcon = option.icon;
	const profileParams = new URLSearchParams({
		id: author.profileId,
		type: author.profileType,
	});
	const detailHref = `/dettagli-profilo?${profileParams.toString()}`;

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
					{author.imageUrl && (
						<AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />
					)}
					<AvatarFallback>{initials(author.title)}</AvatarFallback>
				</Avatar>
				<span className="truncate underline-offset-4 hover:underline">{author.title}</span>
			</HoverCardTrigger>
			<HoverCardContent
				side="top"
				align="start"
				className="w-[min(20rem,calc(100vw-2rem))]"
			>
				<div className="flex flex-col gap-3">
					<div className="flex min-w-0 items-start gap-3">
						<Avatar size="lg">
							{author.imageUrl && (
								<AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />
							)}
							<AvatarFallback>{initials(author.title)}</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className="truncate font-semibold text-foreground">{author.title}</p>
							<div className="mt-1 flex flex-wrap gap-1.5">
								<Badge variant="outline">
									<TypeIcon data-icon="inline-start" aria-hidden="true" />
									{option.label}
								</Badge>
								{author.verified && (
									<Badge variant="secondary">
										<BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />
										Verificato
									</Badge>
								)}
							</div>
						</div>
					</div>

					{author.presentation && (
						<p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
							{author.presentation}
						</p>
					)}

					{author.location && (
						<p className="flex items-start gap-2 text-xs text-muted-foreground">
							<MapPinIcon aria-hidden="true" />
							<span>{author.location}</span>
						</p>
					)}

					{author.highlights.length > 0 && (
						<ul className="flex flex-wrap gap-1.5" aria-label="Informazioni principali del profilo">
							{author.highlights.slice(0, 3).map(({label, value}) => (
								<li key={`${label}:${value}`}>
									<Badge variant="secondary" className="max-w-full truncate" title={`${label}: ${value}`}>
										{label}: {value}
									</Badge>
								</li>
							))}
						</ul>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
