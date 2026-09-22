import type {ReactNode} from "react";
import {BriefcaseBusinessIcon, CarFrontIcon, CircleCheckBigIcon, ShirtIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Figure professionali", icon: BriefcaseBusinessIcon},
		{label: "Tipologie sportive", icon: ShirtIcon},
		{label: "Disponibilità", icon: CircleCheckBigIcon, getValue: profile => profile.availabilityLabel},
		{label: "Automunito", icon: CarFrontIcon},
	],
	narrativeFieldLabels: ["Specializzazioni", "Servizi offerti"],
	hasExperiences: true,
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloProfessionistiStudi({profile, actions}: {profile: GenericProfileDetail<"professionisti-studi">; actions?: ReactNode}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} />;
}
