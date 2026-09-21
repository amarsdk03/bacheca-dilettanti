import {MapPinIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {groupPublicProfileLocations, type PublicProfileLocation} from "@/features/profilo/public-profile-locations";

export default function ProfileLocationsCard({locations}: {locations: PublicProfileLocation[]}) {
	const groups = groupPublicProfileLocations(locations);

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><MapPinIcon className="profile-detail-accent size-5" aria-hidden="true" />Località</h2></CardTitle>
			</CardHeader>
			<CardContent>
				{groups.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna località indicata</p> : (
					<ul className="flex flex-col gap-4">
						{groups.map(({region, cities, hasWholeRegion}) => (
							<li key={region} className="flex min-w-0 flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
								<h3 className="font-semibold wrap-anywhere">{region}</h3>
								{hasWholeRegion && <p className="text-sm text-muted-foreground">Tutta la regione</p>}
								{cities.length > 0 && <ul className="flex flex-wrap gap-2" aria-label={`Città in ${region}`}>
									{cities.map(city => <li key={city} className="max-w-full rounded-md bg-accent px-2.5 py-1 text-sm text-accent-foreground wrap-anywhere">{city}</li>)}
								</ul>}
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
