import type {ReactNode} from "react";
import {MegaphoneIcon, VideoIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";
import {formatProfileFactCount, getProfileDetailFieldValue} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipologia contenuti", fieldLabel: "Tipologia di contenuti", icon: VideoIcon, getValue: profile => getProfileDetailFieldValue(profile, "Tipologia di contenuti")},
		{label: "Numero annunci pubblicati", icon: MegaphoneIcon, getValue: profile => formatProfileFactCount(profile.announcementCount)},
	],
	narrativeFieldLabels: [],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloCreator({profile, actions, authenticated, returnTo}: {profile: GenericProfileDetail<"creators">; actions?: ReactNode; authenticated: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} authenticated={authenticated} returnTo={returnTo} />;
}
