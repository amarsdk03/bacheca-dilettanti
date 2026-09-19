import AnnouncementCardShell from "./AnnouncementCardShell";
import {type AnnouncementCardData, getAnnouncementFacts} from "./announcement-card-model";

export default function AnnouncementEventCard({announcement}: {announcement: AnnouncementCardData<"annuncio_torneo_evento">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Torneo o evento sportivo"
			emptyDescription="L’organizzazione non ha aggiunto una descrizione all’annuncio."
			facts={getAnnouncementFacts(announcement, ["Iscrizione", "Partecipazione", "Costo", "Località"])}
		/>
	);
}
