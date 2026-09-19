import AnnouncementCardShell from "./AnnouncementCardShell";
import {type AnnouncementCardData, getAnnouncementFacts} from "./announcement-card-model";

export default function AnnouncementFacilityCard({announcement}: {announcement: AnnouncementCardData<"annuncio_campo_impianto">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Spazi e servizi sportivi"
			emptyDescription="L’impianto non ha aggiunto una descrizione all’annuncio."
			facts={getAnnouncementFacts(announcement, ["Tipologie", "Costo", "Servizi", "Località"])}
		/>
	);
}
