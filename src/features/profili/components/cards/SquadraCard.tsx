import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type ProfileCardData} from "./profile-card-model";

export default function SquadraCard({profile}: {profile: ProfileCardData<"squadra">}) {
	return (
		<ProfileCardShell
			profile={profile}
			summary={profile.summary ?? "Società e opportunità sportive"}
			emptyPresentation="Questa squadra non ha ancora aggiunto una presentazione."
			facts={getProfileFacts(profile, ["types", "headquarters", "location"])}
		/>
	);
}
