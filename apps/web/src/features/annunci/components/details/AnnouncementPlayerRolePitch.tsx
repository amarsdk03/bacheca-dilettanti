import {TargetIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import PlayerRolePitch from "@/features/dettagli-profilo/components/player/PlayerRolePitch";
import {getPlayerRolePitchMarkers} from "@/features/profilo/player-roles";
import StructuredFieldList from "@/components/data-info/StructuredFieldList";
import {Badge} from "@/components/ui/badge";

export const getAnnouncementPlayerRolePitchMarkers = getPlayerRolePitchMarkers;

export default function AnnouncementPlayerRolePitch({primaryRoles, secondaryRoles, textOnly = false, className}: {
	primaryRoles: readonly string[];
	secondaryRoles: readonly string[];
	textOnly?: boolean;
	className?: string;
}) {
	if (textOnly ? primaryRoles.length + secondaryRoles.length === 0 : getPlayerRolePitchMarkers(primaryRoles, secondaryRoles).length === 0) return null;
	return <Card className={className}>
		<CardHeader><CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><TargetIcon className="profile-detail-accent size-5" aria-hidden="true" />Ruoli</h2></CardTitle></CardHeader>
		{textOnly ? <CardContent>
			<dl className="flex flex-col gap-5">
				{[
					{label: "Ruoli principali", values: primaryRoles},
					{label: "Ruoli specifici", values: secondaryRoles},
				].map(({label, values}) => <div key={label} className="flex min-w-0 flex-col gap-2">
					<dt className="text-sm font-semibold">{label}</dt>
					<dd>{values.length > 0 ? <ul className="flex flex-wrap gap-2">
						{values.map(value => <li key={value} className="min-w-0 max-w-full"><Badge variant="secondary" className="h-auto max-w-full whitespace-normal wrap-anywhere">{value}</Badge></li>)}
					</ul> : <p className="text-sm text-muted-foreground">Non specificato</p>}</dd>
				</div>)}
			</dl>
		</CardContent> : <CardContent className="flex flex-col items-center gap-5">
			<PlayerRolePitch primaryRoles={primaryRoles} specificRoles={secondaryRoles} />
			{secondaryRoles.length > 0 && <div className="w-full"><StructuredFieldList items={secondaryRoles} style="chips" /></div>}
		</CardContent>}
	</Card>;
}
