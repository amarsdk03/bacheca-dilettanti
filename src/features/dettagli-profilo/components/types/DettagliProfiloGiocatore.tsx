import type {CSSProperties, ReactNode} from "react";
import type {PlayerProfileDetail} from "../../profile-detail-model";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import LatestProfileAnnouncements from "../LatestProfileAnnouncements";
import PlayerCareer from "../player/PlayerCareer";
import PlayerHeader from "../player/PlayerHeader";
import PlayerOverview from "../player/PlayerOverview";
import PlayerTabs from "../player/PlayerTabs";
import SimilarProfiles from "../SimilarProfiles";

export default function DettagliProfiloGiocatore({profile, actions, authenticated, isOwner, returnTo}: {profile: PlayerProfileDetail; actions?: ReactNode; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	const {player} = profile;

	return (
		<div className="public-profile-detail flex min-w-0 flex-col gap-6 font-home-body" style={{"--profile-accent": getProfileAccent("giocatore")} as CSSProperties}>
			<PlayerHeader
				anonymousName={profile.anonymousName}
				title={profile.title}
				imageUrl={profile.imageUrl}
				emailConfirmed={profile.emailConfirmed}
				officialVerified={profile.officialVerified}
				primary={profile.primary}
				availabilityLabel={profile.availabilityLabel}
				player={player}
				actions={actions}
			/>
			<PlayerTabs
				overview={<PlayerOverview presentation={player.presentation} highlightsUrl={player.highlightsUrl} privateHighlights={player.privateHighlights} locations={profile.locations} socialLinks={profile.socialLinks} sportTypes={player.sportTypes} primaryRoles={player.primaryRoles} specificRoles={player.specificRoles} height={player.height} weight={player.weight} profileId={profile.id} authenticated={authenticated} returnTo={returnTo} />}
				career={<PlayerCareer entries={player.career} />}
				announcements={<LatestProfileAnnouncements announcements={profile.announcements} announcementsUnavailable={profile.announcementsUnavailable} isOwner={isOwner} />}
				similarProfiles={<SimilarProfiles profiles={profile.similarProfiles} unavailable={profile.similarProfilesUnavailable} />}
			/>
		</div>
	);
}
