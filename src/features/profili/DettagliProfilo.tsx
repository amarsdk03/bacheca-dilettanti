import {
	BadgeCheckIcon,
	CalendarDaysIcon,
	CircleDotIcon,
	MapPinIcon,
	MegaphoneIcon,
	StarIcon,
	TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";

import GradientBackground from "@/components/styling/GradientBackground";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {Separator} from "@/components/ui/separator";
import type {
	ProfileAnnouncement,
	ProfileDetailResult,
} from "@/features/profili/profile-detail-model";
import ProfileHistoryBackButton from "@/features/profili/ProfileHistoryBackButton";
import ProfileWorkInProgressNotice from "@/features/profili/ProfileWorkInProgressNotice";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {cn} from "@/lib/utils";

interface DettagliProfiloProps {
	result: Exclude<ProfileDetailResult, {status: "not-found"}>;
}

type PublicProfile = Extract<ProfileDetailResult, {status: "ok"}>["profile"];

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "long",
	timeZone: "Europe/Rome",
	year: "numeric",
});

function profileInitials(title: string) {
	return title
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase("it-IT"))
		.join("") || "PR";
}


function formatAnnouncementDate(value: string | null) {
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

export default function DettagliProfilo({result}: DettagliProfiloProps) {
	return (
		<GradientBackground className="min-h-[calc(100vh-4rem)]">
			<section className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
				<div className="flex flex-col gap-6">
					<div>
						<ProfileHistoryBackButton />
					</div>

					<ProfileWorkInProgressNotice />

					{result.status === "error" ? (
						<>
							<Alert variant="destructive">
								<TriangleAlertIcon aria-hidden="true" />
								<AlertTitle>Profilo temporaneamente non disponibile</AlertTitle>
								<AlertDescription>Riprova tra poco oppure torna alla pagina precedente.</AlertDescription>
							</Alert>
							<div className="flex justify-center pt-2">
								<ProfileHistoryBackButton label="Torna indietro" variant="outline" size="lg" />
							</div>
						</>
					) : (
						<>
							<ProfileOverview profile={result.profile} />
							<LatestProfileAnnouncements profile={result.profile} />
							<div className="flex justify-center pt-2">
								<ProfileHistoryBackButton label="Torna indietro" variant="outline" size="lg" />
							</div>
						</>
					)}
				</div>
			</section>
		</GradientBackground>
	);
}

function ProfileOverview({profile}: {profile: PublicProfile}) {
	const typeOption = PROFILE_OPTIONS.find(({value}) => value === profile.type) ?? PROFILE_OPTIONS[0];
	const TypeIcon = typeOption.icon;

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
					<Avatar size="lg" className="size-24 shrink-0 ring-4 ring-background shadow-sm">
						{profile.imageUrl && (
							<AvatarImage src={profile.imageUrl} alt={`Foto profilo di ${profile.title}`} />
						)}
						<AvatarFallback><span className="text-xl">{profileInitials(profile.title)}</span></AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap justify-center gap-2 sm:justify-start">
							<Badge>
								<TypeIcon data-icon="inline-start" aria-hidden="true" />
								{typeOption.label}
							</Badge>
							{profile.verified && (
								<Badge variant="secondary">
									<BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />
									Verificato
								</Badge>
							)}
							{profile.primary && (
								<Badge variant="outline">
									<StarIcon data-icon="inline-start" aria-hidden="true" />
									Profilo principale
								</Badge>
							)}
							{profile.availabilityLabel && (
								<Badge variant="secondary">
									<CircleDotIcon data-icon="inline-start" aria-hidden="true" />
									{profile.availabilityLabel}
								</Badge>
							)}
						</div>
						<CardTitle className="mt-3 text-2xl sm:text-3xl">
							<h1 id="profile-detail-title">{profile.title}</h1>
						</CardTitle>
						<CardDescription className="mt-1 text-base">
							Informazioni pubbliche del profilo
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			{profile.primaryFields.length > 0 && (
				<>
					<Separator />
					<CardContent>
						<h2 className="mb-4 text-base font-semibold">Informazioni principali</h2>
						<dl className={cn(
							"grid gap-3 sm:grid-cols-2",
							profile.primaryFields.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
						)}>
							{profile.primaryFields.map((field) => (
								<div key={field.label} className="rounded-xl bg-muted/50 p-4">
									<dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
									<dd className="mt-1 whitespace-pre-wrap wrap-break-word font-semibold text-foreground">
										{field.value}
									</dd>
								</div>
							))}
						</dl>
					</CardContent>
				</>
			)}

			{profile.fields.length > 0 && (
				<>
					<Separator />
					<CardContent>
						<h2 className="mb-4 text-base font-semibold">Altre informazioni</h2>
						<dl className="grid gap-4 sm:grid-cols-2">
							{profile.fields.map((field) => (
								<div
									key={field.label}
									className={cn("rounded-xl border bg-background/60 p-4", field.wide && "sm:col-span-2")}
								>
									<dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
									<dd className="mt-1 whitespace-pre-wrap wrap-break-word text-base font-medium text-foreground">
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

function LatestProfileAnnouncements({profile}: {profile: PublicProfile}) {
	return (
		<section aria-labelledby="latest-profile-announcements" className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="latest-profile-announcements" className="text-2xl font-semibold tracking-tight">
						Ultimi annunci pubblicati
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Gli annunci pubblici più recenti associati a questa tipologia di profilo.
					</p>
				</div>
				{!profile.announcementsUnavailable && (
					<Badge variant="secondary">
						{profile.announcements.length === 1
							? "1 annuncio"
							: `${profile.announcements.length} annunci`}
					</Badge>
				)}
			</div>

			{profile.announcementsUnavailable ? (
				<Alert variant="destructive">
					<TriangleAlertIcon aria-hidden="true" />
					<AlertTitle>Annunci temporaneamente non disponibili</AlertTitle>
					<AlertDescription>Le informazioni del profilo restano consultabili. Riprova più tardi per gli annunci.</AlertDescription>
				</Alert>
			) : profile.announcements.length === 0 ? (
				<Empty className="min-h-56 border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon"><MegaphoneIcon aria-hidden="true" /></EmptyMedia>
						<EmptyTitle>Nessun annuncio pubblicato</EmptyTitle>
						<EmptyDescription>
							Questo profilo non ha ancora annunci pubblici per la tipologia selezionata.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ul className="grid gap-4 md:grid-cols-2">
					{profile.announcements.map((announcement) => (
						<li key={announcement.id}>
							<ProfileAnnouncementCard announcement={announcement} />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function ProfileAnnouncementCard({announcement}: {announcement: ProfileAnnouncement}) {
	const formattedDate = formatAnnouncementDate(announcement.createdAt);
	const detailHref = `/dettagli-annuncio?id=${encodeURIComponent(announcement.id)}`;

	return (
		<Link
			href={detailHref}
			aria-label={`Apri l’annuncio: ${announcement.title}`}
			className="block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<Card size="sm" className="h-full transition-shadow hover:shadow-md">
				<CardHeader>
					<div className="mb-1 flex flex-wrap gap-2">
						<Badge variant="secondary">{announcement.subtypeLabel}</Badge>
						{announcement.level && (
							<Badge variant="outline">{humanizeValue(announcement.level)}</Badge>
						)}
					</div>
					<CardTitle><h3>{announcement.title}</h3></CardTitle>
					<CardDescription className="line-clamp-3">{announcement.description}</CardDescription>
				</CardHeader>
				<CardContent className="mt-auto">
					<p className="flex items-start gap-2 text-sm text-muted-foreground">
						<MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<span>{announcement.location}</span>
					</p>
				</CardContent>
				<CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
					<span>{announcement.typeLabel}</span>
					{announcement.createdAt ? (
						<time dateTime={announcement.createdAt} className="flex items-center gap-1.5">
							<CalendarDaysIcon className="size-3.5" aria-hidden="true" />
							{formattedDate}
						</time>
					) : (
						<span className="flex items-center gap-1.5">
							<CalendarDaysIcon className="size-3.5" aria-hidden="true" />
							{formattedDate}
						</span>
					)}
				</CardFooter>
			</Card>
		</Link>
	);
}
