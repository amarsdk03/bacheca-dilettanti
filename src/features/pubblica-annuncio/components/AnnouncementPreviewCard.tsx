import Link from "next/link";
import {
	BadgeEuroIcon,
	CalendarDaysIcon,
	ExternalLinkIcon,
	ImageIcon,
	MailIcon,
	MapPinIcon,
	PhoneIcon,
	TagsIcon,
	UserRoundSearchIcon,
	UsersRoundIcon,
	WrenchIcon,
} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import type {AnnouncementPreviewData} from "@/features/pubblica-annuncio/announcement-preview";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";

function PreviewFactIcon({label}: {label: string}) {
	const normalized = label.toLocaleLowerCase("it-IT");
	const Icon = normalized.includes("ruol") || normalized.includes("figura")
		? UserRoundSearchIcon
		: normalized.includes("categoria") || normalized.includes("annat")
			? UsersRoundIcon
			: normalized.includes("costo") || normalized.includes("compenso")
				? BadgeEuroIcon
				: normalized.includes("stagione") || normalized.includes("disponibilit")
					? CalendarDaysIcon
					: normalized.includes("servizi")
						? WrenchIcon
						: TagsIcon;
	return <Icon className="size-3.5 shrink-0" aria-hidden="true" />;
}

export default function AnnouncementPreviewCard({preview}: {preview: AnnouncementPreviewData}) {
	const accent = getProfileAccent(preview.profileType);
	const facts = preview.facts.filter(({value}) => value.trim() && value !== "Non specificato");

	return (
		<Card className="relative overflow-hidden border-black/8 bg-card shadow-sm">
			<span className="absolute inset-x-0 top-0 z-10 h-1" style={{backgroundColor: accent}} aria-hidden="true" />
			{preview.imageUrl && (
				<div className="relative aspect-[16/7] overflow-hidden bg-muted">
					{/* The source can be a browser blob URL or a short-lived signed Storage URL. */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={preview.imageUrl} alt={preview.imageLabel ?? "Immagine dell’annuncio"} className="size-full object-cover" />
				</div>
			)}
			<CardHeader className="pt-6">
				<div className="flex items-start gap-3">
					<span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor: `${accent}14`}}>
						<ProfilePngIcon type={preview.profileType} color={accent} className="size-6" />
					</span>
					<div className="flex min-w-0 flex-wrap gap-1.5 pt-0.5">
						<Badge className="border-0" style={{backgroundColor: `${accent}18`, color: accent}}>{preview.typeLabel}</Badge>
					{preview.status && <Badge variant="outline">{preview.status}</Badge>}
					</div>
				</div>
				<CardTitle className="mt-3 text-2xl leading-tight sm:text-3xl">{preview.title}</CardTitle>
				<CardDescription className="mt-2">Pubblicato da <span className="font-medium text-foreground">{preview.author}</span></CardDescription>
			</CardHeader>
			<CardContent className="grid gap-5">
				{preview.statusInfo && (
					<p className="rounded-xl border px-4 py-3 text-sm leading-6" style={{backgroundColor: `${accent}0d`, borderColor: `${accent}28`}}>
						{preview.statusInfo}
					</p>
				)}
				{preview.description && <p className="whitespace-pre-line text-sm leading-6 text-foreground">{preview.description}</p>}
				{facts.length > 0 && (
					<dl className="grid gap-2 sm:grid-cols-2">
						{facts.map(({label, value}) => (
							<div key={`${label}-${value}`} className="min-w-0 rounded-xl border border-black/7 bg-muted/25 px-3 py-2.5">
								<dt className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
									<span style={{color: accent}}><PreviewFactIcon label={label} /></span>
									{label}
								</dt>
								<dd className="mt-1 wrap-anywhere text-sm font-medium leading-5">{value}</dd>
							</div>
						))}
					</dl>
				)}
				{preview.locations.length > 0 && (
					<div className="flex items-start gap-2 rounded-xl border border-black/7 bg-muted/20 px-3 py-3 text-sm">
						<MapPinIcon className="mt-0.5 size-4 shrink-0" style={{color: accent}} aria-hidden="true" />
						<span className="wrap-anywhere">{preview.locations.join(" · ")}</span>
					</div>
				)}
				{preview.contacts.length > 0 && (
					<div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-black/8 pt-4 text-sm">
						{preview.contacts.map((contact) => <span key={contact} className="inline-flex items-center gap-1.5 wrap-anywhere">{contact.includes("@") ? <MailIcon className="size-4" style={{color: accent}} /> : <PhoneIcon className="size-4" style={{color: accent}} />}{contact}</span>)}
					</div>
				)}
				{(preview.genericLink || preview.videoHighlights) && (
					<div className="grid gap-2 border-t border-black/8 pt-4 text-sm">
						{preview.genericLink && <Link href={preview.genericLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline" style={{color: accent}}>Apri link annuncio <ExternalLinkIcon className="size-4" /></Link>}
						{preview.videoHighlights && <Link href={preview.videoHighlights} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline" style={{color: accent}}>Guarda video highlights <ExternalLinkIcon className="size-4" /></Link>}
					</div>
				)}
				{preview.imageLabel && !preview.imageUrl && <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ImageIcon className="size-4" style={{color: accent}} />{preview.imageLabel}</p>}
			</CardContent>
		</Card>
	);
}
