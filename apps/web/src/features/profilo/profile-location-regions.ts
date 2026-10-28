import type {ProfileType} from "@/features/profilo/profile-model";

export const FOREIGN_PROFILE_REGION = "Estero";

export function allowsForeignProfileRegion(type: ProfileType): boolean {
	return type === "giocatore" || type === "staff-sportivo" || type === "arbitro" || type === "squadra";
}
