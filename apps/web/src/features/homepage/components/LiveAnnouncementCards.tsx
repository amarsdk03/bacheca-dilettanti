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
				<Card className="homepage-live-card relative overflow-hidden motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:-translate-y-1 h-full gap-0 border border-[color-mix(in_srgb,var(--category-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--category-accent)_7%,var(--background))] py-0 shadow-none transition-[transform,box-shadow] duration-200 hover:shadow-md">
					<CardContent className="relative flex min-h-44 flex-col justify-end gap-5 p-4 sm:min-h-52 sm:p-6">
						<div className="absolute inset-0 pointer-events-none" aria-hidden="true">
							<ProfilePngIcon type={type} color={getProfileAccent(type)} className="homepage-live-icon absolute h-4/5 inset-y-1/10 right-0 aspect-square translate-x-1/2 opacity-50 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:translate-x-[35%] motion-safe:group-focus-visible:translate-x-[35%]" />
							<ArrowUpRightIcon className="absolute left-4 top-6 size-6 text-muted-foreground transition-colors duration-1000 ease-out group-hover:text-(--category-accent) group-focus-visible:text-(--category-accent) motion-safe:transition-[translate,color] motion-safe:group-hover:translate-x-1 motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:translate-x-1 motion-safe:group-focus-visible:-translate-y-1 sm:left-6 sm:top-6 sm:size-7" aria-hidden="true" />
						</div>
						<div className="relative min-w-0 pr-6">
							<div className="font-home-display text-5xl leading-none tracking-tight tabular-nums sm:text-6xl lg:text-7xl">
								{value === null ? <span role="img" aria-label="Conteggio non disponibile">—</span> : <AnnouncementCounter value={value} />}
							</div>
							<h3 className="mt-2 text-sm font-medium text-foreground sm:text-base">{label}</h3>
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
