import ProfileCardShell from "./ProfileCardShell";
import {
	getProfileFacts,
	type PlayerCardData,
} from "./profile-card-model";

export default function GiocatoreCard({profile}: {profile: PlayerCardData}) {
	return (
		<ProfileCardShell
			profile={profile}
			summary={profile.roles.join(" · ") || "Profilo giocatore"}
			emptyPresentation="Questo giocatore non ha ancora aggiunto una presentazione."
			facts={getProfileFacts(profile, ["roles", "types", "location", "availability"])}
		/>
	);
}
