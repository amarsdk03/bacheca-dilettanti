import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import AnnouncementDetailsLayout from "./AnnouncementDetailsLayout";
import {ANNOUNCEMENT_DETAIL_PRESENTATIONS} from "./announcement-detail-presentation";

export default function DettagliAnnuncioGiocatore({announcement}: {announcement: AnnouncementDetail}) {
	return (
		<AnnouncementDetailsLayout
			announcement={announcement}
			presentation={ANNOUNCEMENT_DETAIL_PRESENTATIONS.annuncio_giocatore}
			playerRoles={announcement.playerRoles}
		/>
	);
}
