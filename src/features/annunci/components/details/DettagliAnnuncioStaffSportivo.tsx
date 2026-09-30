import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import AnnouncementDetailsLayout from "./AnnouncementDetailsLayout";
import {ANNOUNCEMENT_DETAIL_PRESENTATIONS} from "./announcement-detail-presentation";

export default function DettagliAnnuncioStaffSportivo({announcement, authenticated, returnTo}: {announcement: AnnouncementDetail; authenticated: boolean; returnTo: string}) {
	return <AnnouncementDetailsLayout announcement={announcement} presentation={ANNOUNCEMENT_DETAIL_PRESENTATIONS.annuncio_staff_sportivo} authenticated={authenticated} returnTo={returnTo} />;
}
