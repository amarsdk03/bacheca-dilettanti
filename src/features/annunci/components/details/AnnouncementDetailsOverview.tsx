import Image from "next/image";
import {ExternalLinkIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";
import {type AnnouncementDetailPresentation, isSpecifiedAnnouncementValue} from "./announcement-detail-presentation";
import StructuredFieldList from "@/components/data-info/StructuredFieldList";

export default function AnnouncementDetailsOverview({announcement, presentation}: {
	announcement: AnnouncementDetail;
	presentation: AnnouncementDetailPresentation;
}) {
	const fields = announcement.fields.filter(field =>
		(presentation.detailFieldLabels.includes(field.label) || field.wide)
		&& isSpecifiedAnnouncementValue(field.value)
		&& field.value !== announcement.description
		&& !(announcement.playerRoles && field.label === "Ruoli secondari"),
	);
	return (
		<section aria-label="Informazioni dell’annuncio" className="flex min-w-0 flex-col gap-5">
			<Card>
				<CardHeader><CardTitle><h2 className="font-home-display text-2xl uppercase">Descrizione</h2></CardTitle></CardHeader>
				<CardContent className="flex flex-col gap-5">
					<p className="text-base leading-7 whitespace-pre-wrap wrap-anywhere">{announcement.description ?? presentation.emptyNarrative}</p>
					{announcement.announcementLink && (
						<ExternalLink
							href={announcement.announcementLink}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex w-fit items-center gap-1.5 font-medium underline underline-offset-4"
						>
							Link annuncio <ExternalLinkIcon className="size-4" aria-hidden="true" />
						</ExternalLink>
					)}
					{announcement.shareImageUrl && (
						<Image
							src={announcement.shareImageUrl}
							alt={`Immagine allegata all’annuncio: ${announcement.title}`}
							width={1600}
							height={1200}
							unoptimized
							className="h-auto max-h-[32rem] w-full rounded-xl border object-contain"
						/>
					)}
				</CardContent>
			</Card>
			{fields.map(field => <Card key={field.label}>
				<CardHeader><CardTitle><h2 className="font-home-display text-2xl uppercase">{field.label}</h2></CardTitle></CardHeader>
				<CardContent><div className="text-base leading-7 whitespace-pre-wrap wrap-anywhere">{field.items?.length ? <StructuredFieldList items={field.items} style={field.listStyle} /> : field.value}</div></CardContent>
			</Card>)}
			{announcement.linkedTeams.length > 0 && <Card>
				<CardHeader><CardTitle><h2 className="font-home-display text-2xl uppercase">Squadre collegate</h2></CardTitle></CardHeader>
				<CardContent><TeamProfileLinks teams={announcement.linkedTeams} /></CardContent>
			</Card>}
		</section>
	);
}
