import {TargetIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {PlayerProfileData} from "../../profile-detail-model";

export default function PlayerRolesCard({sportTypes, primaryRoles, preferredCategories}: Pick<PlayerProfileData, "sportTypes" | "primaryRoles" | "preferredCategories">) {
	const groups = [
		{label: "Tipologie calcio", values: sportTypes},
		{label: "Ruoli principali", values: primaryRoles},
		...(preferredCategories.length > 0 ? [{label: "Categorie ricercate storiche", values: preferredCategories}] : []),
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
				<dl className="flex flex-col gap-5">
					{groups.map(({label, values}) => <div key={label} className="flex min-w-0 flex-col gap-2">
						<dt className="text-lg font-semibold">{label}</dt>
						<dd>{values.length > 0 ? <ul className="flex flex-wrap gap-2">
							{values.map(value => <li key={value} className="min-w-0 max-w-full"><Badge variant="default" className="bg-[#acd6f8] text-black h-auto text-base px-3 pb-1 max-w-full whitespace-normal wrap-anywhere">{value}</Badge></li>)}
						</ul> : <p className="text-md text-muted-foreground">Non specificato</p>}</dd>
					</div>)}
				</dl>
			</CardContent>
		</Card>
	);
}
