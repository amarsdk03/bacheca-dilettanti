import type {ReactNode} from "react";
import {BriefcaseBusinessIcon, MapPinIcon, CircleCheckBigIcon, ShirtIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";
import {getProfileDetailFieldValue} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipo di azienda / professione", icon: BriefcaseBusinessIcon},
		{label: "Tipologia calcio", fieldLabel: "Tipologie sportive", icon: ShirtIcon, getValue: profile => getProfileDetailFieldValue(profile, "Tipologie sportive")},
		{label: "Disponibilità", icon: CircleCheckBigIcon, getValue: profile => profile.availabilityLabel},
		{label: "Sede Azienda / Professionista", icon: MapPinIcon},
	],
	narrativeFieldLabels: ["Servizi offerti"],
	announcementsLabel: "Contenuti / promozioni",
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloServiziConsulenze({profile, actions, authenticated, isOwner, returnTo}: {profile: GenericProfileDetail<"servizi-consulenze">; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
}
