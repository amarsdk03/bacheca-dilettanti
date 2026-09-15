import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	intro: "Disponibilità ed esperienza arbitrale",
	summary: "Profilo arbitrale",
	narrativeFieldLabels: ["Presentazione", "Storico esperienze"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloArbitro({profile}: {profile: GenericProfileDetail<"arbitro">}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} />;
}
