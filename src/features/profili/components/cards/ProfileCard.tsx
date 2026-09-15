import type {DirectoryProfile} from "../../profile-directory-model";
import {toPlayerCardData} from "./profile-card-model";
import GiocatoreCard from "./GiocatoreCard";
import SquadraCard from "./SquadraCard";
import StaffSportivoCard from "./StaffSportivoCard";
import ProfessionistiStudiCard from "./ProfessionistiStudiCard";
import ArbitroCard from "./ArbitroCard";
import CreatorCard from "./CreatorCard";
import TorneoEventoCard from "./TorneoEventoCard";
import CampiImpiantiCard from "./CampiImpiantiCard";

export default function ProfileCard({profile}: {profile: DirectoryProfile}) {
	const card = {id: profile.id, title: profile.title, presentation: profile.presentation, imageUrl: profile.imageUrl, verified: profile.verified, facts: profile.facts};
	switch (profile.type) {
		case "giocatore": return <GiocatoreCard profile={toPlayerCardData(profile)} />;
		case "squadra": return <SquadraCard profile={{...card, type: "squadra"}} />;
		case "staff-sportivo": return <StaffSportivoCard profile={{...card, type: "staff-sportivo"}} />;
		case "professionisti-studi": return <ProfessionistiStudiCard profile={{...card, type: "professionisti-studi"}} />;
		case "arbitro": return <ArbitroCard profile={{...card, type: "arbitro"}} />;
		case "creators": return <CreatorCard profile={{...card, type: "creators"}} />;
		case "torneo-evento": return <TorneoEventoCard profile={{...card, type: "torneo-evento"}} />;
		case "campi-impianti-sportivi": return <CampiImpiantiCard profile={{...card, type: "campi-impianti-sportivi"}} />;
	}
}
