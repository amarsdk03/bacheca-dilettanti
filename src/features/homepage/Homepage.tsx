import {Suspense, type CSSProperties} from "react";
import Link from "next/link";
import {
	ArrowRightIcon,
	BriefcaseBusinessIcon,
	CalendarDaysIcon,
	CameraIcon, ClipboardListIcon,
	HandshakeIcon,
	MapPinIcon, MegaphoneIcon, PickaxeIcon,
	RocketIcon, UserPlusIcon, UsersIcon,
} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import ComingSoonBadge from "@/features/profilo/ComingSoonBadge";
import {
	isLimitedProfileType,
	type ProfileType,
} from "@/features/profilo/profile-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {cn} from "@/lib/utils";
import {loadLatestPublicAnnouncements} from "@/features/annunci/server/queries";
import HomepageTitle from "@/features/homepage/components/HomepageTitle";
import HomepageNotices from "@/features/homepage/components/HomepageNotices";
import {HOMEPAGE_NOTICES} from "@/features/homepage/homepage-notices";
import HomepageWorkInProgressNotice from "@/features/homepage/components/HomepageWorkInProgressNotice";
import ArticleImage from "@/features/aggiornamenti/ArticleImage";
import {formatArticleDate, getAllArticles, getArticleCover} from "@/lib/articles";

interface HomepageCategory {
	type: ProfileType;
	label: string;
	description: string;
	comingSoon: boolean;
}

