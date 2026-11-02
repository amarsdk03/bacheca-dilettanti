import type {CSSProperties} from "react";
import Link from "next/link";
import {ArrowUpRightIcon} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {HOMEPAGE_LIVE_CATEGORIES, type HomepageAnnouncementCounts} from "../homepage-live-categories";
import {loadHomepageAnnouncementCounts} from "../server/announcement-counts";
import AnnouncementCounter from "./AnnouncementCounter";

export function LiveAnnouncementCards({counts}: {counts: HomepageAnnouncementCounts}) {
	return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
		{HOMEPAGE_LIVE_CATEGORIES.map(({type, directoryType, label}) => {
			const value = counts[type];
			return <Link key={type} href={`/annunci?type=${directoryType}`}
				className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2"
				style={{"--category-accent": getProfileAccent(type)} as CSSProperties}>
				<Card className="h-full gap-0 overflow-hidden border border-[color-mix(in_srgb,var(--category-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--category-accent)_7%,var(--background))] py-0 shadow-none transition-[transform,box-shadow] duration-200 hover:shadow-md motion-safe:group-hover:-translate-y-1">
					<CardContent className="flex min-h-44 flex-col justify-between gap-5 p-4 sm:min-h-52 sm:p-6">
						<div className="flex items-start justify-between gap-2">
							<ProfilePngIcon type={type} color={getProfileAccent(type)} className="size-11 sm:size-14" />
							<ArrowUpRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<div className="font-home-display text-4xl leading-none tracking-tight tabular-nums sm:text-5xl lg:text-6xl">
								{value === null ? <span role="img" aria-label="Conteggio non disponibile">—</span> : <AnnouncementCounter value={value} />}
							</div>
							<h3 className="mt-2 text-xs font-medium text-muted-foreground sm:text-sm">{label}</h3>
						</div>
					</CardContent>
				</Card>
			</Link>;
		})}
	</div>;
}

export function LiveAnnouncementCardsSkeleton() {
	return <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4" aria-busy="true" aria-label="Caricamento conteggi annunci">
		{HOMEPAGE_LIVE_CATEGORIES.map(({type}) => <Skeleton key={type} className="min-h-44 rounded-xl sm:min-h-52" />)}
	</div>;
}

export default async function LiveAnnouncementCardsContent() {
	return <LiveAnnouncementCards counts={await loadHomepageAnnouncementCounts()} />;
}
