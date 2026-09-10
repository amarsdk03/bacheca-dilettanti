import Link from "next/link";
import {ExternalLinkIcon, ImageIcon, MailIcon, MapPinIcon, PhoneIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import type {AnnouncementPreviewData} from "@/features/pubblica-annuncio/announcement-preview";

export default function AnnouncementPreviewCard({preview}: {preview: AnnouncementPreviewData}) {
	return (
		<Card className="overflow-hidden border-brand-indigo/30 bg-white shadow-sm">
			{preview.imageUrl && (
				<div className="relative aspect-[16/7] overflow-hidden bg-muted">
					{/* The source can be a browser blob URL or a short-lived signed Storage URL. */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={preview.imageUrl} alt={preview.imageLabel ?? "Immagine dell’annuncio"} className="size-full object-cover" />
				</div>
			)}
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2 mb-1.5">
					<Badge className="bg-brand-indigo text-white">{preview.typeLabel}</Badge>
					{preview.status && <Badge variant="outline">{preview.status}</Badge>}
					{(preview.genericLink || preview.videoHighlights || preview.imageUrl) && <Badge variant="secondary" className="text-brand-indigo">Contenuti Premium salvati</Badge>}
				</div>
				<CardTitle className="text-2xl leading-tight">{preview.title}</CardTitle>
				<CardDescription>Pubblicato da {preview.author}</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-5">
				{preview.statusInfo && <p className="rounded-lg bg-brand-indigo/10 p-3 text-sm text-brand-ink">{preview.statusInfo}</p>}
				{preview.description && <p className="whitespace-pre-line text-sm leading-6 text-foreground">{preview.description}</p>}
				{preview.facts.length > 0 && (
					<dl className="grid gap-3 sm:grid-cols-2">
						{preview.facts.map(({label, value}) => (
							<div key={`${label}-${value}`} className="rounded-lg border bg-muted/25 p-3">
								<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
								<dd className="mt-1 text-sm font-medium">{value}</dd>
							</div>
						))}
					</dl>
				)}
				{preview.locations.length > 0 && <p className="flex items-start gap-2 text-sm"><MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand-indigo" /> {preview.locations.join(" · ")}</p>}
				{preview.contacts.length > 0 && (
					<div className="flex flex-wrap gap-3 text-sm">
						{preview.contacts.map((contact) => <span key={contact} className="inline-flex items-center gap-1.5">{contact.includes("@") ? <MailIcon className="size-4" /> : <PhoneIcon className="size-4" />}{contact}</span>)}
					</div>
				)}
				{(preview.genericLink || preview.videoHighlights) && (
					<div className="grid gap-2 border-t pt-4 text-sm">
						{preview.genericLink && <Link href={preview.genericLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-indigo underline-offset-4 hover:underline">Apri link annuncio <ExternalLinkIcon className="size-4" /></Link>}
						{preview.videoHighlights && <Link href={preview.videoHighlights} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-indigo underline-offset-4 hover:underline">Guarda video highlights <ExternalLinkIcon className="size-4" /></Link>}
					</div>
				)}
				{preview.imageLabel && !preview.imageUrl && <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ImageIcon className="size-4" />{preview.imageLabel}</p>}
			</CardContent>
		</Card>
	);
}
