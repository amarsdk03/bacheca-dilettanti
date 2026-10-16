import Link from "next/link";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {HoverCard, HoverCardContent, HoverCardTrigger,} from "@/components/ui/hover-card";
import type {AnnouncementAuthor} from "@/features/annunci/announcement-model";
import {OfficialVerificationIcon} from "@/features/profilo/ProfileVerificationStatus";
import AnnouncementAuthorSummary from "./AnnouncementAuthorSummary";

function initials(value: string) {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase("it-IT"))
		.join("") || "PR";
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
			>
				<AnnouncementAuthorSummary author={author} />
			</HoverCardContent>
		</HoverCard>
	);
}
