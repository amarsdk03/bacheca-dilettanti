import type {PlayerProfileDetail} from "../../profile-detail-model";
import LatestProfileAnnouncements from "../LatestProfileAnnouncements";
import PlayerCareer from "../player/PlayerCareer";
import PlayerHeader from "../player/PlayerHeader";
import PlayerOverview from "../player/PlayerOverview";
import ProfileSocialLinksCard from "../ProfileSocialLinks";
import PlayerTabs from "../player/PlayerTabs";

export default function DettagliProfiloGiocatore({profile}: {profile: PlayerProfileDetail}) {
	const {player} = profile;
	return (
		<div className="flex flex-col gap-6 font-home-body">
			<PlayerHeader title={profile.title} imageUrl={profile.imageUrl} verified={profile.verified} primary={profile.primary} availabilityLabel={profile.availabilityLabel} locations={profile.locations} age={player.age} primaryRoles={player.primaryRoles} specificRoles={player.specificRoles} />
			<ProfileSocialLinksCard socialLinks={profile.socialLinks} />
			<PlayerTabs
				overview={<PlayerOverview sportTypes={player.sportTypes} specificRoles={player.specificRoles} preferredCategories={player.preferredCategories} preferredFoot={player.preferredFoot} height={player.height} weight={player.weight} presentation={player.presentation} highlightsUrl={player.highlightsUrl} />}
				career={<PlayerCareer entries={player.career} />}
				announcements={<LatestProfileAnnouncements announcements={profile.announcements} announcementsUnavailable={profile.announcementsUnavailable} />}
			/>
		</div>
	);
}
