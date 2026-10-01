import type {ReactNode} from "react";
import {MegaphoneIcon, ShirtIcon, UserRoundPlusIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";
import {formatProfileFactCount, getProfileDetailFieldValue} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipologia calcio", fieldLabel: "Tipologie sportive", icon: ShirtIcon, getValue: profile => getProfileDetailFieldValue(profile, "Tipologie sportive")},
		{label: "Follower", icon: UserRoundPlusIcon, getValue: profile => formatProfileFactCount(profile.followerCount)},
		{label: "Eventi pubblicati", icon: MegaphoneIcon, getValue: profile => formatProfileFactCount(profile.announcementCount)},
	],
	narrativeFieldLabels: [],
	announcementsLabel: "Eventi pubblicati",
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloTorneoEvento({profile, actions, authenticated, isOwner, returnTo}: {profile: GenericProfileDetail<"torneo-evento">; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
}
