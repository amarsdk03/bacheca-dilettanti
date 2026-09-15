import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	intro: "Spazi, servizi e disponibilità",
	summary: "Struttura sportiva",
	narrativeFieldLabels: ["Orari", "Presentazione", "Servizi inclusi", "Informazioni aggiuntive"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloCampiImpianti({profile}: {profile: GenericProfileDetail<"campi-impianti-sportivi">}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} />;
}
