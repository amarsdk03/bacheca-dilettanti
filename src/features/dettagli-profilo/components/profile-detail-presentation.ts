import type {LucideIcon} from "lucide-react";
import type {GenericProfileDetail, ProfileDetailField} from "../profile-detail-model";
import type {ProfileFact} from "./ProfileFactsGrid";

export interface ProfileDetailPresentation {
	badges: readonly {fieldLabel?: string; getValues?: (profile: GenericProfileDetail) => readonly string[]}[];
	sections: readonly ProfileOverviewSection[];
	sidebarFields?: readonly {title: string; fieldLabel: string; icon: LucideIcon}[];
	ecosystemName: string;
	identifierName: string;
	facts: readonly {
		label: string;
		icon: LucideIcon;
		fieldLabel?: string;
		sourceFieldLabels?: readonly string[];
		getValue?: (profile: GenericProfileDetail) => string | null;
	}[];
	announcementsLabel?: string;
	hasExperiences?: boolean;
	careerLabel?: string;
}

export type ProfileOverviewSection =
	| {kind: "locations"; title: string}
	| {kind: "social"}
	| {kind: "field"; title: string; fieldLabel: string; icon: LucideIcon; centered?: boolean};

export function getProfileDetailBadgeValues(profile: GenericProfileDetail, presentation: ProfileDetailPresentation): string[] {
	const fields = getProfileDetailFields(profile);
	return [...new Set(presentation.badges.flatMap(({fieldLabel, getValues}) => {
		if (getValues) return getValues(profile);
		const field = fields.find(candidate => candidate.label === fieldLabel);
		return field?.items?.length ? field.items : field ? [field.value] : [];
	}).map(value => value.trim()).filter(value => value && value !== "Non specificato"))];
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
	return value == null ? "Non disponibile" : value.toLocaleString("it-IT");
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
