import {Suspense, type CSSProperties} from "react";
import Link from "next/link";
import {
	ArrowRightIcon,
	BriefcaseBusinessIcon,
	CameraIcon,
	HandshakeIcon,
	MapPinIcon,
	RocketIcon,
} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import type {ProfileType} from "@/features/profilo/profile-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {cn} from "@/lib/utils";
import {loadLatestPublicAnnouncements} from "@/features/annunci/server/queries";
import HomepageTitle from "@/features/homepage/components/HomepageTitle";

interface HomepageCategory {
	type: ProfileType;
	label: string;
	description: string;
}

const HOMEPAGE_CATEGORIES = [
	{
		type: "giocatore",
		label: "Giocatori",
		description: "Trova la tua prossima opportunità",
	},
	{
		type: "staff-sportivo",
		label: "Staff",
		description: "Allena il talento, costruisci il futuro",
	},
	{
		type: "squadra",
		label: "Squadre",
		description: "Cerca profili e rafforza la tua rosa",
	},
	{
		type: "professionisti-studi",
		label: "Professionisti",
		description: "Scopri nuovi talenti e opportunità",
	},
	{
		type: "creators",
		label: "Creators",
		description: "Racconta il calcio a modo tuo",
	},
	{
		type: "torneo-evento",
		label: "Tornei / Eventi",
		description: "Promuovi i tuoi eventi e raggiungi tutti",
	},
	{
		type: "campi-impianti-sportivi",
		label: "Campi / Strutture",
		description: "Trova o pubblica la tua struttura",
	},
] as const satisfies readonly HomepageCategory[];

const PROFILE_LABELS: Record<ProfileType, string> = {
	giocatore: "Giocatori",
	squadra: "Squadre",
	"staff-sportivo": "Staff",
	"professionisti-studi": "Professionisti",
	arbitro: "Arbitri",
	creators: "Creators",
	"torneo-evento": "Tornei / Eventi",
	"campi-impianti-sportivi": "Campi / Strutture",
};

function formatPublishedAt(createdAt: string | null) {
	if (!createdAt) return "Data non disponibile";

	const publishedAt = new Date(createdAt);
	if (Number.isNaN(publishedAt.getTime())) return "Data non disponibile";

	const elapsed = Math.max(0, Date.now() - publishedAt.getTime());
	const minutes = Math.floor(elapsed / 60_000);
	const hours = Math.floor(elapsed / 3_600_000);
	const days = Math.floor(elapsed / 86_400_000);

	if (minutes < 1) return "Adesso";
	if (minutes < 60) return `${minutes} min fa`;
	if (hours < 24) return `${hours}h fa`;
	if (days < 30) return `${days}g fa`;

	return new Intl.DateTimeFormat("it-IT", {
		day: "numeric",
		month: "short",
	}).format(publishedAt);
}

const PROMOTIONS = [
	{
		eyebrow: "Per i professionisti",
		title: "Osserva. Collabora. Cresci",
		description: "Scopri talenti, entra in contatto con realtà affidabili e nuove opportunità.",
		href: "/profili?type=professionisti-studi",
		cta: "Scopri di più",
		icon: BriefcaseBusinessIcon,
		accent: "#111111",
	},
	{
		eyebrow: "Per i creators",
		title: "Il tuo contenuto ha valore",
		description: "Condividi la tua passione, racconta storie, intervista e analizza il calcio.",
		href: "/profili?type=creators",
		cta: "Scopri di più",
		icon: CameraIcon,
		accent: "#E53935",
	},
	{
		eyebrow: "Partner ufficiali",
		title: "Insieme per il nostro calcio",
		description: "Unisciti ai brand che credono nei valori del calcio dilettantistico.",
		href: "/contatti",
		cta: "Diventa partner",
		icon: HandshakeIcon,
		accent: "#111111",
	},
] as const;

