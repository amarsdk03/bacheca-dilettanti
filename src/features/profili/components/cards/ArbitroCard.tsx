import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function ArbitroCard({profile}: {profile: ProfileCardData<"arbitro">}) {
	return <ProfileCardShell profile={profile} summary="Disponibilità arbitrale" emptyPresentation="Questo arbitro non ha ancora aggiunto una presentazione." facts={getProfileFacts(profile, ["availability", "location"])} />;
}
