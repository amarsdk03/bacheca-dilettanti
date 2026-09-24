import type {CSSProperties} from "react";
import {ExternalLinkIcon, ImageIcon, MailIcon, MapPinIcon, PhoneIcon} from "lucide-react";

import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import StructuredFieldList from "@/components/data-info/StructuredFieldList";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {announcementOption} from "@/features/annunci/announcement-model";
import {FACT_ICONS} from "@/features/annunci/components/details/announcement-detail-facts";
import {ANNOUNCEMENT_DETAIL_PRESENTATIONS, isSpecifiedAnnouncementValue, type AnnouncementDetailPresentation} from "@/features/annunci/components/details/announcement-detail-presentation";
import type {AnnouncementPreviewData} from "@/features/pubblica-annuncio/announcement-preview";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {groupPublicProfileLocations} from "@/features/profilo/public-profile-locations";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";
import {cn} from "@/lib/utils";

function InlineTextList({items, className}: {items: readonly string[]; className?: string}) {
	return <ul className={cn("flex flex-wrap items-baseline gap-y-1", className)}>
		{items.map((item, index) => <li key={`${item}-${index}`} className="max-w-full wrap-anywhere">
			{item}
			{index < items.length - 1 && <span className="px-1.5 text-muted-foreground" aria-hidden="true">·</span>}
		</li>)}
	</ul>;
}

export default function AnnouncementPreviewCard({preview}: {preview: AnnouncementPreviewData}) {
	const accent = getProfileAccent(preview.profileType);
	const TypeIcon = announcementOption(preview.announcementType).icon;
	const presentation: AnnouncementDetailPresentation = ANNOUNCEMENT_DETAIL_PRESENTATIONS[preview.announcementType];
	const facts = presentation.heroFactKinds.flatMap(kind =>
		preview.facts.filter(fact => fact.kind === kind && isSpecifiedAnnouncementValue(fact.value)),
	);
	const fields = preview.fields.filter(field =>
		(presentation.detailFieldLabels.includes(field.label) || field.wide ||
			(preview.playerRoles && (field.label === "Ruoli principali" || field.label === "Ruoli secondari")))
		&& isSpecifiedAnnouncementValue(field.value)
		&& field.value !== preview.description,
	);
	const locations = groupPublicProfileLocations(preview.locations).flatMap(({region, cities, hasWholeRegion}) => [
		...(hasWholeRegion ? [`Tutta la regione ${region}`] : []),
		...cities.map(city => `${city} (${region})`),
	]);
	const hasContactLinks = preview.contacts.length > 0 || Boolean(preview.genericLink || preview.videoHighlights);
	const style = {"--preview-accent": accent} as CSSProperties;

	return (
		<Card size="sm" className="announcement-preview-card relative gap-3 overflow-hidden rounded-2xl shadow-sm" style={style}>
			<span className="absolute inset-x-0 top-0 h-0.5 bg-(--preview-accent)" aria-hidden="true" />
			<CardHeader className="gap-2 pt-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary" className="announcement-preview-type-badge"><TypeIcon data-icon="inline-start" aria-hidden="true" />{preview.typeLabel}</Badge>
					{preview.status && <Badge variant="outline">{preview.status}</Badge>}
				</div>
				<CardTitle><h2 className="font-home-display text-2xl leading-tight uppercase wrap-anywhere sm:text-3xl">{preview.title}</h2></CardTitle>
				<CardDescription className="text-xs sm:text-sm">{preview.status === "Pubblicato" ? "Pubblicato da" : "Inserito da"} <span className="font-medium text-foreground">{preview.author}</span></CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pb-4">
				{preview.statusInfo && <Alert><AlertDescription>{preview.statusInfo}</AlertDescription></Alert>}
				{facts.length > 0 && <dl aria-label="Informazioni principali" className="grid gap-x-5 sm:grid-cols-2">
					{facts.map(({kind, label, value}) => {
						const Icon = FACT_ICONS[kind];
						return <div key={`${kind}-${label}`} className="flex min-w-0 flex-wrap items-baseline gap-x-2 border-b border-border/70 py-2">
							<dt className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Icon className="size-3.5 shrink-0" aria-hidden="true" />{label}</dt>
							<dd className="min-w-0 text-sm font-semibold leading-5 wrap-anywhere">{value}</dd>
						</div>;
					})}
				</dl>}
				<section className="flex flex-col gap-1.5">
					<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrizione</h3>
					<p className="text-sm leading-6 whitespace-pre-wrap wrap-anywhere">{preview.description ?? presentation.emptyNarrative}</p>
					{preview.imageUrl && (
						// Preview URLs can be browser blobs or short-lived signed Storage URLs.
						// eslint-disable-next-line @next/next/no-img-element
						<img src={preview.imageUrl} alt={preview.imageLabel ?? "Immagine dell’annuncio"} className="mt-2 h-auto max-h-44 max-w-full rounded-lg border border-border bg-muted/30 object-contain" />
					)}
				</section>
				{fields.length > 0 && <section className="flex flex-col gap-1.5">
					<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dettagli</h3>
					<dl className="grid gap-x-5 sm:grid-cols-2">
						{fields.map(field => <div key={field.label} className={cn("min-w-0 border-b border-border/70 py-2", field.wide && "sm:col-span-2")}>
							<dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
							<dd className="mt-0.5 text-sm leading-5 whitespace-pre-wrap wrap-anywhere">
								{field.items?.length && field.listStyle === "rows"
									? <StructuredFieldList items={field.items} style="rows" />
									: field.items?.length
										? <InlineTextList items={field.items} />
										: field.value}
							</dd>
						</div>)}
					</dl>
				</section>}
				{preview.linkedTeams.length > 0 && <section className="flex flex-col gap-1.5">
					<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Squadre collegate</h3>
					<TeamProfileLinks teams={preview.linkedTeams} />
				</section>}
				<section aria-label="Località" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<h3 className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />Località</h3>
					{locations.length > 0
						? <InlineTextList items={locations} className="text-xs sm:text-sm" />
						: <p className="text-xs text-muted-foreground">Nessuna località indicata</p>}
				</section>
				{hasContactLinks && <>
					<Separator />
					<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm">
						{preview.contacts.map(contact => <span key={contact} className="inline-flex min-w-0 items-center gap-1.5 wrap-anywhere">
							{contact.includes("@") ? <MailIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}{contact}
						</span>)}
						{preview.genericLink && <ExternalLink href={preview.genericLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">Link annuncio <ExternalLinkIcon className="size-3.5" aria-hidden="true" /></ExternalLink>}
						{preview.videoHighlights && <ExternalLink href={preview.videoHighlights} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4">Guarda video highlights <ExternalLinkIcon className="size-3.5" aria-hidden="true" /></ExternalLink>}
					</div>
				</>}
				{preview.imageLabel && !preview.imageUrl && <p className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ImageIcon className="size-3.5" aria-hidden="true" />{preview.imageLabel}</p>}
			</CardContent>
		</Card>
	);
}
