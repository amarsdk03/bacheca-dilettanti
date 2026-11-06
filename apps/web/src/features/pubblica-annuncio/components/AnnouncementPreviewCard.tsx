import type {CSSProperties} from "react";
import {ExternalLinkIcon, ImageIcon, MailIcon, PhoneIcon} from "lucide-react";
import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {announcementOption} from "@/features/annunci/announcement-model";
import {buildAnnouncementSummarySections} from "@/features/annunci/announcement-summary";
import AnnouncementSummaryValue from "@/features/annunci/components/details/AnnouncementSummaryValue";
import type {AnnouncementPreviewData} from "@/features/pubblica-annuncio/announcement-preview";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";
import {cn} from "@/lib/utils";

export default function AnnouncementPreviewCard({preview, presentation = "preview"}: {preview: AnnouncementPreviewData; presentation?: "preview" | "detail"}) {
	const detail = presentation === "detail";
	const labelClass = detail ? "text-sm" : "text-xs";
	const valueClass = detail ? "text-base" : "text-sm";
	const TypeIcon = announcementOption(preview.announcementType).icon;
	const sections = preview.summarySections ?? buildAnnouncementSummarySections({type: preview.announcementType, fields: preview.fields, facts: preview.facts, locations: preview.locations, authorProfile: null, raw: {descrizione_aggiuntiva: preview.description}});
	const narrative = sections.filter(section => ["additional-info", "content", "promotion", "visibility", "requirements", "services"].includes(section.id));
	const details = sections.filter(section => !narrative.includes(section));
	const hasContacts = preview.contacts.length > 0;
	return <Card className="announcement-preview-card @container/summary relative min-w-0 gap-6 overflow-hidden rounded-2xl shadow-sm [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]" style={{"--preview-accent": getProfileAccent(preview.profileType)} as CSSProperties}>
		<span className="absolute inset-x-0 top-0 h-0.5 bg-(--preview-accent)" aria-hidden="true" />
		<CardHeader className="gap-2">
			<div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="announcement-preview-type-badge"><TypeIcon data-icon="inline-start" aria-hidden="true" />{preview.typeLabel}</Badge>{preview.status && <Badge variant="outline">{preview.status}</Badge>}</div>
			<CardTitle><h2 className="font-home-display text-2xl leading-tight uppercase wrap-anywhere sm:text-3xl">{preview.title}</h2></CardTitle>
			<CardDescription className={cn(detail ? "text-base" : "text-sm", "leading-6")}>{preview.status === "Pubblicato" ? "Pubblicato da" : "Inserito da"} <span className="font-medium text-foreground">{preview.author}</span></CardDescription>
		</CardHeader>
		<CardContent className="flex min-w-0 flex-col gap-6">
			{preview.statusInfo && <Alert><AlertDescription>{preview.statusInfo}</AlertDescription></Alert>}
			{details.length > 0 && <section className="flex min-w-0 flex-col gap-4">
				<h3 className={cn(labelClass, "font-semibold uppercase tracking-wide text-muted-foreground")}>Dettagli</h3>
				<dl aria-label="Informazioni principali" className="grid min-w-0 gap-4 @min-[480px]/summary:grid-cols-2">
					{details.map(section => <div key={section.id} data-summary-field={section.id} className={cn("flex min-w-0 flex-col gap-1.5 border-b border-border/70 pb-4", section.wide && "@min-[480px]/summary:col-span-2")}>
						<dt className={cn(labelClass, "font-medium text-muted-foreground")}>{section.title}</dt>
						<dd className={cn(valueClass, "min-w-0 leading-6 whitespace-pre-wrap wrap-anywhere")}><AnnouncementSummaryValue section={section} compact={detail} /></dd>
					</div>)}
				</dl>
			</section>}
			{narrative.map(section => <section key={section.id} data-summary-field={section.id} className="flex min-w-0 flex-col gap-1.5">
				<h3 className={cn(labelClass, "font-semibold uppercase tracking-wide text-muted-foreground")}>{section.title}</h3>
				<div className={cn(valueClass, "leading-6 whitespace-pre-wrap wrap-anywhere")}><AnnouncementSummaryValue section={section} compact={detail} /></div>
			</section>)}
			{preview.imageUrl && (
				// Drafts use browser blob URLs; saved announcements use the revocable media proxy.
				// eslint-disable-next-line @next/next/no-img-element
				<img src={preview.imageUrl} alt={preview.imageLabel ?? "Immagine dell’annuncio"} className="h-auto max-h-44 w-auto max-w-full self-center rounded-lg border border-border bg-muted/30 object-contain" />
			)}
			{preview.linkedTeams.length > 0 && <section className="flex min-w-0 flex-col gap-1.5"><h3 className={cn(labelClass, "font-semibold uppercase tracking-wide text-muted-foreground")}>Squadre collegate</h3><TeamProfileLinks teams={preview.linkedTeams} newTab /></section>}
			{(hasContacts || preview.genericLink) && <><Separator /><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm leading-6">
				{preview.contacts.map(contact => <span key={contact} className="inline-flex min-w-0 items-center gap-1.5 wrap-anywhere">{contact.includes("@") ? <MailIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}{contact}</span>)}
				{preview.genericLink && <ExternalLink href={preview.genericLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">Link annuncio <ExternalLinkIcon className="size-3.5" aria-hidden="true" /></ExternalLink>}
			</div></>}
			{preview.imageLabel && !preview.imageUrl && <p className="inline-flex items-center gap-2 text-sm leading-6 text-muted-foreground"><ImageIcon className="size-3.5" aria-hidden="true" />{preview.imageLabel}</p>}
		</CardContent>
	</Card>;
}
