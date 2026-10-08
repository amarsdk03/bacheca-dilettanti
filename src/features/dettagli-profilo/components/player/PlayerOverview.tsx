import {InterestDialogTrigger} from "@/features/interessi/InterestDialog";
import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import {ArrowUpRightIcon, RulerIcon, VideoIcon, WeightIcon} from "lucide-react";
import {buttonVariants} from "@/components/ui/button-variants";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {PlayerProfileData, PlayerProfileDetail} from "../../profile-detail-model";
import ProfileLocationsCard from "../ProfileLocationsCard";
import ProfileSocialLinksCard from "../ProfileSocialLinks";
import ProfileIdentifier from "../ProfileIdentifier";
import PlayerRolesCard from "./PlayerRolesCard";
import ProfileSectionHeading from "../ProfileSectionHeading";

type PlayerOverviewProps = Pick<PlayerProfileData, "presentation" | "highlightsUrl" | "privateHighlights" | "sportTypes" | "primaryRoles" | "specificRoles" | "height" | "weight"> & Pick<PlayerProfileDetail, "locations" | "socialLinks"> & {profileId: string; authenticated: boolean; returnTo: string};

function youtubeEmbedUrl(value: string) {
	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase().replace(/^www\./, "");
		let videoId: string | null = null;

		if (host === "youtu.be") {
			videoId = url.pathname.split("/")[1] ?? null;
		} else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
			if (url.pathname === "/watch") {
				videoId = url.searchParams.get("v");
			} else {
				const [kind, id] = url.pathname.split("/").filter(Boolean);
				videoId = ["embed", "live", "shorts"].includes(kind) ? id ?? null : null;
			}
		}

		return videoId && /^[A-Za-z0-9_-]{6,}$/.test(videoId)
			? `https://www.youtube-nocookie.com/embed/${videoId}`
			: null;
	} catch {
		return null;
	}
}

export default function PlayerOverview({presentation, highlightsUrl, privateHighlights, locations, socialLinks, sportTypes, primaryRoles, specificRoles, height, weight, profileId, authenticated, returnTo}: PlayerOverviewProps) {
	const embedUrl = highlightsUrl ? youtubeEmbedUrl(highlightsUrl) : null;
	const information = [
		{label: "Altezza", icon: RulerIcon, value: height ? `${height} cm` : null},
		{label: "Peso", icon: WeightIcon, value: weight ? `${weight} kg` : null},
		{label: null, value: specificRoles.length ? specificRoles : ["Non specificato"]},
	];

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
			<aside aria-label="Informazioni sportive, località e contatti" className="order-1 flex min-w-0 flex-col gap-5 lg:order-2 lg:col-start-2 lg:row-start-1">
				<PlayerRolesCard sportTypes={sportTypes} primaryRoles={primaryRoles} />
				<ProfileLocationsCard locations={locations} title="Vive a" presentation="player" />
				<div className="hidden flex-col gap-5 lg:flex">
					<ProfileSocialLinksCard socialLinks={socialLinks} presentation="profile" authenticated={authenticated} returnTo={returnTo} />
					<ProfileIdentifier profileId={profileId} />
				</div>
			</aside>
			<div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1 lg:col-start-1 lg:row-start-1">
				<Card>
					<CardHeader><CardTitle><ProfileSectionHeading>Informazioni</ProfileSectionHeading></CardTitle></CardHeader>
					<CardContent><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{information.map(({label, icon: Icon, value}, index) => (
							<div key={label ?? `specific-roles-${index}`} className="flex min-w-0 flex-col items-center gap-2 rounded-xl p-4 text-center">
								{label && <dt className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{Icon && <Icon className="size-4" aria-hidden="true" />}{label}</dt>}
								<dd className="text-center text-base leading-6 font-semibold wrap-anywhere">{Array.isArray(value) ? <ul className="flex flex-col items-center gap-1">{value.map((role, roleIndex) => <li key={role + roleIndex} className="rounded-md bg-background/70 px-3">{role}</li>)}</ul> : value ?? <span className="font-normal text-muted-foreground">Non specificato</span>}</dd>
							</div>
						))}
					</dl></CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle><ProfileSectionHeading>Descrizione giocatore</ProfileSectionHeading></CardTitle>
					</CardHeader>
					<CardContent><p className="text-base leading-7 whitespace-pre-wrap wrap-anywhere">{presentation ?? "Descrizione non disponibile"}</p></CardContent>
				</Card>
				{(highlightsUrl || privateHighlights) && <Card>
					<CardHeader>
						<CardTitle>
							<ProfileSectionHeading className="flex items-center justify-center gap-2">
								<VideoIcon className="profile-detail-accent size-5" aria-hidden="true" />
								Video Highlights
							</ProfileSectionHeading>
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{privateHighlights ? <div className="flex min-h-48 w-full flex-col items-center justify-center gap-4 px-4 sm:px-32 py-6 sm:py-12 text-center">
							<p className="text-base leading-7 text-muted-foreground">Highlights disponibili ma inviabili privatamente a chi è interessato. <InterestDialogTrigger inline /> per riceverlo!</p>
						</div> : embedUrl ? (
							<div className="aspect-video overflow-hidden rounded-lg bg-muted">
								<iframe
									className="size-full"
									src={embedUrl}
									title="Video highlights del giocatore"
									loading="lazy"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									referrerPolicy="strict-origin-when-cross-origin"
									allowFullScreen
								/>
							</div>
						) : (
							<ExternalLink href={highlightsUrl!} target="_blank" rel="noopener noreferrer" className={buttonVariants({variant: "outline", className: "min-h-11 h-auto self-start whitespace-normal"})}>
								Guarda video highlights<ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" /><span className="sr-only"> (si apre in una nuova scheda)</span>
							</ExternalLink>
						)}
					</CardContent>
				</Card>}
			</div>
			<div className="order-3 flex flex-col gap-5 lg:hidden">
				<ProfileSocialLinksCard socialLinks={socialLinks} presentation="profile" authenticated={authenticated} returnTo={returnTo} />
				<ProfileIdentifier profileId={profileId} />
			</div>
		</div>
	);
}
