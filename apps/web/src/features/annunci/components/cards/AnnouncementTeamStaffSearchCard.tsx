import AnnouncementCardShell from "./AnnouncementCardShell";
import {type AnnouncementCardData, getAnnouncementFacts} from "./announcement-card-model";

export default function AnnouncementTeamStaffSearchCard({announcement}: {announcement: AnnouncementCardData<"annuncio_squadra_cerca_staff">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Ricerca figure per lo staff"
			emptyDescription="La squadra non ha aggiunto una descrizione alla ricerca."
			facts={getAnnouncementFacts(announcement, ["Figura", "Settore", "Compenso mensile", "Località"])}
		/>
	);
}
