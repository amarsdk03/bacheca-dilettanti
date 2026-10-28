export const PROFESSIONAL_AVAILABILITY_OPTIONS = [
	{value: "non-specificare", label: "Non specificare"},
	{value: "in-presenza", label: "In presenza"},
	{value: "online", label: "Online"},
	{value: "entrambe", label: "In presenza e online"},
] as const;

export function normalizeProfessionalAvailability(value: string | null | undefined) {
	return PROFESSIONAL_AVAILABILITY_OPTIONS.find(option => option.value === value)?.value ?? "non-specificare";
}
