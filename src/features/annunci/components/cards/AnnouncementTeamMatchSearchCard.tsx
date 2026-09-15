import AnnouncementCardShell from "./AnnouncementCardShell";
import {getAnnouncementFacts, type AnnouncementCardData} from "./announcement-card-model";

export default function AnnouncementTeamMatchSearchCard({announcement}: {announcement: AnnouncementCardData<"annuncio_squadra_cerca_partita">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Ricerca avversari e partite"
			emptyDescription="La squadra non ha aggiunto una descrizione alla ricerca."
			facts={getAnnouncementFacts(announcement, ["Categorie", "Periodo", "Trasferta", "Località"])}
		/>
	);
}
