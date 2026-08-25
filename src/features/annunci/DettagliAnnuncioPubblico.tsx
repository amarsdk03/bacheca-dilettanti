import type {ReactNode} from "react";
import {
	BadgeEuroIcon,
	BriefcaseBusinessIcon,
	Building2Icon,
	CalendarCheckIcon,
	CalendarDaysIcon,
	CalendarRangeIcon,
	CarIcon,
	CircleDollarSignIcon,
	ClockIcon,
	InfoIcon,
	MailIcon,
	MapPinIcon,
	PhoneIcon,
	TagsIcon,
	TriangleAlertIcon,
	UserSearchIcon,
	UsersIcon,
	WrenchIcon,
} from "lucide-react";

import GradientBackground from "@/components/styling/GradientBackground";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import AnnouncementAuthorHoverCard from "@/features/annunci/AnnouncementAuthorHoverCard";
import AnnouncementHistoryBackButton from "@/features/annunci/AnnouncementHistoryBackButton";
import type {
	AnnouncementContact,
	AnnouncementDetail,
	AnnouncementDetailResult,
	AnnouncementFactKind,
} from "@/features/annunci/announcement-model";
import {cn} from "@/lib/utils";

interface DettagliAnnuncioPubblicoProps {
	result: Exclude<AnnouncementDetailResult, {status: "not-found"}>;
}

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "long",
	timeZone: "Europe/Rome",
	year: "numeric",
});

function formatDate(value: string | null) {
	if (!value) return "Data non disponibile";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Data non disponibile"
		: ANNOUNCEMENT_DATE_FORMATTER.format(date);
}

function humanizeValue(value: string) {
	const normalized = value.trim().replaceAll("_", " ").replaceAll("-", " ");
	return normalized
		? normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1)
		: value;
}

function factIcon(kind: AnnouncementFactKind): ReactNode {
	const iconSize = 20;

	switch (kind) {
		case "availability":
		case "registration":
			return <CalendarCheckIcon aria-hidden="true" size={iconSize}/>;
		case "car":
			return <CarIcon aria-hidden="true" size={iconSize}/>;
		case "categories":
		case "types":
			return <TagsIcon aria-hidden="true" size={iconSize}/>;
		case "compensation":
			return <BadgeEuroIcon aria-hidden="true" size={iconSize}/>;
		case "figures":
			return <BriefcaseBusinessIcon aria-hidden="true" size={iconSize}/>;
		case "headquarters":
		case "sector":
			return <Building2Icon aria-hidden="true" size={iconSize}/>;
		case "location":
			return <MapPinIcon aria-hidden="true" size={iconSize}/>;
		case "participation":
			return <UsersIcon aria-hidden="true" size={iconSize}/>;
		case "period":
		case "season":
			return <CalendarRangeIcon aria-hidden="true" size={iconSize}/>;
		case "price":
			return <CircleDollarSignIcon aria-hidden="true" size={iconSize}/>;
		case "roles":
			return <UserSearchIcon aria-hidden="true" size={iconSize}/>;
		case "services":
			return <WrenchIcon aria-hidden="true" size={iconSize}/>;
		case "time":
			return <ClockIcon aria-hidden="true" size={iconSize}/>;
	}
}

export default function DettagliAnnuncioPubblico({
	result,
}: DettagliAnnuncioPubblicoProps) {
	return (
		<GradientBackground className="min-h-[calc(100vh-4rem)]">
			<section className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
				<div className="flex flex-col gap-6">
					<div>
						<AnnouncementHistoryBackButton />
					</div>

					{result.status === "error" ? (
						<AnnouncementError />
					) : (
						<AnnouncementContent announcement={result.announcement} />
					)}

					<div className="flex justify-center pt-2">
						<AnnouncementHistoryBackButton
							label="Torna indietro"
							variant="outline"
							size="lg"
						/>
					</div>
				</div>
			</section>
		</GradientBackground>
	);
}

function AnnouncementError() {
	return (
		<Alert variant="destructive">
			<TriangleAlertIcon aria-hidden="true" />
			<AlertTitle>Annuncio temporaneamente non disponibile</AlertTitle>
			<AlertDescription>
				Non è stato possibile caricare questo annuncio. Riprova tra poco oppure torna alla pagina precedente.
			</AlertDescription>
		</Alert>
	);
}

function AnnouncementContent({announcement}: {announcement: AnnouncementDetail}) {
	return (
		<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<AnnouncementOverview announcement={announcement} />
			<AnnouncementContacts
				contacts={announcement.contacts}
				unavailable={announcement.contactsUnavailable}
			/>
		</div>
	);
}

