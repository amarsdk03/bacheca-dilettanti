import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import type {CSSProperties} from "react";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import DetailIdentifier from "@/components/data-info/DetailIdentifier";
import DetailActions from "@/features/interazioni/DetailActions";
import AnnouncementDetailsTabs from "./AnnouncementDetailsTabs";
import SimilarAnnouncements from "./SimilarAnnouncements";
import AnnouncementSponsorCard from "./AnnouncementSponsorCard";
import AnnouncementDetailsContacts from "./AnnouncementDetailsContacts";
import AnnouncementDetailsHeader from "./AnnouncementDetailsHeader";
import AnnouncementDetailsOverview from "./AnnouncementDetailsOverview";
import AnnouncementAuthorCard from "./AnnouncementAuthorCard";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {InfoIcon} from "lucide-react";
import {announcementPreviewNotice} from "@/features/annunci/announcement-visibility";

export default function AnnouncementDetailsLayout({
	announcement,
	authenticated,
	returnTo,
}: {
	announcement: AnnouncementDetail;
	authenticated: boolean;
	returnTo: string;
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
				<AlertDescription>{notice.description} Non compare nelle ricerche o negli elenchi pubblici. Chiunque abbia il link può consultare questa anteprima. I contatti sono visibili solo agli utenti autenticati.</AlertDescription>
			</Alert>}
			<AnnouncementDetailsHeader
				announcement={announcement}
				actions={<DetailActions target={{kind: "annuncio", id: announcement.id}} interestTarget={{kind: "annuncio", id: announcement.id}} href={`/dettagli-annuncio?${new URLSearchParams({id: announcement.id})}`} presentation="announcement" shareOnly={!announcement.isListed} />}
			/>
			<AnnouncementDetailsTabs
				overview={
					<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
						<AnnouncementDetailsOverview announcement={announcement} />
						<aside aria-label="Profilo autore, contatti e sponsor" className="flex min-w-0 flex-col gap-5">
							<AnnouncementAuthorCard announcement={announcement} />
							<AnnouncementDetailsContacts contacts={announcement.contacts} unavailable={announcement.contactsUnavailable} authenticated={authenticated} returnTo={returnTo} />
							<AnnouncementSponsorCard profileType={announcement.profileType} />
							<DetailIdentifier id={announcement.id} entity="annuncio" />
						</aside>
					</div>
				}
				similar={<SimilarAnnouncements announcements={announcement.similarAnnouncements} unavailable={announcement.similarAnnouncementsUnavailable} />}
			/>
		</div>
	);
}
