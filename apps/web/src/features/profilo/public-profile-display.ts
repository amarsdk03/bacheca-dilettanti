import {DISPONIBILITA_PROFILO_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {PROFESSIONAL_AVAILABILITY_OPTIONS} from "@/features/profilo/professional-availability";

export function availabilityLabel(value: string | null | undefined) {
	if (value === "non-specificare") return null;
	if (value === "svincolato") return "Svincolato";
	const professional = PROFESSIONAL_AVAILABILITY_OPTIONS.find(option => option.value === value);
	if (professional) return professional.label;
	return DISPONIBILITA_PROFILO_OPTIONS.find((option) => option.valore === value)?.etichetta ?? null;
}

export function profileInitials(title: string) {
	return title
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase("it-IT"))
		.join("") || "PR";
}
