import type {ReactNode} from "react";
import {CalendarDaysIcon, CircleCheckBigIcon, MapPinIcon, ShirtIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Età", icon: CalendarDaysIcon},
		{label: "Tipologie calcio", icon: ShirtIcon},
		{label: "Disponibilità", icon: CircleCheckBigIcon, getValue: profile => profile.availabilityLabel},
		{label: "Zona di residenza", icon: MapPinIcon, getValue: profile => [...new Set(profile.locations.map(({region}) => region.trim()).filter(Boolean))].join(", ") || null},
	],
	narrativeFieldLabels: [],
	hasExperiences: true,
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloArbitro({profile, actions, authenticated, isOwner, returnTo}: {profile: GenericProfileDetail<"arbitro">; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
}
