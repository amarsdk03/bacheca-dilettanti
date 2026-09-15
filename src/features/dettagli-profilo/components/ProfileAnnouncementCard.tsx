import {
	BanknoteIcon,
	CalendarDaysIcon,
	CarFrontIcon,
	Clock3Icon,
	CoinsIcon,
	MapPinIcon,
	MedalIcon,
	ShapesIcon,
	ShieldCheckIcon,
	TagIcon,
	TrophyIcon,
	UsersRoundIcon,
	WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import type {AnnouncementFactKind} from "@/features/annunci/announcement-model";
import type {ProfileAnnouncement} from "@/features/dettagli-profilo/profile-detail-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "long",
	timeZone: "Europe/Rome",
	year: "numeric",
});


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

const FACT_ICON_BY_KIND = {
	availability: Clock3Icon,
	car: CarFrontIcon,
	categories: TrophyIcon,
	content: TagIcon,
	compensation: BanknoteIcon,
	figures: UsersRoundIcon,
	headquarters: MapPinIcon,
	location: MapPinIcon,
	participation: UsersRoundIcon,
	period: CalendarDaysIcon,
	price: CoinsIcon,
	registration: ShieldCheckIcon,
	roles: MedalIcon,
	season: CalendarDaysIcon,
	sector: ShapesIcon,
	services: WrenchIcon,
	specializations: MedalIcon,
	time: Clock3Icon,
	types: TagIcon,
} satisfies Record<AnnouncementFactKind, typeof TagIcon>;

function isUsefulFact(value: string) {
	return value.trim().length > 0 && value !== "Non specificato";
}

export default function ProfileAnnouncementCard({announcement}: {announcement: ProfileAnnouncement}) {
	const formattedDate = formatAnnouncementDate(announcement.createdAt);
	const detailHref = `/dettagli-annuncio?id=${encodeURIComponent(announcement.id)}`;
	const accent = getProfileAccent(announcement.profileType);
	const facts = announcement.facts.filter(({value}) => isUsefulFact(value)).slice(0, 4);

	return (
		<Link
			href={detailHref}
			aria-label={`Apri l’annuncio: ${announcement.title}`}
			className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<Card
				size="sm"
				className="relative h-full overflow-hidden border-black/8 bg-card transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg"
			>
				<span className="absolute inset-x-0 top-0 h-1" style={{backgroundColor: accent}} aria-hidden="true" />
				<CardHeader className="pt-5">
					<div className="mb-2 flex items-start gap-3">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor: `${accent}14`}}>
							<ProfilePngIcon type={announcement.profileType} color={accent} className="size-6" />
						</span>
						<div className="flex min-w-0 flex-wrap gap-1.5 pt-0.5">
							<Badge className="border-0" style={{backgroundColor: `${accent}18`, color: accent}}>{announcement.subtypeLabel}</Badge>
						{announcement.level && (
							<Badge variant="outline">{humanizeValue(announcement.level)}</Badge>
						)}
						</div>
					</div>
					<CardTitle><h3 className="wrap-anywhere text-lg leading-snug">{announcement.title}</h3></CardTitle>
					<CardDescription className="line-clamp-3 wrap-anywhere">{announcement.description}</CardDescription>
				</CardHeader>
				<CardContent className="mt-auto grid gap-4">
					{facts.length > 0 && (
						<dl className="grid gap-2 sm:grid-cols-2">
							{facts.map((fact) => {
								const Icon = FACT_ICON_BY_KIND[fact.kind];
								return (
									<div key={`${fact.label}-${fact.value}`} className="min-w-0 rounded-lg border border-black/7 bg-muted/25 px-3 py-2.5">
										<dt className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
											<Icon className="size-3.5 shrink-0" style={{color: accent}} aria-hidden="true" />
											{fact.label}
										</dt>
										<dd className="mt-1 line-clamp-2 wrap-anywhere text-sm font-medium leading-5">{fact.value}</dd>
									</div>
								);
							})}
						</dl>
					)}
					<p className="flex items-start gap-2 text-sm text-muted-foreground">
						<MapPinIcon className="mt-0.5 size-4 shrink-0" style={{color: accent}} aria-hidden="true" />
						<span className="wrap-anywhere">{announcement.location}</span>
					</p>
				</CardContent>
				<CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
					<span className="font-medium">{announcement.typeLabel}</span>
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
