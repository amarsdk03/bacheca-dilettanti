import type {CSSProperties} from "react";
import Link from "next/link";
import {ExternalLinkIcon} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {HoverCard, HoverCardContent, HoverCardTrigger,} from "@/components/ui/hover-card";
import type {AnnouncementAuthor} from "@/features/annunci/announcement-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {OfficialVerificationIcon, RegisteredUserBadge} from "@/features/profilo/ProfileVerificationStatus";
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
	const accent = getProfileAccent(author.profileType);
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
				aria-label={`Apri il profilo di ${author.title}${author.officialVerified ? ", verificato ufficialmente" : ""}`}
			>
				<Avatar size="sm">
					{author.imageUrl && <AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />}
					<AvatarFallback>{initials(author.title)}</AvatarFallback>
				</Avatar>
				<span className="truncate underline-offset-4 hover:underline">{author.title}</span>
				<OfficialVerificationIcon officialVerified={author.officialVerified} className="size-4 -translate-x-1" />
			</HoverCardTrigger>
			<HoverCardContent
				side="top"
				align="start"
				className="max-h-[var(--available-height)] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain p-4"
				style={{"--profile-accent": accent} as CSSProperties}
			>
				<div className="flex flex-col gap-4">
					<div className="flex min-w-0 items-center gap-3">
						<Avatar size="lg" className="ring-2 ring-[color:var(--profile-accent)]/20">
							{author.imageUrl && <AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />}
							<AvatarFallback>{initials(author.title)}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<p className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
								<span className="truncate">{author.title}</span>
								<OfficialVerificationIcon officialVerified={author.officialVerified} className="size-4 -translate-x-0.5" />
							</p>
							<div className="flex flex-wrap gap-1.5">
								<Badge variant="outline" style={{borderColor: accent, color: accent}}>
									<ProfilePngIcon type={author.profileType} color={accent} className="size-3" />
									{option.label}
								</Badge>
								<RegisteredUserBadge emailConfirmed={author.emailConfirmed} />
							</div>
						</div>
					</div>

					{author.presentation && (
						<p className="max-h-24 overflow-hidden text-sm leading-6 text-muted-foreground line-clamp-4">
							{author.presentation}
						</p>
					)}
					<Button
						render={<Link href={detailHref} />}
						nativeButton={false}
						variant="outline"
						className="h-auto min-h-10 w-full whitespace-normal"
					>
						<ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
						Informazioni complete
					</Button>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
