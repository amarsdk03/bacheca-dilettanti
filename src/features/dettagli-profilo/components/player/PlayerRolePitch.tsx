import type {CSSProperties} from "react";

import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";

interface RolePitchPosition {
	abbreviation: string;
	left: number;
	top: number;
}

export interface PlayerRolePitchMarker extends RolePitchPosition {
	role: string;
}

export const PLAYER_ROLE_PITCH_POSITIONS: Record<string, RolePitchPosition> = {
	"Portiere": {abbreviation: "POR", left: 50, top: 89},
	"Difensore": {abbreviation: "DIF", left: 50, top: 69},
	"Centrocampista": {abbreviation: "CEN", left: 50, top: 50},
	"Attaccante": {abbreviation: "ATT", left: 50, top: 18},
	"Libero": {abbreviation: "LIB", left: 50, top: 80},
	"Terzino sinistro": {abbreviation: "TS", left: 18, top: 70},
	"Difensore centrale": {abbreviation: "DC", left: 50, top: 70},
	"Terzino destro": {abbreviation: "TD", left: 82, top: 70},
	"Esterno sinistro a tutta fascia": {abbreviation: "ES", left: 18, top: 58},
	"Esterno destro a tutta fascia": {abbreviation: "ED", left: 82, top: 58},
	"Mediano": {abbreviation: "MED", left: 50, top: 58},
	"Centrocampista sinistro": {abbreviation: "CS", left: 18, top: 45},
	"Centrocampista centrale": {abbreviation: "CC", left: 50, top: 45},
	"Centrocampista destro": {abbreviation: "CD", left: 82, top: 45},
	"Trequartista": {abbreviation: "TQ", left: 50, top: 35},
	"Ala sinistra": {abbreviation: "ALS", left: 18, top: 27},
	"Ala destra": {abbreviation: "ALD", left: 82, top: 27},
	"Attaccante sinistro / Seconda punta sinistra": {abbreviation: "ATS", left: 30, top: 20},
	"Centravanti": {abbreviation: "CA", left: 50, top: 15},
	"Attaccante destro / Seconda punta destra": {abbreviation: "ATD", left: 70, top: 20},
	"Seconda punta": {abbreviation: "SP", left: 50, top: 25},
};

export function getPlayerRolePitchMarkers(
	primaryRoles: readonly string[],
	specificRoles: readonly string[],
): PlayerRolePitchMarker[] {
	const sourceRoles = specificRoles.length > 0 ? specificRoles : primaryRoles;
	const seenRoles = new Set<string>();

	return sourceRoles.flatMap((value) => {
		const role = value.trim();
		if (!role || seenRoles.has(role)) return [];
		seenRoles.add(role);
		const position = PLAYER_ROLE_PITCH_POSITIONS[role];
		return position ? [{role, ...position}] : [];
	});
}

export default function PlayerRolePitch({
	primaryRoles,
	specificRoles,
	className,
}: {
	primaryRoles: readonly string[];
	specificRoles: readonly string[];
	className?: string;
}) {
	const markers = getPlayerRolePitchMarkers(primaryRoles, specificRoles);
	if (markers.length === 0) return null;

	const primaryRole = markers[0];
	return (
		<section className={cn("w-full max-w-60 self-center rounded-2xl border border-brand-indigo/15 bg-background/65 p-3 shadow-xs xl:w-56 xl:shrink-0 xl:self-auto", className)} aria-labelledby="player-role-pitch-title">
			<div className="flex min-w-0 flex-col gap-0.5">
				<h2 id="player-role-pitch-title" className="font-home-display text-lg uppercase">RUOLI</h2>
				<p className="truncate text-xs text-muted-foreground" title={primaryRole.role}>Principale: {primaryRole.role}</p>
			</div>
			<div
				className="relative mt-4 aspect-2/3 overflow-hidden"
				style={{backgroundImage: "url('/sfondi/campo.png')", backgroundPosition: "center", backgroundSize: "cover"}}
			>
				{markers.map((marker, index) => (
					<Badge
						key={marker.role}
						variant={index === 0 ? "default" : "secondary"}
						aria-label={marker.role}
						title={marker.role}
						className={"absolute z-10 min-w-8 -translate-x-1/2 -translate-y-1/2 border px-1.5 shadow-md border-black/75 bg-background/95 text-foreground"}
						style={{left: marker.left + "%", top: marker.top + "%"} as CSSProperties}
					>
						{marker.abbreviation}
					</Badge>
				))}
			</div>
			<ul className="sr-only" aria-label="Ruoli posizionati in campo">
				{markers.map((marker, index) => <li key={marker.role}>{(index === 0 ? "Ruolo principale: " : "Ruolo: ") + marker.role}</li>)}
			</ul>
		</section>
	);
}
