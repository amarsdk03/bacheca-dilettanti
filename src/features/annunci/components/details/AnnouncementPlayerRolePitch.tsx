import {TargetIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import PlayerRolePitch from "@/features/dettagli-profilo/components/player/PlayerRolePitch";
import {getPlayerRolePitchMarkers} from "@/features/profilo/player-roles";

export const getAnnouncementPlayerRolePitchMarkers = getPlayerRolePitchMarkers;

export default function AnnouncementPlayerRolePitch({primaryRoles, secondaryRoles, className}: {
	primaryRoles: readonly string[];
	secondaryRoles: readonly string[];
	className?: string;
}) {
	if (getPlayerRolePitchMarkers(primaryRoles, secondaryRoles).length === 0) return null;
	return <Card className={className}>
		<CardHeader><CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><TargetIcon className="profile-detail-accent size-5" aria-hidden="true" />Ruoli</h2></CardTitle></CardHeader>
		<CardContent className="flex flex-col items-center gap-5">
			<PlayerRolePitch primaryRoles={primaryRoles} specificRoles={secondaryRoles} />
			{secondaryRoles.length > 0 && <p className="w-full text-sm leading-6 wrap-anywhere">{secondaryRoles.join(", ")}</p>}
		</CardContent>
	</Card>;
}
