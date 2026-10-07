import type {LucideIcon} from "lucide-react";
import type {GenericProfileDetail, ProfileDetailField} from "../profile-detail-model";
import type {ProfileFact} from "./ProfileFactsGrid";

export interface ProfileDetailPresentation {
	facts: readonly {
		label: string;
		icon: LucideIcon;
		fieldLabel?: string;
		sourceFieldLabels?: readonly string[];
		getValue?: (profile: GenericProfileDetail) => string | null;
	}[];
	narrativeFieldLabels: readonly string[];
	announcementsLabel?: string;
	hasExperiences?: boolean;
	presentationLabel?: string;
	careerLabel?: string;
}

export function getProfileDetailFields(profile: GenericProfileDetail): ProfileDetailField[] {
	return [...new Map([...profile.primaryFields, ...profile.fields].map(field => [field.label, field])).values()];
}

export function compactProfileFactList(items: readonly string[], maxItems = 2): string | null {
	const values = [...new Set(items.map(item => item.trim()).filter(Boolean))];
	if (values.length === 0) return null;
	const visibleValues = values.slice(0, maxItems);
	return values.length > maxItems
		? `${visibleValues.join(", ")} +${values.length - maxItems}`
		: visibleValues.join(", ");
}

export function getProfileDetailFieldValue(profile: GenericProfileDetail, label: string): string | null {
	const field = getProfileDetailFields(profile).find(candidate => candidate.label === label);
	if (!field || field.value.trim() === "Non specificato") return null;
	if (field.items?.length) return compactProfileFactList(field.items);
	return field.value.replace(/\s+/g, " ").trim() || null;
}

export function formatProfileFactCount(value: number | null): string | null {
	return value === null ? null : value.toLocaleString("it-IT");
}

export function getProfileDetailFacts(profile: GenericProfileDetail, presentation: ProfileDetailPresentation): ProfileFact[] {
	const fields = getProfileDetailFields(profile);
	return presentation.facts.map(({label, fieldLabel, icon, getValue}) => {
		const field = fields.find(candidate => candidate.label === (fieldLabel ?? label));
		const value = (getValue ? getValue(profile) : getProfileDetailFieldValue(profile, fieldLabel ?? label))?.trim();
		const items = field?.items ? [...new Set(field.items.map(item => item.trim()).filter(Boolean))] : [];
		return {label, icon, value: items.length > 0
			? [...items.slice(0, 2), ...(items.length > 2 ? [`+${items.length - 2}`] : [])]
			: value && value !== "Non specificato" ? value : null};
	});
}
