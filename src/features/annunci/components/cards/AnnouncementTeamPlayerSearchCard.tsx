import AnnouncementCardShell from "./AnnouncementCardShell";
import {type AnnouncementCardData, getAnnouncementFacts} from "./announcement-card-model";

export default function AnnouncementTeamPlayerSearchCard({announcement}: {announcement: AnnouncementCardData<"annuncio_squadra_cerca_giocatore">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Ricerca giocatori per la squadra"
			emptyDescription="La squadra non ha aggiunto una descrizione alla ricerca."
			facts={getAnnouncementFacts(announcement, ["Ruoli", "Annate", "Stagione", "Località"])}
		/>
	);
}
