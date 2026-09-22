export const PLAYER_PRIMARY_ROLES = ["Portiere", "Difensore", "Centrocampista", "Attaccante"] as const;

export type PlayerPrimaryRole = typeof PLAYER_PRIMARY_ROLES[number];

export const PLAYER_SPECIFIC_ROLES_BY_PRIMARY = {
	Portiere: [],
	Difensore: ["Terzino destro", "Difensore centrale", "Terzino sinistro"],
	Centrocampista: ["Mediano", "Esterno sinistro", "Centrale", "Esterno destro", "Trequartista"],
	Attaccante: ["Ala sinistra", "Seconda Punta", "Ala destra", "Punta centrale"],
} as const satisfies Record<PlayerPrimaryRole, readonly string[]>;

export type PlayerSpecificRole = typeof PLAYER_SPECIFIC_ROLES_BY_PRIMARY[PlayerPrimaryRole][number];
export type PlayerRole = PlayerPrimaryRole | PlayerSpecificRole;

const PRIMARY_ROLE_SET = new Set<string>(PLAYER_PRIMARY_ROLES);
const LEGACY_SPECIFIC_ROLE_ALIASES: Record<string, PlayerSpecificRole> = {
	Libero: "Difensore centrale",
	"Esterno sinistro a tutta fascia": "Esterno sinistro",
	"Centrocampista sinistro": "Esterno sinistro",
	"Centrocampista centrale": "Centrale",
	"Centrocampista destro": "Esterno destro",
	"Esterno destro a tutta fascia": "Esterno destro",
	"Attaccante sinistro / Seconda punta sinistra": "Ala sinistra",
	"Attaccante destro / Seconda punta destra": "Ala destra",
	Centravanti: "Punta centrale",
	"Seconda punta": "Seconda Punta",
};

export const PLAYER_PRIMARY_ROLE_BY_SPECIFIC = Object.fromEntries(
	Object.entries(PLAYER_SPECIFIC_ROLES_BY_PRIMARY).flatMap(([primaryRole, roles]) =>
		roles.map(role => [role, primaryRole]),
	),
) as Record<PlayerSpecificRole, PlayerPrimaryRole>;

const SPECIFIC_ROLE_SET = new Set<string>(Object.keys(PLAYER_PRIMARY_ROLE_BY_SPECIFIC));

function cleanRole(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizePlayerPrimaryRole(value: unknown): PlayerPrimaryRole | null {
	const role = cleanRole(value);
	return role && PRIMARY_ROLE_SET.has(role) ? role as PlayerPrimaryRole : null;
}

export function normalizePlayerSpecificRole(value: unknown): PlayerSpecificRole | null {
	const role = cleanRole(value);
	if (!role) return null;
	if (SPECIFIC_ROLE_SET.has(role)) return role as PlayerSpecificRole;
	return LEGACY_SPECIFIC_ROLE_ALIASES[role] ?? null;
}

function normalizeUnique<Role extends string>(
	values: readonly unknown[],
	normalize: (value: unknown) => Role | null,
) {
	return [...new Set(values.flatMap(value => normalize(value) ?? []))];
}

export function normalizePlayerPrimaryRoles(values: readonly unknown[]) {
	return normalizeUnique(values, normalizePlayerPrimaryRole);
}

export function normalizePlayerSpecificRoles(values: readonly unknown[]) {
	return normalizeUnique(values, normalizePlayerSpecificRole);
}

export function getPlayerSpecificRoleOptions(primaryRoles: readonly unknown[]) {
	return normalizePlayerPrimaryRoles(primaryRoles).flatMap(role => [...PLAYER_SPECIFIC_ROLES_BY_PRIMARY[role]]);
}

export function normalizePlayerRoleSelection(
	primaryRoles: readonly unknown[],
	specificRoles: readonly unknown[],
) {
	const primary = normalizePlayerPrimaryRoles(primaryRoles);
	const allowedPrimary = new Set(primary);
	const specific = normalizePlayerSpecificRoles(specificRoles).filter(role =>
		allowedPrimary.has(PLAYER_PRIMARY_ROLE_BY_SPECIFIC[role]),
	);
	return {primary, specific};
}

export interface PlayerRolePitchPosition {
	abbreviation: string;
	column: 1 | 2 | 3;
	row: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export interface PlayerRolePitchMarker extends PlayerRolePitchPosition {
	isPrimary: boolean;
	role: PlayerRole;
}

export const PLAYER_ROLE_PITCH_POSITIONS: Record<PlayerRole, PlayerRolePitchPosition> = {
	"Punta centrale": {abbreviation: "PC", column: 2, row: 1},
	"Ala sinistra": {abbreviation: "AS", column: 1, row: 2},
	"Seconda Punta": {abbreviation: "SP", column: 2, row: 2},
	"Ala destra": {abbreviation: "AD", column: 3, row: 2},
	"Trequartista": {abbreviation: "TQ", column: 2, row: 3},
	"Esterno sinistro": {abbreviation: "ES", column: 1, row: 4},
	"Centrale": {abbreviation: "CC", column: 2, row: 4},
	"Esterno destro": {abbreviation: "ED", column: 3, row: 4},
	"Mediano": {abbreviation: "MED", column: 2, row: 5},
	"Terzino sinistro": {abbreviation: "TS", column: 1, row: 6},
	"Difensore centrale": {abbreviation: "DC", column: 2, row: 6},
	"Terzino destro": {abbreviation: "TD", column: 3, row: 6},
	"Portiere": {abbreviation: "POR", column: 2, row: 7},
	"Attaccante": {abbreviation: "ATT", column: 2, row: 2},
	"Centrocampista": {abbreviation: "CEN", column: 2, row: 4},
	"Difensore": {abbreviation: "DIF", column: 2, row: 6},
};

export function getPlayerRolePitchMarkers(
	primaryRoles: readonly unknown[],
	specificRoles: readonly unknown[],
): PlayerRolePitchMarker[] {
	const primary = normalizePlayerPrimaryRoles(primaryRoles);
	const specific = normalizePlayerSpecificRoles(specificRoles);
	const specializedGroups = new Set(specific.map(role => PLAYER_PRIMARY_ROLE_BY_SPECIFIC[role]));
	const markers: PlayerRolePitchMarker[] = [
		...primary.filter(role => !specializedGroups.has(role)).map(role => ({
			role,
			isPrimary: true,
			...PLAYER_ROLE_PITCH_POSITIONS[role],
		})),
		...specific.map(role => ({
			role,
			isPrimary: false,
			...PLAYER_ROLE_PITCH_POSITIONS[role],
		})),
	];
	return markers.sort((left, right) => left.row - right.row || left.column - right.column);
}
