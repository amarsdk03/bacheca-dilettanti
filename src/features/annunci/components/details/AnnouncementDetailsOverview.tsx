import Image from "next/image";
import type {ReactNode} from "react";
import {ExternalLinkIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import DynamicReactFlag from "@/components/dynamic/DynamicReactFlag";
import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import AnnouncementSectionContent from "./AnnouncementSectionContent";

function SectionCard({title, prefix, children}: {title: string; prefix: ReactNode; children: ReactNode}) {
	return <Card className="min-w-0">
		<CardHeader><CardTitle><h2 className="flex items-center justify-center gap-2 text-center font-home-display text-2xl uppercase wrap-anywhere lg:text-3xl">{prefix}<span>{title}:</span></h2></CardTitle></CardHeader>
		<CardContent className="min-w-0 text-base leading-7">{children}</CardContent>
	</Card>;
}

export default function AnnouncementDetailsOverview({announcement}: {announcement: AnnouncementDetail}) {
	return <section aria-label="Dettagli dell’annuncio" className="flex min-w-0 flex-col gap-5">
		{announcement.sections.map(section => <SectionCard key={section.id} title={section.title} prefix={section.flagCode
			? <span role="img" aria-label="Italia" title="Italia" className="inline-flex shrink-0"><DynamicReactFlag code={section.flagCode} className="h-5 w-7 rounded-xs" /></span>
			: <span aria-hidden="true" className="shrink-0">{section.emoji}</span>}>
			<AnnouncementSectionContent section={section} />
		</SectionCard>)}
		{announcement.announcementLink && <SectionCard title="Link annuncio" prefix={<span aria-hidden="true">🔗</span>}>
			<div className="flex flex-col items-center gap-2">
				<ExternalLink href={announcement.announcementLink} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 font-medium underline underline-offset-4 wrap-anywhere">
					Apri link annuncio <ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" />
				</ExternalLink>
				<p className="text-center text-xs text-muted-foreground">Il link apre un sito esterno in una nuova scheda.</p>
			</div>
		</SectionCard>}
		{announcement.shareImageUrl && <SectionCard title="Immagine annuncio" prefix={<span aria-hidden="true">📸</span>}>
			<Image src={announcement.shareImageUrl} alt={`Immagine allegata all’annuncio: ${announcement.title}`} width={1600} height={1200} unoptimized className="h-auto max-h-[32rem] w-full rounded-xl border object-contain" />
		</SectionCard>}
	</section>;
}
