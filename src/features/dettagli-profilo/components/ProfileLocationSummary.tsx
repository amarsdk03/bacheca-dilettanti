import {MapPinIcon} from "lucide-react";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogDismissButton,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";
import {
	groupPublicProfileLocations,
	publicProfileLocationLabel,
	type PublicProfileLocation,
} from "@/features/profilo/public-profile-locations";

export default function ProfileLocationSummary({
	locations,
	className,
}: {
	locations: readonly PublicProfileLocation[];
	className?: string;
}) {
	const groups = groupPublicProfileLocations(locations);
	if (groups.length === 0) return null;

	const selectedCityCount = groups.reduce((total, group) => total + group.cities.length, 0);
	const summary = publicProfileLocationLabel(locations);
	const description = selectedCityCount === 0
		? "Aree di interesse"
		: selectedCityCount + " " + (selectedCityCount === 1 ? "città selezionata" : "città selezionate");

	return (
		<Dialog>
			<DialogTrigger className={cn("flex w-full min-w-0 items-center justify-between gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none", className)}>
				<span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
					<MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
					<span className="truncate">{summary}</span>
				</span>
				<Badge variant="secondary" className="shrink-0">
					{groups.length === 1 ? "1 regione" : groups.length + " regioni"}
				</Badge>
			</DialogTrigger>
			<DialogContent>
				<DialogDismissButton />
				<DialogHeader>
					<DialogTitle>Zone di interesse</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<dl className="flex max-h-[min(26rem,60vh)] flex-col gap-4 overflow-y-auto pr-1">
					{groups.map((group) => (
						<div key={group.region} className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
							<dt className="text-sm font-semibold">{group.region}</dt>
							<dd className="flex flex-wrap gap-1.5">
								{group.hasWholeRegion && <Badge variant="outline">Tutta la regione</Badge>}
								{group.cities.map((city) => <Badge key={city} variant="secondary">{city}</Badge>)}
							</dd>
						</div>
					))}
				</dl>
				<DialogFooter>
					<DialogClose>Chiudi</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
