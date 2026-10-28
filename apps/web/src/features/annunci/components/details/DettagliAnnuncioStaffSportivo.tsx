import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import AnnouncementDetailsLayout from "./AnnouncementDetailsLayout";

export default function DettagliAnnuncioStaffSportivo({announcement, authenticated, returnTo}: {announcement: AnnouncementDetail; authenticated: boolean; returnTo: string}) {
	return <AnnouncementDetailsLayout announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
}
