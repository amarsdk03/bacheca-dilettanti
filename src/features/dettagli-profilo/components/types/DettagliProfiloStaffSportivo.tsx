import type {ReactNode} from "react";
import {BriefcaseBusinessIcon, CircleCheckBigIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Figure professionali", icon: BriefcaseBusinessIcon},
		{label: "Disponibilità", icon: CircleCheckBigIcon, getValue: profile => profile.availabilityLabel},
	],
	narrativeFieldLabels: [],
	hasExperiences: true,
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloStaffSportivo({profile, actions}: {profile: GenericProfileDetail<"staff-sportivo">; actions?: ReactNode}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} />;
}
