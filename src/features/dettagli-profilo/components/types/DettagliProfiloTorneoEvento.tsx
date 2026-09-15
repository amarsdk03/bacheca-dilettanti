import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	intro: "Organizzazione e identità dell'evento",
	summary: "Torneo o evento",
	narrativeFieldLabels: ["Presentazione"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloTorneoEvento({profile}: {profile: GenericProfileDetail<"torneo-evento">}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} />;
}
