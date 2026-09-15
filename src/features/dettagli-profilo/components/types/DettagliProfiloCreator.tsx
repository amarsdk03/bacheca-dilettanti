import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	intro: "Contenuti e voce della community",
	summary: "Profilo creator",
	narrativeFieldLabels: ["Presentazione"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloCreator({profile}: {profile: GenericProfileDetail<"creators">}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} />;
}
