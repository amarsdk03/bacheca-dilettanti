import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	intro: "Identità e direzione della società",
	summary: "Panoramica della squadra",
	narrativeFieldLabels: ["Presentazione"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloSquadra({profile}: {profile: GenericProfileDetail<"squadra">}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} />;
}
