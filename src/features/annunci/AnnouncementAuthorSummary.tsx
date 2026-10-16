import type {CSSProperties} from "react";
import Link from "next/link";
import {ExternalLinkIcon} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import type {AnnouncementAuthor} from "./announcement-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {RegisteredUserBadge} from "@/features/profilo/ProfileVerificationStatus";
import ProfileNameWithIndicators from "@/features/profilo/ProfileNameWithIndicators";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {profileInitials} from "@/features/profilo/public-profile-display";

export default function AnnouncementAuthorSummary({author, actionLabel, showPresentation = true}: {
	author: Extract<AnnouncementAuthor, {kind: "registered"}>;
	actionLabel?: string;
	showPresentation?: boolean;
}) {
	const option = PROFILE_OPTIONS.find(({value}) => value === author.profileType) ?? PROFILE_OPTIONS[0];
	const accent = getProfileAccent(author.profileType);
	const detailHref = `/dettagli-profilo?${new URLSearchParams({id: author.profileId, type: author.profileType})}`;
	return <div className="flex min-w-0 flex-col gap-4" style={{"--profile-accent": accent} as CSSProperties}>
		<div className="flex min-w-0 items-center gap-3">
			<Avatar size="lg" className="shrink-0 ring-2 ring-[color:var(--profile-accent)]/20">
				{author.imageUrl && <AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />}
				<AvatarFallback>{profileInitials(author.title)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<p className="min-w-0 font-semibold text-foreground wrap-anywhere">
					<ProfileNameWithIndicators name={author.title} officialVerified={author.officialVerified} anonymousName={author.anonymousName} verificationClassName="size-4 align-middle" anonymityClassName="size-4" />
				</p>
				<div className="flex flex-wrap gap-1.5">
					<Badge variant="outline" style={{borderColor: accent, color: accent}}>
						<ProfilePngIcon type={author.profileType} color={accent} className="size-3" />{option.label}
					</Badge>
					<RegisteredUserBadge emailConfirmed={author.emailConfirmed} />
				</div>
			</div>
		</div>
		{showPresentation && author.presentation && <p className="max-h-24 overflow-hidden text-sm leading-6 text-muted-foreground line-clamp-4">{author.presentation}</p>}
		<Button render={<Link href={detailHref} />} nativeButton={false} variant="outline" className="h-auto min-h-10 w-full whitespace-normal">
			<ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />{actionLabel ?? `Vedi scheda ${option.label}`}
		</Button>
	</div>;
}
