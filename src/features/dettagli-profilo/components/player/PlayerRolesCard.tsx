import {TargetIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {PlayerProfileData} from "../../profile-detail-model";
import PlayerRolePitch from "@/features/dettagli-profilo/components/player/PlayerRolePitch";

export default function PlayerRolesCard({primaryRoles, specificRoles, preferredCategories}: Pick<PlayerProfileData, "primaryRoles" | "specificRoles" | "preferredCategories">) {
	const groups = [
		{label: "Ruoli principali", values: primaryRoles},
		{label: "Ruoli specifici", values: specificRoles},
		{label: "Categorie ricercate", values: preferredCategories},
	];

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>
					<h2 className="flex items-center gap-2 font-home-display text-2xl uppercase">
						<TargetIcon className="profile-detail-accent size-5" aria-hidden="true" /> Ruoli e categorie
					</h2>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="mt-2 mb-8">
					<PlayerRolePitch primaryRoles={primaryRoles} specificRoles={specificRoles} />
				</div>
				<dl className="flex flex-col gap-5">
					{groups.map(({label, values}) => <div key={label} className="flex min-w-0 flex-col gap-2">
						<dt className="text-sm font-semibold">{label}</dt>
						<dd>{values.length > 0 ? <ul className="flex flex-wrap gap-2">
							{values.map(value => <li key={value} className="min-w-0 max-w-full"><Badge variant="secondary" className="h-auto max-w-full whitespace-normal wrap-anywhere">{value}</Badge></li>)}
						</ul> : <p className="text-sm text-muted-foreground">Non specificato</p>}</dd>
					</div>)}
				</dl>
			</CardContent>
		</Card>
	);
}
