import type {LucideIcon} from "lucide-react";
import {
	ArrowUpRightIcon,
	FootprintsIcon,
	RulerIcon,
	ScaleIcon,
	ShirtIcon,
	TagsIcon,
	TargetIcon,
	VideoIcon
} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import type {PlayerProfileData} from "../../profile-detail-model";

type PlayerOverviewProps = Pick<PlayerProfileData, "sportTypes" | "specificRoles" | "preferredCategories" | "preferredFoot" | "height" | "weight" | "presentation" | "highlightsUrl">;

function SportFact({icon: Icon, label, value}: {icon: LucideIcon; label: string; value: string | null}) {
	return (
		<div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4">
			<dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</dt>
			<dd className="text-lg font-semibold wrap-anywhere">{value ?? "Non specificato"}</dd>
		</div>
	);
}

function SportTags({icon: Icon, label, values}: {icon: LucideIcon; label: string; values: string[]}) {
	return (
		<div className="flex flex-col gap-3">
			<h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</h3>
			{values.length > 0
				? <ul className="flex flex-wrap gap-2">{values.map(value => <li key={value} className="min-w-0 max-w-full"><Badge variant="secondary" className="h-auto max-w-full whitespace-normal wrap-anywhere">{value}</Badge></li>)}</ul>
				: <p className="text-sm text-muted-foreground">Informazioni non disponibili</p>}
		</div>
	);
}

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

export default function PlayerOverview({sportTypes, specificRoles, preferredCategories, preferredFoot, height, weight, presentation, highlightsUrl}: PlayerOverviewProps) {
	const embedUrl = highlightsUrl ? youtubeEmbedUrl(highlightsUrl) : null;

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
			<div className="flex min-w-0 flex-col gap-5">
				<Card>
					<CardHeader>
						<CardTitle><h2 className="font-home-display text-2xl uppercase">Il giocatore</h2></CardTitle>
						<CardDescription>Una presentazione, in prima persona.</CardDescription>
					</CardHeader>
					<CardContent><p className="text-base leading-7 whitespace-pre-wrap wrap-anywhere">{presentation ?? "Questo giocatore non ha ancora aggiunto una presentazione."}</p></CardContent>
				</Card>
				{highlightsUrl && <Card>
					<CardHeader>
						<CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><VideoIcon className="size-5" aria-hidden="true" />Highlights</h2></CardTitle>
						<CardDescription>Guarda il giocatore in azione.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{embedUrl ? (
							<div className="aspect-video overflow-hidden rounded-lg bg-muted">
								<iframe
									className="size-full"
									src={embedUrl}
									title="Video highlights del giocatore"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									referrerPolicy="strict-origin-when-cross-origin"
									allowFullScreen
								/>
							</div>
						) : highlightsUrl && (
							<a href={highlightsUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({variant: "outline"})}>
								{embedUrl ? "Guarda su YouTube" : "Guarda video highlights"}<ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" /><span className="sr-only"> (si apre in una nuova scheda)</span>
							</a>
						)}
					</CardContent>
				</Card>}
			</div>
			<Card className="min-w-0">
				<CardHeader>
					<CardTitle><h2 className="font-home-display text-2xl uppercase">Scheda sportiva</h2></CardTitle>
					<CardDescription>Caratteristiche e preferenze del giocatore.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
						<SportFact icon={FootprintsIcon} label="Piede" value={preferredFoot} />
						<SportFact icon={RulerIcon} label="Altezza" value={height ? `${height} cm` : null} />
						<SportFact icon={ScaleIcon} label="Peso" value={weight ? `${weight} kg` : null} />
					</dl>
					<SportTags icon={ShirtIcon} label="Tipologie di calcio" values={sportTypes} />
					<SportTags icon={TargetIcon} label="Ruoli specifici" values={specificRoles} />
					<SportTags icon={TagsIcon} label="Categorie ricercate" values={preferredCategories} />
				</CardContent>
			</Card>
		</div>
	);
}
