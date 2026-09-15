import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function TorneoEventoCard({profile}: {profile: ProfileCardData<"torneo-evento">}) {
	return <ProfileCardShell profile={profile} summary="Tornei e manifestazioni" emptyPresentation="Questo evento non ha ancora aggiunto una presentazione." facts={getProfileFacts(profile, ["types", "headquarters", "location"])} />;
}
