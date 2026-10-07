import type {CSSProperties} from "react";
import Link from "next/link";
import {ExternalLinkIcon, UserRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {OfficialVerificationIcon, RegisteredUserBadge} from "@/features/profilo/ProfileVerificationStatus";

function initials(value: string) {
	return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toLocaleUpperCase("it-IT")).join("") || "PR";
}

export default function AnnouncementAuthorCard({announcement}: {announcement: AnnouncementDetail}) {
	const {author, anonymousAuthorInfo} = announcement;
	if (author.kind === "registered") {
		const href = `/dettagli-profilo?${new URLSearchParams({id: author.profileId, type: author.profileType})}`;
		const option = PROFILE_OPTIONS.find(item => item.value === author.profileType) ?? PROFILE_OPTIONS[0];
		const accent = getProfileAccent(author.profileType);
		return <Card>
			<CardHeader><CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><UserRoundIcon className="profile-detail-accent size-5" aria-hidden="true" />Apri profilo</h2></CardTitle></CardHeader>
			<CardContent className="flex min-w-0 flex-col gap-4" style={{"--profile-accent": accent} as CSSProperties}>
				<div className="flex min-w-0 items-center gap-3">
					<Avatar size="lg" className="shrink-0 ring-2 ring-[color:var(--profile-accent)]/20">
						{author.imageUrl && <AvatarImage src={author.imageUrl} alt={`Foto profilo di ${author.title}`} />}
						<AvatarFallback>{initials(author.title)}</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<p className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
							<span className="break-words">{author.title}</span>
							<OfficialVerificationIcon officialVerified={author.officialVerified} className="size-4 shrink-0" />
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
				<Button render={<Link href={href} />} nativeButton={false} variant="outline" className="h-auto min-h-10 w-full whitespace-normal">
					<ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
					Vedi scheda {option.label}
				</Button>
			</CardContent>
		</Card>;
	}
	if (author.kind !== "anonymous" || !anonymousAuthorInfo) return null;
	const profileTypeLabel = PROFILE_OPTIONS.find(option => option.value === author.profileType)?.label ?? "Profilo";
	return <Card>
		<CardHeader><CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><UserRoundIcon className="profile-detail-accent size-5" aria-hidden="true" />Info autore</h2></CardTitle></CardHeader>
		<CardContent><dl className="flex flex-col gap-3 text-sm">
			<div><dt className="font-semibold">Nome</dt><dd className="wrap-anywhere">{anonymousAuthorInfo?.name ?? author.label}</dd></div>
			<div><dt className="font-semibold">Tipologia</dt><dd>{profileTypeLabel}</dd></div>
			{anonymousAuthorInfo?.location && <div><dt className="font-semibold">Località</dt><dd>{anonymousAuthorInfo.location}</dd></div>}
			{anonymousAuthorInfo?.presentation && <div><dt className="font-semibold">Presentazione</dt><dd className="whitespace-pre-wrap wrap-anywhere">{anonymousAuthorInfo.presentation}</dd></div>}
		</dl></CardContent>
	</Card>;
}
