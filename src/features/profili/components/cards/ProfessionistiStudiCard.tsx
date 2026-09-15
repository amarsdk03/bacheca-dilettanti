import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function ProfessionistiStudiCard({profile}: {profile: ProfileCardData<"professionisti-studi">}) {
	return <ProfileCardShell profile={profile} summary="Servizi per atleti e società" emptyPresentation="Questo professionista non ha ancora aggiunto una presentazione." facts={getProfileFacts(profile, ["figures", "specializations", "availability", "location"])} />;
}
