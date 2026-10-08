import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type PlayerCardData,} from "./profile-card-model";
import DynamicReactFlag from "@/components/dynamic/DynamicReactFlag";
import {nationalityLabel} from "@/features/profilo/player-nationalities";

export default function GiocatoreCard({profile}: {profile: PlayerCardData}) {
	const countryName = nationalityLabel(profile.nationalityCode);
	return (
		<ProfileCardShell
			profile={profile}
			summary={<span className="flex flex-wrap items-center gap-2">
				<span>{profile.roles.join(" · ") || "Profilo giocatore"}</span>
				{profile.nationalityCode && countryName && <span role="img" aria-label={`Nazionalità: ${countryName}`} title={countryName} className="inline-flex shrink-0">
					<DynamicReactFlag code={profile.nationalityCode} className="h-4 w-6 rounded-xs ring-1 ring-border" />
				</span>}
			</span>}
			emptyPresentation="Questo giocatore non ha ancora aggiunto una presentazione."
			facts={getProfileFacts(profile, ["age", "gender", "availability", "category"])}
		/>
	);
}
