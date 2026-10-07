import type {ProfileType} from "@/features/profilo/profile-model";

export const ANONYMOUS_PROFILE_NAMES = {
	giocatore: "Giocatore",
	squadra: "Squadra",
	"staff-sportivo": "Staff sportivo",
	arbitro: "Arbitro",
} as const;

export type AnonymousNameProfileType = keyof typeof ANONYMOUS_PROFILE_NAMES;

export function supportsAnonymousName(type: ProfileType): type is AnonymousNameProfileType {
	return Object.hasOwn(ANONYMOUS_PROFILE_NAMES, type);
}

/** Resolve before constructing a public DTO, metadata or a search index. */
export function publicProfileName(type: ProfileType, anonymous: unknown, name: string | null): string | null {
	return anonymous === true && supportsAnonymousName(type) ? ANONYMOUS_PROFILE_NAMES[type] : name;
}
