import {Badge} from "@/components/ui/badge";
import {
	getPlayerRolePitchMarkers,
	PLAYER_ROLE_PITCH_POSITIONS,
	type PlayerRolePitchMarker,
} from "@/features/profilo/player-roles";
import {cn} from "@/lib/utils";

export {getPlayerRolePitchMarkers, PLAYER_ROLE_PITCH_POSITIONS};
export type {PlayerRolePitchMarker};

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

	return (
		<section className={cn("flex w-full max-w-60 flex-col gap-2 justify-self-center", className)} aria-label="Posizioni in campo">
			<div
				className="grid aspect-4/5 grid-cols-3 grid-rows-7 overflow-hidden rounded-sm border-4 border-white"
				style={{backgroundImage: "url('/sfondi/campo.png')", backgroundPosition: "center", backgroundSize: "cover", filter: "invert(1)"}}
			>
				{markers.map((marker) => (
					<Badge
						key={marker.role}
						variant={marker.isPrimary ? "default" : "secondary"}
						aria-label={marker.role}
						title={marker.role}
						className="z-10 min-w-8 place-self-center border border-white/50 bg-black/95 px-1.5 font-bold tracking-wide text-white shadow-md"
						style={{gridColumn: marker.column, gridRow: marker.row}}
					>
						{marker.abbreviation}
					</Badge>
				))}
			</div>
			<ul className="sr-only" aria-label="Ruoli posizionati in campo">
				{markers.map(marker => <li key={marker.role}>{(marker.isPrimary ? "Ruolo principale: " : "Ruolo specifico: ") + marker.role}</li>)}
			</ul>
		</section>
	);
}
