import {Badge} from "@/components/ui/badge";
import {
	getPlayerRolePitchMarkers,
	normalizePlayerPrimaryRoles,
} from "@/features/profilo/player-roles";
import {cn} from "@/lib/utils";

export function getAnnouncementPlayerRolePitchMarkers(
	primaryRoles: readonly string[],
	secondaryRoles: readonly string[],
) {
	return getPlayerRolePitchMarkers(primaryRoles, secondaryRoles);
}

export default function AnnouncementPlayerRolePitch({
	primaryRoles,
	secondaryRoles,
	className,
}: {
	primaryRoles: readonly string[];
	secondaryRoles: readonly string[];
	className?: string;
}) {
	const markers = getAnnouncementPlayerRolePitchMarkers(primaryRoles, secondaryRoles);
	if (markers.length === 0) return null;

	const primaryRole = normalizePlayerPrimaryRoles(primaryRoles)[0] ?? null;
	return (
		<section
			className={cn("w-full max-w-60 self-center rounded-2xl border border-brand-indigo/15 bg-background/65 p-3 shadow-xs xl:w-56 xl:shrink-0 xl:self-auto", className)}
			aria-labelledby="announcement-player-role-pitch-title"
		>
			<div className="flex min-w-0 flex-col gap-0.5">
				<h2 id="announcement-player-role-pitch-title" className="font-home-display text-lg uppercase">Posizione</h2>
				{primaryRole && <p className="truncate text-xs text-muted-foreground" title={primaryRole}>Principale: {primaryRole}</p>}
			</div>
			<div
				className="mt-3 grid aspect-[7/10] grid-cols-3 grid-rows-7 overflow-hidden rounded-xl border border-brand-indigo/15 bg-muted"
				style={{backgroundImage: "url('/sfondi/campo.png')", backgroundPosition: "center", backgroundSize: "cover"}}
			>
				{markers.map((marker) => (
					<Badge
						key={marker.role}
						variant={marker.isPrimary ? "default" : "secondary"}
						aria-label={marker.role}
						title={marker.role}
						className={cn(
							"z-10 min-w-8 place-self-center border px-1.5 shadow-sm",
							marker.isPrimary
								? "border-brand-indigo bg-brand-indigo text-brand-ink shadow-md"
								: "border-background bg-background/95 text-foreground",
						)}
						style={{gridColumn: marker.column, gridRow: marker.row}}
					>
						{marker.abbreviation}
					</Badge>
				))}
			</div>
			<ul className="sr-only" aria-label="Ruoli posizionati in campo">
				{markers.map((marker) => (
					<li key={marker.role}>{(marker.isPrimary ? "Ruolo principale: " : "Ruolo specifico: ") + marker.role}</li>
				))}
			</ul>
		</section>
	);
}
