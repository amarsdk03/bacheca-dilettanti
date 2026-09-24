import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function StaffSportivoCard({profile}: {profile: ProfileCardData<"staff-sportivo">}) {
	return <ProfileCardShell profile={profile} summary={profile.summary ?? "Competenze per il campo"} emptyPresentation="Questo profilo staff non ha ancora aggiunto una presentazione." facts={getProfileFacts(profile, ["figures", "availability", "location"])} />;
}
