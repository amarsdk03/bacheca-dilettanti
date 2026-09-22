import type {ReactNode} from "react";
import {EuroIcon, MapPinIcon, ShirtIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipologie sportive", icon: ShirtIcon},
		{label: "Sede principale", icon: MapPinIcon},
		{label: "Costo di partenza", icon: EuroIcon},
	],
	narrativeFieldLabels: ["Orari", "Servizi inclusi", "Informazioni aggiuntive"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloCampiImpianti({profile, actions}: {profile: GenericProfileDetail<"campi-impianti-sportivi">; actions?: ReactNode}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} />;
}
