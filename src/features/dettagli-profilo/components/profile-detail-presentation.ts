import {MegaphoneIcon, UserRoundPlusIcon, type LucideIcon} from "lucide-react";
import type {GenericProfileDetail, ProfileDetailField} from "../profile-detail-model";
import type {ProfileFact} from "./ProfileFactsGrid";

export interface ProfileDetailPresentation {
	facts: readonly {
		label: string;
		icon: LucideIcon;
		getValue?: (profile: GenericProfileDetail) => string | null;
	}[];
	narrativeFieldLabels: readonly string[];
	hasExperiences?: boolean;
}

export function getProfileDetailFields(profile: GenericProfileDetail): ProfileDetailField[] {
	return [...new Map([...profile.primaryFields, ...profile.fields].map(field => [field.label, field])).values()];
}

export function getProfileDetailFacts(profile: GenericProfileDetail, presentation: ProfileDetailPresentation): ProfileFact[] {
	const fields = getProfileDetailFields(profile);
	return [
		...presentation.facts.map(({label, icon, getValue}) => {
			const value = (getValue ? getValue(profile) : fields.find(field => field.label === label)?.value)?.trim();
			return {label, icon, value: value && value !== "Non specificato" ? value : null};
		}),
		{label: "Follower", icon: UserRoundPlusIcon, value: profile.followerCount?.toLocaleString("it-IT") ?? null},
		{label: "Num. annunci", icon: MegaphoneIcon, value: profile.announcementCount?.toLocaleString("it-IT") ?? null},
	];
}
