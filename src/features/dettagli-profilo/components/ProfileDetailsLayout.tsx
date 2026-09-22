import type {CSSProperties, ReactNode} from "react";
import type {GenericProfileDetail, NonPlayerProfileType} from "../profile-detail-model";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import LatestProfileAnnouncements from "./LatestProfileAnnouncements";
import ProfileDetailsOverview, {ProfileDetailsHeader} from "./ProfileDetailsOverview";
import type {ProfileDetailPresentation} from "./profile-detail-presentation";
import ProfileExperienceHistory from "./ProfileExperienceHistory";
import ProfileTabs from "./ProfileTabs";
import SimilarProfiles from "./SimilarProfiles";

export default function ProfileDetailsLayout<Type extends NonPlayerProfileType>({
	profile,
	presentation,
	actions,
}: {
	profile: GenericProfileDetail<Type>;
	presentation: ProfileDetailPresentation;
	actions?: ReactNode;
}) {
	return (
		<div className="public-profile-detail flex min-w-0 flex-col gap-6 font-home-body" style={{
			"--profile-accent": getProfileAccent(profile.type),
			// Keep white control labels readable even for the yellow and orange profile accents.
			"--primary": "color-mix(in srgb, var(--profile-accent) 65%, black)",
		} as CSSProperties}>
			<ProfileDetailsHeader profile={profile} presentation={presentation} actions={actions} />
			<ProfileTabs
				label="Informazioni del profilo"
				presentation="profile"
				overview={<ProfileDetailsOverview profile={profile} presentation={presentation} />}
				career={presentation.hasExperiences ? <ProfileExperienceHistory experiences={profile.experiences} /> : undefined}
				careerLabel="Esperienze"
				announcements={<LatestProfileAnnouncements announcements={profile.announcements} announcementsUnavailable={profile.announcementsUnavailable} />}
				similarProfiles={<SimilarProfiles profiles={profile.similarProfiles} unavailable={profile.similarProfilesUnavailable} />}
			/>
		</div>
	);
}
