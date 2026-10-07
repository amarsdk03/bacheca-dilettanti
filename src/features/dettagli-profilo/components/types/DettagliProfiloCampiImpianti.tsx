import type {ReactNode} from "react";
import {MapPinIcon, MegaphoneIcon, ShirtIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";
import {formatProfileFactCount, getProfileDetailFieldValue} from "../profile-detail-presentation";

const PRESENTATION = {
	announcementsLabel: "Campi disponibili",
	facts: [
		{label: "Tipologia campi disponibili", icon: ShirtIcon},
		{label: "Sede dell’impianto / struttura", sourceFieldLabels: ["Indirizzo del campo"], icon: MapPinIcon, getValue: profile => {
			const address = getProfileDetailFieldValue(profile, "Indirizzo del campo");
			const location = profile.locations
				.map(({city, region}) => [city, region].filter(Boolean).join(", "))
				.filter(Boolean);
			return [...new Set([address, ...location].filter((value): value is string => Boolean(value)))].join(", ") || null;
		}},
		{label: "Numero campi pubblicati", icon: MegaphoneIcon, getValue: profile => formatProfileFactCount(profile.announcementCount)},
	],
	narrativeFieldLabels: ["Informazioni aggiuntive"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloCampiImpianti({profile, actions, authenticated, isOwner, returnTo}: {profile: GenericProfileDetail<"campi-impianti-sportivi">; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
}
