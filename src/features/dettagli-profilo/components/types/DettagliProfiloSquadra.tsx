import type {ReactNode} from "react";
import {MegaphoneIcon, ShirtIcon, TagsIcon, UserRoundPlusIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";
import {formatProfileFactCount} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipologia calcio", icon: ShirtIcon},
		{label: "Categoria attuale", icon: TagsIcon},
		{label: "Follower", icon: UserRoundPlusIcon, getValue: profile => formatProfileFactCount(profile.followerCount)},
		{label: "Annunci pubblicati", icon: MegaphoneIcon, getValue: profile => formatProfileFactCount(profile.announcementCount)},
	],
	narrativeFieldLabels: [],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloSquadra({profile, actions, authenticated, isOwner, returnTo}: {profile: GenericProfileDetail<"squadra">; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
}
