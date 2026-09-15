import AnnouncementCardShell from "./AnnouncementCardShell";
import {getAnnouncementFacts, type AnnouncementCardData} from "./announcement-card-model";

export default function AnnouncementTeamSponsorSearchCard({announcement}: {announcement: AnnouncementCardData<"annuncio_squadra_cerca_sponsor">}) {
	return (
		<AnnouncementCardShell
			announcement={announcement}
			summary="Ricerca partner e sponsor"
			emptyDescription="La squadra non ha aggiunto una descrizione alla ricerca."
			facts={getAnnouncementFacts(announcement, ["Settore", "Supporto cercato", "Offerta", "Località"])}
		/>
	);
}