function AnnouncementOverview({announcement}: {announcement: AnnouncementDetail}) {
	const formattedDate = formatDate(announcement.createdAt);

	return (
		<Card>
			<CardHeader>
				<div className="mb-2 flex flex-wrap gap-2">
					<Badge>{announcement.typeLabel}</Badge>
					{announcement.level && (
						<Badge variant="secondary">{humanizeValue(announcement.level)}</Badge>
					)}
				</div>
				<CardTitle className="text-2xl sm:text-3xl">
					<h1 id="announcement-detail-title">{announcement.title}</h1>
				</CardTitle>
				{announcement.description && (
					<CardDescription className="mt-2 whitespace-pre-wrap text-base leading-7">
						{announcement.description}
					</CardDescription>
				)}
				<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
					<p className="flex items-center gap-1.5">
						<MapPinIcon className="size-4" aria-hidden="true" />
						{announcement.location}
					</p>
					{announcement.createdAt ? (
						<time dateTime={announcement.createdAt} className="flex items-center gap-1.5">
							<CalendarDaysIcon className="size-4" aria-hidden="true" />
							{formattedDate}
						</time>
					) : (
						<p className="flex items-center gap-1.5">
							<CalendarDaysIcon className="size-4" aria-hidden="true" />
							{formattedDate}
						</p>
					)}
				</div>
			</CardHeader>

			<Separator />
			<CardContent>
				<h2 className="mb-3 text-sm font-medium text-muted-foreground">Pubblicato da</h2>
				<AnnouncementAuthorHoverCard author={announcement.author} />
			</CardContent>

			{announcement.facts.length > 0 && (
				<>
					<Separator />
					<CardContent>
						<h2 className="mb-4 text-base font-semibold">Informazioni principali</h2>
						<dl className="grid gap-3 sm:grid-cols-2">
							{announcement.facts.map((fact, index) => (
								<div key={`${fact.label}-${index}`} className="rounded-xl bg-muted/50 p-4">
									<dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
										<span className="size-5 shrink-0">{factIcon(fact.kind)}</span>
										{fact.label}
									</dt>
									<dd className="mt-2 whitespace-pre-wrap wrap-break-word font-semibold">
										{fact.value}
									</dd>
								</div>
							))}
						</dl>
					</CardContent>
				</>
			)}

			{announcement.fields.length > 0 && (
				<>
					<Separator />
					<CardContent>
						<h2 className="mb-4 text-base font-semibold">Dettagli dell’annuncio</h2>
						<dl className="grid gap-4 sm:grid-cols-2">
							{announcement.fields.map((field, index) => (
								<div
									key={`${field.label}-${index}`}
									className={cn(
										"rounded-xl border bg-background/60 p-4",
										field.wide && "sm:col-span-2",
									)}
								>
									<dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
									<dd className="mt-1 whitespace-pre-wrap wrap-break-word text-base font-medium">
										{field.value}
									</dd>
								</div>
							))}
						</dl>
					</CardContent>
				</>
			)}
		</Card>
	);
}

function AnnouncementContacts({
	contacts,
	unavailable,
}: {
	contacts: AnnouncementContact[];
	unavailable: boolean;
}) {
	return (
		<aside aria-labelledby="announcement-contacts-title" className="lg:sticky lg:top-24">
			<Card>
				<CardHeader>
					<CardTitle>
						<h2 id="announcement-contacts-title">Contatta l’autore</h2>
					</CardTitle>
					<CardDescription>
						Usa uno dei recapiti pubblicati insieme all’annuncio.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{unavailable ? (
						<Alert variant="destructive">
							<TriangleAlertIcon aria-hidden="true" />
							<AlertTitle>Contatti temporaneamente non disponibili</AlertTitle>
							<AlertDescription>
								Riprova tra poco per consultare i recapiti pubblici dell’annuncio.
							</AlertDescription>
						</Alert>
					) : contacts.length === 0 ? (
						<Alert>
							<InfoIcon aria-hidden="true" />
							<AlertTitle>Contatti non disponibili</AlertTitle>
							<AlertDescription>
								L’autore non ha indicato metodi di contatto pubblici per questo annuncio.
							</AlertDescription>
						</Alert>
					) : (
						<ul className="flex flex-col gap-2">
							{contacts.map((contact, index) => {
								const Icon = contact.kind === "email" ? MailIcon : PhoneIcon;

								return (
									<li key={`${contact.kind}-${contact.value}`}>
										<Button
											render={<a href={contact.href} />}
											nativeButton={false}
											variant={index === 0 ? "default" : "outline"}
											className="w-full justify-start"
										>
											<Icon data-icon="inline-start" aria-hidden="true" />
											<span className="min-w-0 truncate">{contact.label}: {contact.value}</span>
										</Button>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
				{contacts.length > 0 && (
					<CardFooter className="items-start gap-2 text-xs text-muted-foreground">
						<InfoIcon className="mt-0.5" aria-hidden="true" />
						<span>I recapiti sono stati indicati dall’autore come contatti pubblici dell’annuncio.</span>
					</CardFooter>
				)}
			</Card>
		</aside>
	);
}