function LatestOpportunitiesSkeleton() {
	return (
		<CardContent className="px-0" aria-busy="true">
			<p className="sr-only" role="status">Caricamento ultime opportunità</p>
			<ul aria-hidden="true">
				{Array.from({length: 6}, (_, index) => (
					<li key={index} className="border-b border-black/8 last:border-b-0">
						<div className="grid min-h-15 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:px-5 xl:grid-cols-[2.5rem_minmax(0,1fr)_minmax(6rem,auto)_auto]">
							<Skeleton className="col-start-1 row-start-1 size-8 rounded-lg" />
							<Skeleton className="col-span-2 col-start-1 row-start-2 h-4 w-4/5 sm:col-span-1 sm:col-start-2 sm:row-start-1" />
							<div className="col-span-2 col-start-1 row-start-3 inline-flex items-center gap-1.5 sm:col-start-2 sm:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1">
								<Skeleton className="size-3.5 shrink-0 rounded-full" />
								<Skeleton className="h-3 w-24" />
							</div>
							<Skeleton className="col-start-2 row-start-1 h-3 w-12 justify-self-end sm:col-start-3 xl:col-start-4" />
						</div>
					</li>
				))}
			</ul>
		</CardContent>
	);
}

async function LatestOpportunitiesContent() {
	const {announcements, error} = await loadLatestPublicAnnouncements();

	return (
		<CardContent className="px-0">
			{error ? (
				<div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
					<p className="font-bold">Opportunità temporaneamente non disponibili.</p>
					<Link className="text-sm font-bold text-[#6445de] hover:underline" href="/annunci">
						Apri la bacheca annunci
					</Link>
				</div>
			) : announcements.length === 0 ? (
				<div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
					<p className="font-bold">Nessuna opportunità pubblicata al momento.</p>
					<Link className="text-sm font-bold text-[#6445de] hover:underline" href="/annunci">
						Esplora la bacheca
					</Link>
				</div>
			) : (
				<ul aria-label="Ultimi annunci pubblicati">
					{announcements.map((announcement) => {
						const accent = getProfileAccent(announcement.profileType);
						const publishedLabel = formatPublishedAt(announcement.createdAt);

						return (
							<li key={announcement.id} className="border-b border-black/8 last:border-b-0">
								<Link
									href={`/dettagli-annuncio?id=${encodeURIComponent(announcement.id)}`}
									className="grid min-h-15 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 outline-none transition-colors hover:bg-brand-indigo/5 focus-visible:bg-brand-indigo/10 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-brand-indigo/35 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:px-5 xl:grid-cols-[2.5rem_minmax(0,1fr)_minmax(6rem,auto)_auto]"
								>
									<span
										className="col-start-1 row-start-1 flex size-8 items-center justify-center rounded-lg"
										style={{backgroundColor: `${accent}12`}}
									>
										<ProfilePngIcon type={announcement.profileType} color={accent} className="size-5" />
										<span className="sr-only">{PROFILE_LABELS[announcement.profileType]}</span>
									</span>
									<span className="col-span-2 col-start-1 row-start-2 min-w-0 text-sm font-bold leading-5 sm:col-span-1 sm:col-start-2 sm:row-start-1">
										<span className="line-clamp-2">{announcement.title}</span>
									</span>
									<span className="col-span-2 col-start-1 row-start-3 inline-flex min-w-0 items-center gap-1.5 text-xs text-neutral-600 sm:col-start-2 sm:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1">
										<MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
										<span className="truncate">{announcement.location}</span>
									</span>
									<time
										dateTime={announcement.createdAt ?? undefined}
										className="col-start-2 row-start-1 justify-self-end whitespace-nowrap text-xs text-neutral-500 sm:col-start-3 xl:col-start-4"
									>
										{publishedLabel}
									</time>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</CardContent>
	);
}

export default function Homepage() {
	return (
		<div
			id="main-content"
			className="font-home-body overflow-x-clip bg-[radial-gradient(circle_at_55%_0%,rgba(142,114,255,0.10),transparent_34rem),linear-gradient(180deg,#ffffff_0%,#fbfaff_72%,#ffffff_100%)] text-brand-ink antialiased"
		>
			<section aria-labelledby="homepage-title">
				<div className="mx-auto grid max-w-370 gap-10 px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8 min-[1120px]:grid-cols-[1.02fr_0.98fr] min-[1120px]:items-center min-[1120px]:pb-12 min-[1120px]:pt-16">
					<div className="max-w-2xl">
						<HomepageTitle
							title="Il punto d’incontro del calcio dilettantistico"
							className="font-home-display text-[clamp(2.65rem,4.25vw,4rem)] text-black font-bold uppercase leading-[0.99] tracking-[-0.035em]"
						/>
						<p className="mt-6 max-w-2xl text-base leading-7 text-neutral-700 sm:text-lg sm:leading-8">
							Bacheca Dilettanti è la piattaforma dedicata a giocatori, staff, società,
							professionisti e appassionati che vivono il calcio ogni giorno. Opportunità,
							connessioni e visibilità, tutto in un unico spazio.
						</p>
						<div className="mt-7 flex flex-col gap-3 min-[430px]:flex-row">
							<Link
								href="/annunci"
								className={cn(
									buttonVariants({
										variant: "brand",
										size: "lg",
									}),
									"h-11 justify-between gap-6 text-white font-bold uppercase px-5 min-[430px]:min-w-52",
								)}
							>
								<span className={"text-white font-bold uppercase"}>Sfoglia annunci</span>
								<ArrowRightIcon
									data-icon="inline-end"
									aria-hidden="true"
									className="-translate-x-2 transition-transform duration-200 ease-out group-hover/button:-translate-x-1.5"
								/>
							</Link>
							<Link
								href="/pubblica-annuncio"
								className={cn(
									buttonVariants({
										variant: "outline",
										size: "lg",
									}),
									"h-11 justify-between gap-6 text-black font-bold uppercase px-5 min-[430px]:min-w-52 border-black/50",
								)}
							>
								<span className={"text-black font-bold uppercase"}>Pubblica ora</span>
								<ArrowRightIcon
									data-icon="inline-end"
									aria-hidden="true"
									className="-translate-x-2 transition-transform duration-200 ease-out group-hover/button:-translate-x-1.5"
								/>
							</Link>
						</div>
					</div>

					<Card className="gap-0 overflow-hidden border border-black/10 bg-white/90 py-0 shadow-none ring-0 backdrop-blur-sm">
						<CardHeader className="flex min-h-16 flex-row items-center justify-between gap-4 border-b border-black/10 px-4 py-4 sm:ps-5">
							<h2 className="font-home-display text-xl font-semibold uppercase tracking-[-0.01em] sm:text-2xl">
								<span className="text-brand-indigo blink-anim me-0.5">•</span> Ultime opportunità
							</h2>
							<Link
								href="/annunci"
								className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-bold uppercase text-[#6445de] outline-none transition-colors hover:bg-brand-indigo/10 focus-visible:ring-3 focus-visible:ring-brand-indigo/35"
							>
								Vedi tutte
								<ArrowRightIcon className="size-3.5" aria-hidden="true" />
							</Link>
						</CardHeader>

						<Suspense fallback={<LatestOpportunitiesSkeleton />}>
							<LatestOpportunitiesContent />
						</Suspense>
					</Card>
				</div>
			</section>

			<section id="categorie" aria-labelledby="categories-title" className="scroll-mt-24">
				<div className="mx-auto max-w-370 px-4 pb-7 sm:px-6 sm:pb-8 lg:px-8">
					<h2
						id="categories-title"
						className="font-home-display mb-3 text-lg font-normal uppercase tracking-[-0.01em] sm:text-xl"
					>
						Cerca. Connettiti. Cresci.
					</h2>
					<div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
						{HOMEPAGE_CATEGORIES.map((category) => {
							const accent = getProfileAccent(category.type);

							return (
								<Link
									key={category.type}
									href={`/profili?type=${category.type}`}
									className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-brand-indigo/45 focus-visible:ring-offset-2"
								>
									<Card
										className="h-full gap-0 border bg-white/85 py-0 shadow-none ring-0 transition-transform duration-200 group-hover:-translate-y-1"
										style={{borderColor: `${accent}45`} as CSSProperties}
									>
										<CardContent className="flex h-full min-h-42 flex-col px-4 py-4">
											<ProfilePngIcon type={category.type} color={accent} className="size-9" />
											<h3 className="font-home-display mt-3 text-base font-normal uppercase leading-tight text-black">
												{category.label}
											</h3>
											<p className="mt-2 text-xs leading-5 text-neutral-700">{category.description}</p>
											<div
												className="mt-auto transition-transform group-hover:translate-x-1"
											>
												<span
													className="mt-4 flex size-7 translate-y-1 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-px"
													style={{backgroundColor: accent}}
													aria-hidden="true"
												>
													<ArrowRightIcon className="size-3.5" />
												</span>
											</div>
										</CardContent>
									</Card>
								</Link>
							);
						})}
					</div>
				</div>
			</section>

			<section aria-label="Scopri Bacheca Dilettanti">
				<div className="mx-auto max-w-370 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
					<Card className="grid gap-px overflow-hidden bg-black/10 py-0 shadow-none ring-1 ring-black/10 md:grid-cols-2 xl:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
						<article className="bg-[linear-gradient(135deg,#f0ecff_0%,#ffffff_100%)] p-5 sm:pt-6 sm:pb-4">
							<div className="flex items-start gap-4">
								<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-indigo/15 text-[#6445de]">
									<RocketIcon className="size-6" aria-hidden="true" />
								</span>
								<div className="min-w-0">
									<p className="font-home-display text-base font-normal uppercase text-[#6445de]">Il lancio è vicino</p>
									<h2 className="font-home-display mt-1 text-2xl font-medium uppercase leading-none">Preparati al decollo</h2>
									<p className="mt-3 text-sm leading-5 text-neutral-700">
										Bacheca Dilettanti sta per arrivare. Unisciti alla community e sii tra i primi a vivere l’esperienza completa.
									</p>
									<Link
										href="/aggiornamenti"
										className={buttonVariants({
											variant: "outline",
											size: "sm",
											className: "mt-4 sm:mt-10 h-9 border-[#8e72ff]/60 bg-white px-4 font-bold uppercase text-[#6445de]",
										})}
									>
										Rimani aggiornato
										<ArrowRightIcon aria-hidden="true" />
									</Link>
								</div>
							</div>
						</article>

						{PROMOTIONS.map((promotion) => {
							const Icon = promotion.icon;

							return (
								<article key={promotion.eyebrow} className="flex h-full bg-white p-5 sm:pt-6 sm:pb-2">
									<div className="flex w-full min-w-0 items-start gap-4">
										<span
											className="flex size-11 shrink-0 items-center justify-center rounded-full"
											style={{backgroundColor: `${promotion.accent}10`, color: promotion.accent}}
										>
											<Icon className="size-5" aria-hidden="true" />
										</span>
										<div className="flex min-h-36 sm:min-h-44 min-w-0 flex-1 flex-col self-stretch">
											<p className="font-home-display text-sm font-normal uppercase" style={{color: promotion.accent}}>
												{promotion.eyebrow}
											</p>
											<h2 className="font-home-display mt-1 text-2xl font-medium uppercase leading-[1.05]">
												{promotion.title}
											</h2>
											<p className="mt-3 text-sm leading-5 text-neutral-700">{promotion.description}</p>
											<div
												className="mt-auto"
											>
												<Link
													href={promotion.href}
													className={cn(
														"sm:mt-4 inline-flex min-h-11 items-center gap-1 self-start rounded-md py-2 text-xs font-bold uppercase text-[#6445de] outline-none hover:underline focus-visible:ring-3 focus-visible:ring-brand-indigo/35",
													)}
												>
													{promotion.cta}
													<ArrowRightIcon className="size-3.5" aria-hidden="true" />
												</Link>
											</div>
										</div>
									</div>
								</article>
							);
						})}
					</Card>
				</div>
			</section>
		</div>
	);
}
