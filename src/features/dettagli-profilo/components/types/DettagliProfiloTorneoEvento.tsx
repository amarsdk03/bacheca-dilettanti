import type {ReactNode} from "react";
import {MapPinIcon, ShirtIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipologie sportive", icon: ShirtIcon},
		{label: "Sede principale", icon: MapPinIcon},
	],
	narrativeFieldLabels: [],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloTorneoEvento({profile, actions}: {profile: GenericProfileDetail<"torneo-evento">; actions?: ReactNode}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} />;
}
