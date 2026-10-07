import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import {ArrowUpRightIcon, VideoIcon} from "lucide-react";
import {buttonVariants} from "@/components/ui/button";
import DynamicReactFlag from "@/components/dynamic/DynamicReactFlag";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {PlayerProfileData, PlayerProfileDetail} from "../../profile-detail-model";
import ProfileLocationsCard from "../ProfileLocationsCard";
import ProfileSocialLinksCard from "../ProfileSocialLinks";
import ProfileIdentifier from "../ProfileIdentifier";
import PlayerRolesCard from "./PlayerRolesCard";

type PlayerOverviewProps = Pick<PlayerProfileData, "presentation" | "highlightsUrl" | "sportTypes" | "primaryRoles" | "specificRoles" | "height" | "weight" | "nationality" | "nationalityCode"> & Pick<PlayerProfileDetail, "locations" | "socialLinks"> & {profileId: string; authenticated: boolean; returnTo: string};

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

export default function PlayerOverview({presentation, highlightsUrl, locations, socialLinks, sportTypes, primaryRoles, specificRoles, height, weight, nationality, nationalityCode, profileId, authenticated, returnTo}: PlayerOverviewProps) {
	const embedUrl = highlightsUrl ? youtubeEmbedUrl(highlightsUrl) : null;
	const information = [
		{label: "Altezza", value: height ? `${height} cm` : null},
		{label: "Peso", value: weight ? `${weight} kg` : null},
		{label: "Nazionalità", value: nationality},
		{label: "Ruoli specifici", value: specificRoles.length ? specificRoles.join(", ") : null},
	];

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
			<aside aria-label="Informazioni sportive" className="order-1 flex min-w-0 flex-col gap-5 lg:order-2 lg:col-start-2 lg:row-start-1">
				<PlayerRolesCard sportTypes={sportTypes} primaryRoles={primaryRoles} />
				<ProfileLocationsCard locations={locations} />
			</aside>
			<div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1 lg:col-start-1 lg:row-span-2 lg:row-start-1">
				<Card>
					<CardHeader><CardTitle><h2 className="font-home-display text-2xl uppercase">Informazioni</h2></CardTitle></CardHeader>
					<CardContent><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{information.map(({label, value}) => <div key={label} className="flex min-w-0 flex-col gap-2">
							<dt className="text-sm font-semibold">{label}</dt>
							<dd className="text-sm leading-6 wrap-anywhere">{label === "Nazionalità" && value ? <span className="inline-flex items-center gap-2">{value}{nationalityCode && <DynamicReactFlag code={nationalityCode} className="h-4 w-6 rounded-xs ring-1 ring-border" />}</span> : value ?? "Non specificato"}</dd>
						</div>)}
					</dl></CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle><h2 className="font-home-display text-2xl uppercase">Descrizione</h2></CardTitle>
					</CardHeader>
					<CardContent><p className="text-base leading-7 whitespace-pre-wrap wrap-anywhere">{presentation ?? "Descrizione non disponibile"}</p></CardContent>
				</Card>
				{highlightsUrl && <Card>
					<CardHeader>
						<CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><VideoIcon className="profile-detail-accent size-5" aria-hidden="true" />Highlights</h2></CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{embedUrl ? (
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
							<ExternalLink href={highlightsUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({variant: "outline", className: "min-h-11 h-auto self-start whitespace-normal"})}>
								Guarda video highlights<ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" /><span className="sr-only"> (si apre in una nuova scheda)</span>
							</ExternalLink>
						)}
					</CardContent>
				</Card>}
			</div>
			<aside aria-label="Contatti e identificativo" className="order-3 flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-2">
				<ProfileSocialLinksCard socialLinks={socialLinks} presentation="profile" authenticated={authenticated} returnTo={returnTo} />
				<ProfileIdentifier profileId={profileId} />
			</aside>
		</div>
	);
}
