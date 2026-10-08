import {MapPinIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {groupPublicProfileLocations, type PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import ProfileSectionHeading from "./ProfileSectionHeading";

export default function ProfileLocationsCard({locations, title = "Località", presentation = "default"}: {locations: PublicProfileLocation[]; title?: string; presentation?: "default" | "player"}) {
	const groups = groupPublicProfileLocations(locations);

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle><ProfileSectionHeading icon={MapPinIcon}>{title}</ProfileSectionHeading></CardTitle>
			</CardHeader>
			<CardContent>
				{groups.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna località indicata</p> : presentation === "player" ? (
					<ul className="flex flex-col gap-3 text-center">
						{groups.flatMap(({region, cities, hasWholeRegion}) => [
							...cities.map(city => <li key={region + ":" + city} className="min-w-0 wrap-anywhere">
								<span className="block text-xl font-semibold text-foreground">{city}</span>
								<span className="block text-sm text-muted-foreground">{region}</span>
							</li>),
							...(hasWholeRegion || cities.length === 0 ? [<li key={region + ":whole-region"} className="min-w-0 wrap-anywhere">
								<span className="block text-xl font-semibold text-foreground">Intera regione</span>
								<span className="block text-sm text-muted-foreground">{region}</span>
							</li>] : []),
						])}
					</ul>
				) : (
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
