import type {CSSProperties} from "react";

import {Badge} from "@/components/ui/badge";
import {
	PLAYER_ROLE_PITCH_POSITIONS,
	type PlayerRolePitchMarker,
} from "@/features/dettagli-profilo/components/player/PlayerRolePitch";
import {cn} from "@/lib/utils";

export function getAnnouncementPlayerRolePitchMarkers(
	primaryRoles: readonly string[],
	secondaryRoles: readonly string[],
): PlayerRolePitchMarker[] {
	const seenRoles = new Set<string>();

	return [...primaryRoles, ...secondaryRoles].flatMap((value) => {
		const role = value.trim();
		if (!role || seenRoles.has(role)) return [];
		seenRoles.add(role);
		const position = PLAYER_ROLE_PITCH_POSITIONS[role];
		return position ? [{role, ...position}] : [];
	});
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

	const primaryRole = markers[0];
	return (
		<section
			className={cn("w-full max-w-60 self-center rounded-2xl border border-brand-indigo/15 bg-background/65 p-3 shadow-xs xl:w-56 xl:shrink-0 xl:self-auto", className)}
			aria-labelledby="announcement-player-role-pitch-title"
		>
			<div className="flex min-w-0 flex-col gap-0.5">
				<h2 id="announcement-player-role-pitch-title" className="font-home-display text-lg uppercase">Posizione</h2>
				<p className="truncate text-xs text-muted-foreground" title={primaryRole.role}>Principale: {primaryRole.role}</p>
			</div>
			<div
				className="relative mt-3 aspect-[7/10] overflow-hidden rounded-xl border border-brand-indigo/15 bg-muted"
				style={{backgroundImage: "url('/sfondi/campo.png')", backgroundPosition: "center", backgroundSize: "cover"}}
			>
				{markers.map((marker, index) => (
					<Badge
						key={marker.role}
						variant={index === 0 ? "default" : "secondary"}
						aria-label={marker.role}
						title={marker.role}
						className={cn(
							"absolute z-10 min-w-8 -translate-x-1/2 -translate-y-1/2 border px-1.5 shadow-sm",
							index === 0
								? "border-brand-indigo bg-brand-indigo text-brand-ink shadow-md"
								: "border-background bg-background/95 text-foreground",
						)}
						style={{left: marker.left + "%", top: marker.top + "%"} as CSSProperties}
					>
						{marker.abbreviation}
					</Badge>
				))}
			</div>
			<ul className="sr-only" aria-label="Ruoli posizionati in campo">
				{markers.map((marker, index) => (
					<li key={marker.role}>{(index === 0 ? "Ruolo principale: " : "Ruolo: ") + marker.role}</li>
				))}
			</ul>
		</section>
	);
}
