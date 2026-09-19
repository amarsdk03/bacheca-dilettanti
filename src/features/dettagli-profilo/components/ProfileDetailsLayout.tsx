import type {GenericProfileDetail, NonPlayerProfileType} from "../profile-detail-model";
import LatestProfileAnnouncements from "./LatestProfileAnnouncements";
import ProfileDetailsOverview, {ProfileDetailsHeader} from "./ProfileDetailsOverview";
import type {ProfileDetailPresentation} from "./profile-detail-presentation";
import ProfileSocialLinksCard from "./ProfileSocialLinks";
import ProfileTabs from "./ProfileTabs";

export default function ProfileDetailsLayout<Type extends NonPlayerProfileType>({
	profile,
	presentation,
}: {
	profile: GenericProfileDetail<Type>;
	presentation: ProfileDetailPresentation;
}) {
	return (
		<div className="flex flex-col gap-6 font-home-body">
			<ProfileDetailsHeader profile={profile} presentation={presentation} />
			<ProfileSocialLinksCard socialLinks={profile.socialLinks} />
			<ProfileTabs
				label="Informazioni del profilo"
				overview={<ProfileDetailsOverview profile={profile} presentation={presentation} />}
				announcements={<LatestProfileAnnouncements announcements={profile.announcements} announcementsUnavailable={profile.announcementsUnavailable} />}
			/>
		</div>
	);
}
