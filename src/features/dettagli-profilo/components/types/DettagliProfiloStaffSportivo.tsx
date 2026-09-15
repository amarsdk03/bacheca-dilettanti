import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	intro: "Competenze ed esperienza al servizio del campo",
	summary: "Profilo professionale",
	narrativeFieldLabels: ["Presentazione", "Storico esperienze"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloStaffSportivo({profile}: {profile: GenericProfileDetail<"staff-sportivo">}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} />;
}