const HOMEPAGE_CATEGORIES = [
	{
		type: "giocatore",
		label: "Giocatori",
		description: "Sfoglia i profili e trova i giocatori per la tua squadra.",
		comingSoon: false,
	},
	{
		type: "squadra",
		label: "Squadre",
		description: "Scopri le squadre e trova nuove opportunità.",
		comingSoon: false,
	},
	{
		type: "staff-sportivo",
		label: "Staff sportivi",
		description: "Sfoglia i profili e trova le figure giuste per il tuo staff.",
		comingSoon: false,
	},
	{
		type: "arbitro",
		label: "Arbitri",
		description: "Presto in arrivo...",
		comingSoon: true,
	},
	{
		type: "torneo-evento",
		label: "Tornei / Eventi",
		description: "Presto in arrivo...",
		comingSoon: true,
	},
	{
		type: "campi-impianti-sportivi",
		label: "Campi / Strutture",
		description: "Presto in arrivo...",
		comingSoon: true,
	},
	{
		type: "professionisti-studi",
		label: "Professionisti",
		description: "Presto in arrivo...",
		comingSoon: true,
	},
	{
		type: "creators",
		label: "Creators",
		description: "Presto in arrivo...",
		comingSoon: true,
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
		eyebrow: "Bacheca",
		title: "Trova o pubblica un'opportunità",
		description: "Sfoglia gli annunci oppure pubblica gratuitamente quello che stai cercando.",
		href: "/annunci",
		cta: "Vai alla bacheca",
		icon: ClipboardListIcon,
		accent: "#8e72ff",
	},
	{
		eyebrow: "Professionisti",
		title: "Trova il professionista giusto",
		description: "Scopri professionisti dello sport e trova quello più adatto alle tue esigenze.",
		href: "/profili?type=professionisti-studi",
		cta: "Scopri di più",
		icon: BriefcaseBusinessIcon,
		accent: "#D4B21F",
	},
	{
		eyebrow: "Partner",
		title: "Entra nel programma founding",
		description: "Entra tra i partner che scelgono di affiancare Bacheca Dilettanti fin dal lancio e accedi alle condizioni riservate ai primi ingressi.",
		href: "/partner",
		cta: "Scopri il programma founding",
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
									<span className="col-span-2 col-start-1 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
										<span
											className="mb-0.5 block text-[0.63rem] font-bold uppercase tracking-[0.12em]"
											style={{color: accent}}
										>
											{PROFILE_LABELS[announcement.profileType]}
										</span>
										<span className="line-clamp-2 text-sm font-bold leading-5">{announcement.title}</span>
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
	const latestArticles = getAllArticles().slice(0, 3);

	return (
		<div
			id="main-content"
			className="font-home-body overflow-x-clip bg-[radial-gradient(circle_at_55%_0%,rgba(142,114,255,0.10),transparent_34rem),linear-gradient(180deg,#ffffff_0%,#fbfaff_72%,#ffffff_100%)] text-brand-ink antialiased"
		>
			<HomepageWorkInProgressNotice />

			<section aria-labelledby="homepage-title">
				<div className="mx-auto grid max-w-370 gap-10 px-4 sm:px-6 pb-10 sm:pb-12 pt-10 sm:pt-14 lg:px-8 min-[1120px]:grid-cols-[1.02fr_0.98fr] min-[1120px]:items-center min-[1120px]:pb-12 min-[1120px]:pt-16">
					<div className="max-w-2xl">
						<HomepageTitle
							title="Il punto d’incontro del calcio dilettantistico"
							className="font-home-display text-[clamp(2.65rem,4.25vw,4rem)] text-black font-bold uppercase leading-[0.99] tracking-[-0.035em]"
						/>
						<p className="mt-6 max-w-2xl text-base leading-7 text-neutral-700 sm:text-lg sm:leading-8">
							Bacheca Dilettanti è la piattaforma dedicata a giocatori, staff, società e professionisti
							che vivono il calcio ogni giorno. Profili, annunci, opportunità e visibilità. Tutto in un
							unico spazio.
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
						Trova quello che cerchi:
					</h2>
					<div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-4">
						{HOMEPAGE_CATEGORIES.map((category) => {
							const accent = getProfileAccent(category.type);
							const limited = isLimitedProfileType(category.type);

							const card = (
								<Card
									className={cn(
										"h-full gap-0 border bg-white/85 py-0 shadow-none ring-0 transition-transform duration-200 overflow-visible",
										limited ? "bg-muted/45 opacity-65" : "group-hover:-translate-y-1",
									)}
									style={{borderColor: `${limited ? '#999999' : accent}45`} as CSSProperties}
								>
									<CardContent className="relative flex h-full min-h-42 flex-col px-4 py-4 overflow-visible">
										{limited && <ComingSoonBadge className="absolute -right-1 -top-1 z-10 text-md font-semibold p-2.5 border-black bg-white text-black" />}
										<ProfilePngIcon type={category.type} color={limited ? '#cccccc' : accent} className="size-9" />
										<h3 className="font-home-display mt-3 text-base font-normal uppercase leading-tight text-black">
											{category.label}
										</h3>
										<p className="mt-2 text-xs leading-5 text-neutral-700">{category.description}</p>
										{!limited && (
											<div className="mt-auto transition-transform group-hover:translate-x-1">
												<span
													className="mt-4 flex size-7 translate-y-1 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-px"
													style={{backgroundColor: accent}}
													aria-hidden="true"
												>
													<ArrowRightIcon className="size-3.5" />
												</span>
											</div>
										)}
									</CardContent>
								</Card>
							);

							return limited ? (
								<div key={category.type} aria-disabled="true" className="rounded-xl">
									{card}
								</div>
							) : (
								<Link
									key={category.type}
									href={`/profili?type=${category.type}`}
									className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-brand-indigo/45 focus-visible:ring-offset-2"
								>
									{card}
								</Link>
							);
						})}
					</div>
				</div>
			</section>

			<HomepageNotices notices={HOMEPAGE_NOTICES} />

			<section aria-label="Scopri Bacheca Dilettanti">
				<div className="mx-auto max-w-370 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
					<Card className="grid gap-px overflow-hidden bg-black/10 py-0 shadow-none ring-1 ring-black/10 md:grid-cols-2 xl:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
						<article className="bg-[linear-gradient(135deg,#f0ecff_0%,#ffffff_100%)] p-5 sm:pt-6 sm:pb-4">
							<div className="flex items-start gap-4 h-full">
								<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-indigo/15 text-[#6445de]">
									<UserPlusIcon className="size-6" aria-hidden="true" />
								</span>
								<div className="min-w-0 h-full flex flex-col justify-between">
									<div className={"mb-6 xl:mb-0"}>
										<p className="font-home-display text-base font-normal uppercase text-[#6445de]">
											Il tuo profilo
										</p>
										<h2 className="font-home-display mt-1 text-2xl font-medium uppercase leading-none">
											Fatti conoscere
										</h2>
										<p className="mt-3 text-sm leading-5 text-neutral-700">
											Crea il tuo profilo e presenta esperienza, ruolo e percorso calcistico.
										</p>
									</div>
									<Link
										href="/registrati"
										className={cn(
											buttonVariants({
												variant: "outline",
												size: "sm",
											}),
											"h-9 w-48 border-[#8e72ff]/60 bg-white px-4 font-bold uppercase text-[#6445de] hover:underline"
										)}
										target="_blank"
									>
										Crea il tuo profilo
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
												className="mt-auto pt-4 xl:pt-0"
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

			<section aria-labelledby="latest-news-title">
				<div className="mx-auto max-w-370 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
					<div className="mb-4 flex flex-col md:flex-row items-start md:items-end justify-between md:gap-4 sm:mb-5">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6445de]">Aggiornamenti</p>
							<h2 id="latest-news-title" className="font-home-display mt-1 text-2xl font-medium uppercase leading-none sm:text-3xl">
								Ultimi articoli della Bacheca
							</h2>
						</div>
						<Link
							href="/aggiornamenti"
							className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md md:px-2 text-xs font-bold uppercase text-[#6445de] outline-none transition-colors hover:bg-brand-indigo/10 focus-visible:ring-3 focus-visible:ring-brand-indigo/35"
						>
							Tutti gli aggiornamenti
							<ArrowRightIcon className="size-3.5" aria-hidden="true" />
						</Link>
					</div>

					<div className="grid gap-3 md:grid-cols-3">
						{latestArticles.map((article) => (
							<article key={article.slug} className="group max-h-96">
								<Link
									href={`/aggiornamenti/${article.slug}`}
									className="block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-brand-indigo/45 focus-visible:ring-offset-2"
								>
									<Card className="h-full gap-0 border border-black/10 bg-white/85 py-0 shadow-none ring-0 transition-transform duration-200 group-hover:-translate-y-1">
										<div className="relative aspect-video overflow-hidden bg-brand-indigo/10">
											<ArticleImage
												src={getArticleCover(article.coverImage)}
												alt=""
												sizes="(max-width: 768px) 100vw, 33vw"
												className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
											/>
											<div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
											<span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-[#6445de] backdrop-blur">
												{article.category}
											</span>
										</div>
										<CardContent className="h-full flex flex-col justify-between min-h-45 px-4 py-4 sm:px-5">
											<div>
												<time dateTime={article.date} className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
													<CalendarDaysIcon className="size-3.5" aria-hidden="true" />
													{formatArticleDate(article.date)}
												</time>
												<h3 className="font-home-display mt-3 text-xl font-medium uppercase leading-[1.05]">
													{article.title}
												</h3>
												<p className="mt-3 line-clamp-3 text-sm leading-5 text-neutral-700">{article.description}</p>
											</div>
											<span className="pt-4 inline-flex items-center gap-1 text-xs font-bold uppercase text-[#6445de]">
												Leggi l&apos;aggiornamento
												<ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
											</span>
										</CardContent>
									</Card>
								</Link>
							</article>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
