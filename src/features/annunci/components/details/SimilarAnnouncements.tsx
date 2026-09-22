import {MegaphoneIcon, TriangleAlertIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import type {AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import AnnouncementCard from "../cards/AnnouncementCard";

export default function SimilarAnnouncements({announcements, unavailable}: {announcements: AnnouncementDirectoryItem[]; unavailable: boolean}) {
	if (unavailable) return <Alert variant="destructive">
		<TriangleAlertIcon aria-hidden="true" />
		<AlertTitle>Annunci simili temporaneamente non disponibili</AlertTitle>
		<AlertDescription>Le informazioni dell’annuncio restano consultabili. Riprova più tardi.</AlertDescription>
	</Alert>;
	if (announcements.length === 0) return <Empty className="min-h-56 border bg-card">
		<EmptyHeader><EmptyMedia variant="icon"><MegaphoneIcon aria-hidden="true" /></EmptyMedia>
			<EmptyTitle>Nessun annuncio simile</EmptyTitle>
			<EmptyDescription>Non ci sono ancora altri annunci pubblici dello stesso tipo.</EmptyDescription>
		</EmptyHeader>
	</Empty>;
	return <section aria-label="Annunci simili"><ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{announcements.map(announcement => <li key={announcement.id} className="min-w-0"><AnnouncementCard announcement={announcement} /></li>)}
	</ul></section>;
}
