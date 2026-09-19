import AnnouncementCardShell from "./AnnouncementCardShell";
import {type AnnouncementCardData, getAnnouncementFacts} from "./announcement-card-model";

export default function AnnouncementPlayerCard({announcement}: {announcement: AnnouncementCardData<"annuncio_giocatore">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Disponibilità per nuove opportunità"
			emptyDescription="Questo giocatore non ha aggiunto una descrizione all’annuncio."
			facts={getAnnouncementFacts(announcement, ["Ruoli principali", "Ruoli secondari", "Tipologie", "Categorie ricercate", "Località"])}
		/>
	);
}
