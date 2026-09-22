import {MapPinIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export default function AnnouncementLocationCard({location}: {location: string}) {
	const specified = location.trim().length > 0
		&& location !== "Località non specificata"
		&& location !== "Non specificato";

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><MapPinIcon className="profile-detail-accent size-5" aria-hidden="true" />Località</h2></CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm leading-6 wrap-anywhere text-foreground">{specified ? location : "Nessuna località indicata"}</p>
			</CardContent>
		</Card>
	);
}
