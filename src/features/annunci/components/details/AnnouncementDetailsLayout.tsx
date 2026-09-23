import type {AnnouncementDetail, AnnouncementPlayerRoles,} from "@/features/annunci/announcement-model";
import type {CSSProperties} from "react";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import DetailIdentifier from "@/components/data-info/DetailIdentifier";
import DetailActions from "@/features/interazioni/DetailActions";
import AnnouncementDetailsTabs from "./AnnouncementDetailsTabs";
import SimilarAnnouncements from "./SimilarAnnouncements";
import AnnouncementPlayerRolePitch from "./AnnouncementPlayerRolePitch";
import AnnouncementDetailsContacts from "./AnnouncementDetailsContacts";
import AnnouncementDetailsHeader from "./AnnouncementDetailsHeader";
import AnnouncementDetailsOverview from "./AnnouncementDetailsOverview";
import AnnouncementLocationCard from "./AnnouncementLocationCard";
import type {AnnouncementDetailPresentation} from "./announcement-detail-presentation";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {InfoIcon} from "lucide-react";
import {announcementPreviewNotice} from "@/features/annunci/announcement-visibility";

export default function AnnouncementDetailsLayout({
	announcement,
	presentation,
	playerRoles = announcement.playerRoles,
}: {
	announcement: AnnouncementDetail;
	presentation: AnnouncementDetailPresentation;
	playerRoles?: AnnouncementPlayerRoles;
}) {
	const notice = announcementPreviewNotice(announcement.moderationStatus);
	return (
		<div className="public-profile-detail flex min-w-0 flex-col gap-6 font-home-body" style={{
			"--profile-accent": getProfileAccent(announcement.profileType),
			"--primary": "color-mix(in srgb, var(--profile-accent) 65%, black)",
		} as CSSProperties}>
			{!announcement.isListed && <Alert>
				<InfoIcon aria-hidden="true" />
				<AlertTitle>{notice.title}</AlertTitle>
				<AlertDescription>{notice.description} Non compare nelle ricerche o negli elenchi pubblici. Chiunque abbia il link può consultare questa anteprima e i contatti dell’annuncio.</AlertDescription>
			</Alert>}
			<AnnouncementDetailsHeader
				announcement={announcement}
				presentation={presentation}
				actions={<DetailActions target={{kind: "annuncio", id: announcement.id}} href={`/dettagli-annuncio?${new URLSearchParams({id: announcement.id})}`} presentation="announcement" shareOnly={!announcement.isListed} />}
			/>
			<AnnouncementDetailsTabs
				overview={
					<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
						<AnnouncementDetailsOverview announcement={announcement} presentation={presentation} />
						<aside aria-label="Informazioni sportive e contatti" className="flex min-w-0 flex-col gap-5">
							{playerRoles && <AnnouncementPlayerRolePitch primaryRoles={playerRoles.primaryRoles} secondaryRoles={playerRoles.secondaryRoles} />}
							<AnnouncementDetailsContacts contacts={announcement.contacts} unavailable={announcement.contactsUnavailable} />
							<AnnouncementLocationCard location={announcement.location} />
							<DetailIdentifier id={announcement.id} entity="annuncio" />
						</aside>
					</div>
				}
				similar={<SimilarAnnouncements announcements={announcement.similarAnnouncements} unavailable={announcement.similarAnnouncementsUnavailable} />}
			/>
		</div>
	);
}
