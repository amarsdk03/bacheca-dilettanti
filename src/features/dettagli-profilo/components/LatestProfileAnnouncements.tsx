import {MegaphoneIcon, TriangleAlertIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import type {ProfileAnnouncement} from "@/features/dettagli-profilo/profile-detail-model";
import ProfileAnnouncementCard from "./ProfileAnnouncementCard";

export default function LatestProfileAnnouncements({announcements, announcementsUnavailable}: {
	announcements: ProfileAnnouncement[];
	announcementsUnavailable: boolean;
}) {
	return (
		<section aria-labelledby="latest-profile-announcements" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="latest-profile-announcements" className="text-2xl font-semibold tracking-tight">
						Ultimi annunci pubblicati
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Fino a 4 annunci pubblici recenti associati a questa tipologia di profilo.
					</p>
				</div>
				{!announcementsUnavailable && (
					<Badge variant="secondary">
						{announcements.length === 1
							? "1 annuncio mostrato"
							: `${announcements.length} annunci mostrati`}
					</Badge>
				)}
			</div>

			{announcementsUnavailable ? (
				<Alert variant="destructive">
					<TriangleAlertIcon aria-hidden="true" />
					<AlertTitle>Annunci temporaneamente non disponibili</AlertTitle>
					<AlertDescription>Le informazioni del profilo restano consultabili. Riprova più tardi per gli annunci.</AlertDescription>
				</Alert>
			) : announcements.length === 0 ? (
				<Empty className="min-h-56 border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon"><MegaphoneIcon aria-hidden="true" /></EmptyMedia>
						<EmptyTitle>Nessun annuncio pubblicato</EmptyTitle>
						<EmptyDescription>
							Questo profilo non ha ancora annunci pubblici per la tipologia selezionata.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ul className="grid gap-4 md:grid-cols-2">
					{announcements.map((announcement) => (
						<li key={announcement.id}>
							<ProfileAnnouncementCard announcement={announcement} />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
