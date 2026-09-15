import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function CreatorCard({profile}: {profile: ProfileCardData<"creators">}) {
	return <ProfileCardShell profile={profile} summary="Contenuti per la community" emptyPresentation="Questo creator non ha ancora aggiunto una presentazione." facts={getProfileFacts(profile, ["content", "location"])} />;
}
