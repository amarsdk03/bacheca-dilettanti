import ProfileCardShell from "./ProfileCardShell";
import {getProfileFacts, type PlayerCardData,} from "./profile-card-model";
import DynamicReactFlag from "@/components/dynamic/DynamicReactFlag";
import {nationalityLabel} from "@/features/profilo/player-nationalities";

export default function GiocatoreCard({profile}: {profile: PlayerCardData}) {
	const nationalityCode = profile.nationalityCode ?? null;
	const countryName = nationalityLabel(nationalityCode) ?? undefined;
	const hasNationality = Boolean(nationalityCode && countryName);
	const visibleRoles = profile.roles.slice(0, hasNationality ? 4 : 5);
	const roles = visibleRoles.length > 0 ? visibleRoles : ["Profilo giocatore"];
	return (
		<ProfileCardShell
			profile={profile}
			summary={<span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
				{roles.map((role, index) => <span key={`${role}-${index}`} className="inline-flex items-center gap-x-1.5">
					<span>{role}</span>
					{index < roles.length - 1 && <span aria-hidden="true">·</span>}
				</span>)}
				{hasNationality && <span role="img" aria-label={`Nazionalità: ${countryName}`} title={countryName} className="inline-flex shrink-0">
					<DynamicReactFlag code={nationalityCode} className="h-3 w-4.5 rounded-xs ms-px" />
				</span>}
			</span>}
			emptyPresentation="Questo giocatore non ha ancora aggiunto una presentazione."
			facts={getProfileFacts(profile)}
		/>
	);
}
