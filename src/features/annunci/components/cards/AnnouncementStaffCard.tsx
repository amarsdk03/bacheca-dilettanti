import AnnouncementCardShell from "./AnnouncementCardShell";
import {getAnnouncementFacts, type AnnouncementCardData} from "./announcement-card-model";

export default function AnnouncementStaffCard({announcement}: {announcement: AnnouncementCardData<"annuncio_staff_sportivo">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Disponibilità professionale"
			emptyDescription="Questo professionista non ha aggiunto una descrizione all’annuncio."
			facts={getAnnouncementFacts(announcement, ["Figure", "Categorie", "Spostamenti", "Località"])}
		/>
	);
}
