import type {ReactNode} from "react";
import {BriefcaseBusinessIcon, CircleCheckBigIcon, ShirtIcon, WifiIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";
import {getProfileDetailFieldValue} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Mansioni", fieldLabel: "Figure professionali", icon: BriefcaseBusinessIcon, getValue: profile => getProfileDetailFieldValue(profile, "Figure professionali")},
		{label: "Tipologie calcio", icon: ShirtIcon},
		{label: "Disponibilità", icon: CircleCheckBigIcon, getValue: profile => profile.availabilityLabel},
		{label: "Disponibile da remoto", fieldLabel: "Disponibile anche da remoto", icon: WifiIcon, getValue: profile => getProfileDetailFieldValue(profile, "Disponibile anche da remoto")},
	],
	narrativeFieldLabels: [],
	hasExperiences: true,
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloStaffSportivo({profile, actions, authenticated, isOwner, returnTo}: {profile: GenericProfileDetail<"staff-sportivo">; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
}
