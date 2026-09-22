import type {ReactNode} from "react";
import {CircleCheckBigIcon, RouteIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Disponibilità", icon: CircleCheckBigIcon, getValue: profile => profile.availabilityLabel},
		{label: "Esperienze", icon: RouteIcon, getValue: profile => profile.experiences.length.toLocaleString("it-IT")},
	],
	narrativeFieldLabels: [],
	hasExperiences: true,
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloArbitro({profile, actions}: {profile: GenericProfileDetail<"arbitro">; actions?: ReactNode}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} />;
}
