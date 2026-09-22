import type {ReactNode} from "react";
import {LinkIcon, VideoIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipologia di contenuti", icon: VideoIcon},
		{label: "Canali social", icon: LinkIcon, getValue: profile => Object.values(profile.socialLinks).filter(link => link.trim()).length.toLocaleString("it-IT")},
	],
	narrativeFieldLabels: [],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloCreator({profile, actions}: {profile: GenericProfileDetail<"creators">; actions?: ReactNode}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} />;
}
