import {MapPinIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {groupPublicProfileLocations, type PublicProfileLocation} from "@/features/profilo/public-profile-locations";

export default function ProfileLocationsCard({locations, title = "Località"}: {locations: PublicProfileLocation[]; title?: string}) {
	const groups = groupPublicProfileLocations(locations);

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><MapPinIcon className="profile-detail-accent size-5" aria-hidden="true" />{title}</h2></CardTitle>
			</CardHeader>
			<CardContent>
				{groups.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna località indicata</p> : (
					<ul className={`flex flex-col gap-2 ${groups.length > 1 ? "list-disc pl-5" : ""}`}>
						{groups.map(({region, cities, hasWholeRegion}) => (
							<li key={region} className="min-w-0 wrap-anywhere">
								<span className="font-semibold">{region}</span>
								{!hasWholeRegion && cities.length > 0 && (
									<span className="font-normal">: {cities.join(", ")}</span>
								)}
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
