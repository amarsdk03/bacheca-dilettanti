import {MegaphoneIcon, TriangleAlertIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import type {AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import ProfileAnnouncementCard from "./ProfileAnnouncementCard";
import Link from "next/link";
import {buttonVariants} from "@/components/ui/button-variants";

export default function LatestProfileAnnouncements({announcements, announcementsUnavailable, isOwner = false, contentMode = false}: {
	announcements: AnnouncementDirectoryItem[];
	announcementsUnavailable: boolean;
	isOwner?: boolean;
	contentMode?: boolean;
}) {
	return (
		<section aria-labelledby="latest-profile-announcements" className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="font-home-display text-2xl font-medium uppercase">
					{contentMode ? "Contenuti / promozioni" : "Ultimi annunci pubblicati"}
				</h2>
				{!announcementsUnavailable && (
					<Badge variant="secondary">
						{announcements.length === 1
							? contentMode ? "1 contenuto / promozione mostrato" : "1 annuncio mostrato"
							: contentMode ? `${announcements.length} contenuti / promozioni mostrati` : `${announcements.length} annunci mostrati`}
					</Badge>
				)}
			</div>

			{announcementsUnavailable ? (
				<Alert variant="destructive">
					<TriangleAlertIcon aria-hidden="true" />
					<AlertTitle>{contentMode ? "Contenuti / promozioni temporaneamente non disponibili" : "Annunci temporaneamente non disponibili"}</AlertTitle>
					<AlertDescription>{contentMode ? "Le informazioni del profilo restano consultabili. Riprova più tardi per i contenuti / promozioni." : "Le informazioni del profilo restano consultabili. Riprova più tardi per gli annunci."}</AlertDescription>
				</Alert>
			) : announcements.length === 0 ? (
				<Empty className="min-h-56 border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon"><MegaphoneIcon aria-hidden="true" /></EmptyMedia>
						<EmptyTitle>{contentMode ? "Nessun contenuto / promozione pubblicato" : "Nessun annuncio pubblicato"}</EmptyTitle>
						<EmptyDescription>
							{contentMode ? "Questo profilo non ha ancora contenuti / promozioni pubblici." : "Questo profilo non ha ancora annunci pubblici per la tipologia selezionata."}
						</EmptyDescription>
					</EmptyHeader>
					{isOwner && <EmptyContent>
						<Link href="/pubblica-annuncio" className={buttonVariants({size: "sm"})}>{contentMode ? "Crea contenuto / promozione" : "Crea nuovo annuncio"}</Link>
					</EmptyContent>}
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
