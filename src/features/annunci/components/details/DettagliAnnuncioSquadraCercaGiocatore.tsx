import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import AnnouncementDetailsLayout from "./AnnouncementDetailsLayout";
import {ANNOUNCEMENT_DETAIL_PRESENTATIONS} from "./announcement-detail-presentation";

export default function DettagliAnnuncioSquadraCercaGiocatore({announcement}: {announcement: AnnouncementDetail}) {
	return <AnnouncementDetailsLayout announcement={announcement} presentation={ANNOUNCEMENT_DETAIL_PRESENTATIONS.annuncio_squadra_cerca_giocatore} />;
}
