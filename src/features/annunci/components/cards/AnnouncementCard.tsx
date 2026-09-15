import type {AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import AnnouncementEventCard from "./AnnouncementEventCard";
import AnnouncementFacilityCard from "./AnnouncementFacilityCard";
import AnnouncementPlayerCard from "./AnnouncementPlayerCard";
import AnnouncementRefereeCard from "./AnnouncementRefereeCard";
import AnnouncementStaffCard from "./AnnouncementStaffCard";
import AnnouncementTeamMatchSearchCard from "./AnnouncementTeamMatchSearchCard";
import AnnouncementTeamPlayerSearchCard from "./AnnouncementTeamPlayerSearchCard";
import AnnouncementTeamSponsorSearchCard from "./AnnouncementTeamSponsorSearchCard";
import AnnouncementTeamStaffSearchCard from "./AnnouncementTeamStaffSearchCard";

export default function AnnouncementCard({announcement}: {announcement: AnnouncementDirectoryItem}) {
	switch (announcement.type) {
		case "annuncio_giocatore":
			return <AnnouncementPlayerCard announcement={{...announcement, type: "annuncio_giocatore"}} />;
		case "annuncio_squadra_cerca_giocatore":
			return <AnnouncementTeamPlayerSearchCard announcement={{...announcement, type: "annuncio_squadra_cerca_giocatore"}} />;
		case "annuncio_squadra_cerca_staff":
			return <AnnouncementTeamStaffSearchCard announcement={{...announcement, type: "annuncio_squadra_cerca_staff"}} />;
		case "annuncio_squadra_cerca_partita":
			return <AnnouncementTeamMatchSearchCard announcement={{...announcement, type: "annuncio_squadra_cerca_partita"}} />;
		case "annuncio_squadra_cerca_sponsor":
			return <AnnouncementTeamSponsorSearchCard announcement={{...announcement, type: "annuncio_squadra_cerca_sponsor"}} />;
		case "annuncio_staff_sportivo":
			return <AnnouncementStaffCard announcement={{...announcement, type: "annuncio_staff_sportivo"}} />;
		case "annuncio_arbitro":
			return <AnnouncementRefereeCard announcement={{...announcement, type: "annuncio_arbitro"}} />;
		case "annuncio_torneo_evento":
			return <AnnouncementEventCard announcement={{...announcement, type: "annuncio_torneo_evento"}} />;
		case "annuncio_campo_impianto":
			return <AnnouncementFacilityCard announcement={{...announcement, type: "annuncio_campo_impianto"}} />;
	}
}
