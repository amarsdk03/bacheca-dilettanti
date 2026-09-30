import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function ServiziConsulenzeCard({profile}: {profile: ProfileCardData<"servizi-consulenze">}) {
	return <ProfileCardShell profile={profile} summary="Servizi per atleti e società" emptyPresentation="Questo profilo non ha ancora aggiunto una presentazione." facts={getProfileFacts(profile, ["figures", "specializations", "availability", "location"])} />;
}
