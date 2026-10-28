import AnnouncementCardShell from "./AnnouncementCardShell";
import {type AnnouncementCardData, getAnnouncementFacts} from "./announcement-card-model";

export default function AnnouncementRefereeCard({announcement}: {announcement: AnnouncementCardData<"annuncio_arbitro">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Disponibilità arbitrale"
			emptyDescription="Questo arbitro non ha aggiunto una descrizione all’annuncio."
			facts={getAnnouncementFacts(announcement, ["Categorie", "Disponibilità", "Automunito", "Località"])}
		/>
	);
}
