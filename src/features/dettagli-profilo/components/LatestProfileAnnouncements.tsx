import {MegaphoneIcon, TriangleAlertIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import type {AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import ProfileAnnouncementCard from "./ProfileAnnouncementCard";

export default function LatestProfileAnnouncements({announcements, announcementsUnavailable}: {
	announcements: AnnouncementDirectoryItem[];
	announcementsUnavailable: boolean;
}) {
	return (
		<section aria-labelledby="latest-profile-announcements" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="font-home-display text-2xl font-medium uppercase">
					Ultimi annunci pubblicati
				</h2>
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
