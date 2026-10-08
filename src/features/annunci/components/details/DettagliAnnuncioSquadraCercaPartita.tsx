import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import AnnouncementDetailsLayout from "./AnnouncementDetailsLayout";

export default function DettagliAnnuncioSquadraCercaPartita({announcement, authenticated, returnTo}: {announcement: AnnouncementDetail; authenticated: boolean; returnTo: string}) {
	return <AnnouncementDetailsLayout announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
}
