import type {PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import type {AnnouncementType} from "@/features/annunci/announcement-model";
import ProfileLocationsCard from "@/features/dettagli-profilo/components/ProfileLocationsCard";
import {MapPinIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export default function AnnouncementLocationCard({locations, announcementType, address}: {
	locations: PublicProfileLocation[];
	announcementType?: AnnouncementType;
	address?: string | null;
}) {
	if (announcementType === "annuncio_campo_impianto") return <Card className="min-w-0">
		<CardHeader><CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><MapPinIcon className="profile-detail-accent size-5" aria-hidden="true" />Indirizzo del campo</h2></CardTitle></CardHeader>
		<CardContent><p className="text-sm leading-6 whitespace-pre-wrap wrap-anywhere">{address?.trim() && address !== "Non specificato" ? address : "Indirizzo non indicato"}</p></CardContent>
	</Card>;

	const title = announcementType === "annuncio_arbitro"
		? "Zone di disponibilità"
		: announcementType === "annuncio_torneo_evento" || announcementType === "annuncio_professionisti_studi" || announcementType === "annuncio_creators" || !announcementType
			? "Località"
			: "Zone di ricerca";
	return <ProfileLocationsCard locations={locations} title={title} />;
}
