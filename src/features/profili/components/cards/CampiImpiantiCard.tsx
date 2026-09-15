import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function CampiImpiantiCard({profile}: {profile: ProfileCardData<"campi-impianti-sportivi">}) {
	return <ProfileCardShell profile={profile} summary="Spazi e servizi sportivi" emptyPresentation="Questo impianto non ha ancora aggiunto una presentazione." facts={getProfileFacts(profile, ["types", "price", "services", "location"])} />;
}
