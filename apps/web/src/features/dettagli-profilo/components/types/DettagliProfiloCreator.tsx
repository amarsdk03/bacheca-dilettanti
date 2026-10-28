import type {ReactNode} from "react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import {NON_PLAYER_PRESENTATIONS} from "../non-player-presentations";

export default function DettagliProfiloCreator({profile, actions, authenticated, isOwner, returnTo}: {profile: GenericProfileDetail<"creators">; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	return <ProfileDetailsLayout profile={profile} presentation={NON_PLAYER_PRESENTATIONS["creators"]} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
}
