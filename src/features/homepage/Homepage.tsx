'use client';

import {useState} from 'react';
import Link from "next/link";
import type {CSSProperties} from 'react';

import type {Variants} from "motion/react";
import {AnimatePresence, motion, useReducedMotion} from "motion/react";
import {Bricolage_Grotesque, IBM_Plex_Mono, Manrope} from 'next/font/google';
import {
	ArrowRight,
	ArrowUpRight,
	Clock,
	MapPin,
	Pin,
} from 'lucide-react';
import Image from "next/image";
import {Card, CardContent} from "@/components/ui/card";
import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";



/**
 * Font setup — per un'app reale conviene spostare questi loader in app/layout.tsx
 * e riusare le stesse CSS variable ovunque. Qui restano nel componente per renderlo
 * autonomo e facile da incollare in un progetto esistente.
 */
const display = Bricolage_Grotesque({
	subsets: ['latin'],
	variable: '--font-display',
});

const body = Manrope({
	subsets: ['latin'],
	variable: '--font-body',
});

const mono = IBM_Plex_Mono({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	variable: '--font-mono',
});




type ListingCategory = 'Giocatore' | 'Squadra' | 'Staff';
type FilterValue = 'Tutti' | ListingCategory;

interface Listing {
	id: string;
	category: ListingCategory;
	type: string;
	title: string;
	region: string;
	level: string;
	postedAgo: string;
	rotate?: number;
}

interface Stat {
	value: string;
	label: string;
}

interface AudienceCategory {
	icon: string;
	title: string;
	need: string;
	opportunity: string;
}

interface UserType {
	label: string;
	description: string;
}




const heroListings: Listing[] = [
	{
		id: 'h1',
		category: 'Giocatore',
		type: 'Calcio a 11',
		title: 'Terzino sinistro, classe 2001, valuta proposte',
		region: 'Lombardia',
		level: 'Eccellenza, Promozione',
		postedAgo: '2 giorni fa',
		rotate: -4,
	},
	{
		id: 'h2',
		category: 'Squadra',
		type: 'Calcio a 7',
		title: 'Cerchiamo centrocampista per la prossima stagione',
		region: 'Emilia-Romagna',
		level: 'Primavera',
		postedAgo: '5 ore fa',
		rotate: 3,
	},
	{
		id: 'h3',
		category: 'Staff',
		type: 'Calcio a 5',
		title: 'Preparatore atletico disponibile da subito',
		region: 'Puglia, Campania',
		level: 'Dilettantistico, Giovanile',
		postedAgo: '1 giorno fa',
		rotate: -2,
	},
];

const listings: Listing[] = [
	{
		id: 'l1',
		category: 'Giocatore',
		type: 'Calcio a 11',
		title: 'Centrocampista centrale, classe 1999, valuta proposte in Promozione',
		region: 'Lombardia',
		level: 'Promozione',
		postedAgo: '2 giorni fa',
	},
	{
		id: 'l2',
		category: 'Squadra',
		type: 'Calcio a 11',
		title: 'Cerca portiere per la prossima stagione tra Eccellenza e Promozione',
		region: 'Veneto',
		level: 'Eccellenza',
		postedAgo: '5 ore fa',
	},
	{
		id: 'l3',
		category: 'Staff',
		type: 'Calcio a 5',
		title: 'Preparatore atletico disponibile da subito per settore giovanile',
		region: 'Emilia-Romagna',
		level: 'Giovanile',
		postedAgo: '1 giorno fa',
	},
	{
		id: 'l4',
		category: 'Giocatore',
		type: 'Calcio a 7',
		title: 'Esterno offensivo con esperienza in tornei regionali di Calcio a 7',
		region: 'Toscana',
		level: 'Campionato amatoriale',
		postedAgo: '3 giorni fa',
	},
	{
		id: 'l5',
		category: 'Squadra',
		type: 'Calcio a 11',
		title: 'Cerchiamo terzino under 20 per completare la rosa della prima squadra',
		region: 'Lazio',
		level: 'Promozione',
		postedAgo: '6 ore fa',
	},
	{
		id: 'l6',
		category: 'Staff',
		type: 'Calcio a 11',
		title: 'Allenatore UEFA B cerca nuova squadra per la prossima stagione',
		region: 'Puglia',
		level: 'Promozione',
		postedAgo: '4 giorni fa',
	},
];

const stats: Stat[] = [
	{value: '1.240+', label: 'Annunci pubblicati'},
	{value: '310+', label: 'Società iscritte'},
	{value: '20', label: 'Regioni coperte'},
	{value: '30 min', label: 'Tempo medio di risposta'},
];

const audienceCategories: AudienceCategory[] = [
	{
		icon: 'User',
		title: 'Giocatori',
		need: 'Proporsi, mostrare esperienze e disponibilità, essere trovati.',
		opportunity: 'Profili Plus e Pro, video e annunci prioritari',
	},
	{
		icon: 'ClipboardList',
		title: 'Staff e professionisti',
		need: 'Presentare qualifiche, CV, competenze professionali e operative.',
		opportunity: 'Abbonamenti, portfolio e pubblicazioni nel feed',
	},
	{
		icon: 'Shield',
		title: 'Club dilettantistici',
		need: 'Pubblicare annunci, presentare la società e trovare risorse.',
		opportunity: 'Profili vetrina, Club Pilota e promozione',
	},
	{
		icon: 'Briefcase',
		title: 'Professionisti e studi',
		need: 'Proporre servizi a club, atleti e famiglie.',
		opportunity: 'Abbonamenti dedicati, articoli e partnership',
	},
	{
		icon: 'GraduationCap',
		title: 'Enti di formazione',
		need: 'Promuovere corsi e raggiungere un pubblico verticale.',
		opportunity: 'Offerte personalizzate ed esclusive merceologiche',
	},
	{
		icon: 'Handshake',
		title: 'Agenzie e agenti',
		need: 'Presentare attività, opportunità e contenuti.',
		opportunity: 'Profili dedicati e pacchetti a numero di pubblicazioni',
	},
	{
		icon: 'MapPin',
		title: 'Gestori di campi',
		need: 'Essere trovati e facilitare le prenotazioni.',
		opportunity: 'Profili locali, listini, disponibilità e booking',
	},
	{
		icon: 'CalendarDays',
		title: 'Organizzatori di tornei',
		need: 'Riempire le iscrizioni e comunicare le scadenze.',
		opportunity: 'Pacchetti promozionali ad alto valore economico',
	},
	{
		icon: 'Building2',
		title: 'Aziende e partner',
		need: 'Raggiungere una community calcistica profilata.',
		opportunity: 'Spazi pubblicitari, sponsorizzazioni e pacchetti partner',
	},
];

const userTypes: UserType[] = [
	{label: 'Giocatori', description: 'Atleti che cercano una squadra, una vetrina o una nuova opportunità.'},
	{label: 'Staff', description: 'Allenatori, preparatori e dirigenti tecnici che vogliono proporsi.'},
	{label: 'Società', description: 'Club e realtà sportive che pubblicano richieste o presentazioni.'},
	{label: 'Professionisti', description: 'Figure specialistiche e consulenti che lavorano nel calcio dilettantistico.'},
	{label: 'Eventi', description: 'Tornei, open day, stage e appuntamenti da promuovere al pubblico giusto.'},
	{label: 'Strutture', description: 'Campi, impianti e servizi sportivi da mettere in evidenza.'},
];

const filters: { label: string; value: FilterValue }[] = [
	{label: 'Tutti', value: 'Tutti'},
	{label: 'Giocatori', value: 'Giocatore'},
	{label: 'Squadre', value: 'Squadra'},
	{label: 'Staff', value: 'Staff'},
];

const categoryBadgeStyles: Record<ListingCategory, string> = {
	Giocatore: 'bg-[var(--accent-tint)] text-[var(--accent-dark)]',
	Squadra: 'bg-neutral-900 text-white',
	Staff: 'bg-neutral-100 text-neutral-700',
};




const containerStagger: Variants = {
	hidden: {},
	visible: {transition: {staggerChildren: 0.1, delayChildren: 0.25}},
};

const fadeUp: Variants = {
	hidden: {opacity: 0, y: 20},
	visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: [0.22, 1, 0.36, 1]}},
};




interface PinnedHeroCardProps {
	listing: Listing;
	index: number;
	reduceMotion: boolean;
}

function PinnedHeroCard({listing, index, reduceMotion}: PinnedHeroCardProps) {
	const rotate = listing.rotate ?? 0;
	const alignment =
		index === 1 ? 'self-end' : index === 2 ? 'self-start ml-6 sm:ml-10' : 'self-start';

	return (
		<motion.div
			initial={reduceMotion ? false : {opacity: 0, y: 36, rotate: 0, scale: 0.92}}
			animate={{opacity: 1, y: 0, rotate, scale: 1}}
			transition={
				reduceMotion
					? {duration: 0}
					: {type: 'spring', stiffness: 130, damping: 15, delay: 0.15 + index * 0.12}
			}
			whileHover={{rotate: 0, y: -6, scale: 1.03}}
			className={`relative w-[86%] max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] sm:w-[78%] ${alignment}`}
		>
			<Pin
				aria-hidden="true"
				className="absolute -top-3 left-6 h-6 w-6 -rotate-12 text-accent drop-shadow-sm"
				fill="var(--accent-tint)"
				strokeWidth={1.75}
			/>
			<span
				className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${categoryBadgeStyles[listing.category]}`}
			>
        {listing.category}
      </span>
			<h3 className="mt-3 font-(family-name:--font-display) text-lg font-semibold leading-snug text-neutral-900">
				{listing.title}
			</h3>
			<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true"/>
	        {listing.region}
        </span>
				<span>
          {listing.type} · {listing.level}
        </span>
			</div>
		</motion.div>
	);
}

interface ListingCardProps {
	listing: Listing;
	reduceMotion: boolean;
}

function ListingCard({listing, reduceMotion}: ListingCardProps) {
	return (
		<motion.article
			layout={!reduceMotion}
			initial={{opacity: 0, y: 16}}
			animate={{opacity: 1, y: 0}}
			exit={{opacity: 0, scale: 0.96}}
			transition={{duration: reduceMotion ? 0 : 0.3, ease: 'easeOut'}}
			whileHover={reduceMotion ? undefined : {y: -4}}
			className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.16)]"
		>
			<div>
				<div className="flex items-center justify-between">
          <span
	          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${categoryBadgeStyles[listing.category]}`}
          >
            {listing.category}
          </span>
					<span className="inline-flex items-center gap-1 text-xs text-neutral-400">
            <Clock className="h-3.5 w-3.5" aria-hidden="true"/>
						{listing.postedAgo}
          </span>
				</div>
				<h3 className="mt-3 font-(family-name:--font-display) text-base font-semibold leading-snug text-neutral-900">
					{listing.title}
				</h3>
				<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true"/>
	          {listing.region}
          </span>
					<span>
            {listing.type} · {listing.level}
          </span>
				</div>
			</div>
			<Link
				href="/visiblita"
				aria-label={`Vedi annuncio: ${listing.title}`}
				className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-fuchsia-600 transition-colors group-hover:text-(--accent-dark) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
			>
				Vedi annuncio
				<ArrowUpRight
					className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
					aria-hidden="true"/>
			</Link>
		</motion.article>
	);
}

interface FilterPillProps {
	label: string;
	active: boolean;
	onClick: () => void;
}

function FilterPill({label, active, onClick}: FilterPillProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
				active
					? 'border-fuchsia-600 bg-fuchsia-600 text-white'
					: 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
			}`}
		>
			{label}
		</button>
	);
}

function SectionEyebrow({children}: { children: string }) {
	return (
		<span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-(--accent-dark)">
			{children}
	    </span>
	);
}




export default function Homepage() {
	const shouldReduceMotion = useReducedMotion();
	const [activeFilter, setActiveFilter] = useState<FilterValue>('Tutti');

	const filteredListings =
		activeFilter === 'Tutti' ? listings : listings.filter((item) => item.category === activeFilter);

	const accentVars = {
		'--accent': '#d591e3',
		'--accent-dark': '#dc61f2',
		'--accent-tint': '#f2daf2',
	} as CSSProperties;

	return (
		<div
			style={accentVars}
			className={`${display.variable} ${body.variable} ${mono.variable} font-(family-name:--font-body) text-neutral-900 antialiased`}
		>
			<main id="main-content">
				{/* ------------------------------ Hero ------------------------------ */}
				<section className="relative overflow-hidden">
					<Image
						src="/backgrounds/homepage-hero2.jpg"
						alt="Homepage hero background"
						fill
						priority
						className="-z-20 object-cover object-center"
						style={{filter: 'blur(7px)'}}
					/>
					<div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/75" />

					<div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
						<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-12">
							<motion.div
								initial={shouldReduceMotion ? false : 'hidden'}
								animate="visible"
								variants={containerStagger}
							>
								<motion.div variants={fadeUp}>
									<span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-(--accent-tint)">
										La bacheca del calcio dilettantistico italiano
								    </span>
								</motion.div>

								<motion.h1
									variants={fadeUp}
									className="mt-4 font-(family-name:--font-display) text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
								>
									Proponiti.
									<br/>
									Trova opportunità.
									<br/>
									<span className="text-accent">
                                    Fatti conoscere.
                                </span>
								</motion.h1>

								<motion.p variants={fadeUp}
								          className="mt-6 max-w-lg text-base leading-relaxed text-neutral-200 sm:text-lg">
									Bacheca Dilettanti connette giocatori, staff, società, professionisti, strutture ed
									eventi. Pubblica gratuitamente un annuncio, scopri nuove opportunità e valorizza il tuo
									profilo o la tua realtà.
								</motion.p>

								<motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
								<Link
									href="/pubblica-annuncio"
									className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--accent-dark) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
								>
										Pubblica un annuncio
										<ArrowRight className="size-4" aria-hidden="true"/>
									</Link>
									<Link
										href="/visiblita"
										className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
									>
										Sfoglia gli annunci
									</Link>
								</motion.div>

								<motion.dl variants={fadeUp}
								           className="mt-12 grid grid-cols-2 gap-6 border-t border-white/15 pt-8 sm:grid-cols-4">
									{stats.map((stat) => (
										<div key={stat.label}>
											<dt className="sr-only">{stat.label}</dt>
											<dd className="font-mono text-2xl font-semibold text-white">
												{stat.value}
											</dd>
											<dd className="mt-1 text-xs text-neutral-300">{stat.label}</dd>
										</div>
									))}
								</motion.dl>
							</motion.div>

							<div className="relative">
								<div
									aria-hidden="true"
									className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-size-[18px_18px]"
								/>
								<div className="relative flex flex-col gap-6 py-8 pl-2 pr-2 sm:pl-6">
									{heroListings.map((listing, index) => (
										<PinnedHeroCard
											key={listing.id}
											listing={listing}
											index={index}
											reduceMotion={Boolean(shouldReduceMotion)}
										/>
									))}
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* ------------------------------ Annunci (intro) ------------------------------ */}
				<section id="annunci" className="border-t border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
							<motion.div
								initial="hidden"
								whileInView="visible"
								viewport={{once: true, margin: '-80px'}}
								variants={containerStagger}
							>
								<motion.div variants={fadeUp}>
									<SectionEyebrow>
										Il primo hub italiano del calcio dilettantistico
									</SectionEyebrow>
								</motion.div>
								<motion.h2
									variants={fadeUp}
									className="mt-3 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
								>
									Tutto ciò di cui hai bisogno, qui.
								</motion.h2>
								<motion.p variants={fadeUp} className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
									Un'unica piattaforma che riunisce tutti i soggetti del calcio dilettantistico:
									ogni categoria ha esigenze diverse, e Bacheca Dilettanti le mette in comunicazione
									nello stesso ambiente.
								</motion.p>
							</motion.div>
						</div>

						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
						>
							{audienceCategories.map((item) => (
								<motion.div
									key={item.title}
									variants={fadeUp}
									className="group rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.16)]"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--accent-tint) text-(--accent-dark)">
										<DynamicLucideIcon iconName={item.icon} className="h-5 w-5" aria-hidden="true" />
									</div>
									<h3 className="mt-4 font-(family-name:--font-display) text-base font-semibold text-neutral-900">
										{item.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-neutral-600">
										{item.need}
									</p>
									<p className="mt-3 text-xs font-medium text-(--accent-dark)">
										{item.opportunity}
									</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ Come funziona ------------------------------ */}
				<section id="categorie" className="border-t border-neutral-200 bg-neutral-50">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
							<motion.div
								initial="hidden"
								whileInView="visible"
								viewport={{once: true, margin: '-80px'}}
								variants={containerStagger}
								className="max-w-xl"
							>
								<motion.div variants={fadeUp}>
									<SectionEyebrow>
										Sali di livello
									</SectionEyebrow>
								</motion.div>
								<motion.h2
									variants={fadeUp}
									className="mt-3 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
								>
									Fai crescere il tuo percorso o la tua realtà
								</motion.h2>
							</motion.div>

							<Link
								href="/visibilita"
								className="inline-flex items-center gap-2 self-start lg:self-auto rounded-full border border-fuchsia-200 bg-white px-5 py-3 text-lg font-semibold text-fuchsia-700 transition-all hover:-translate-y-0.5 hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:text-fuchsia-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
							>
								Esplora visibilità
								<ArrowRight className="size-6" aria-hidden="true" />
							</Link>
						</div>

						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={fadeUp}
							className="mt-12"
						>
							<Card className="rounded-3xl border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-[0_16px_36px_-24px_rgba(0,0,0,0.2)]">
								<CardContent className="p-6 sm:p-8">
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{userTypes.map((userType, index) => (
											<div
												key={userType.label}
												className={`group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_26px_-18px_rgba(0,0,0,0.18)] ${
													index % 2 === 0
														? 'border-fuchsia-200 bg-linear-to-br from-fuchsia-50 to-white'
														: 'border-neutral-200 bg-linear-to-br from-neutral-50 to-white'
												}`}
											>
												<div className="flex h-full flex-col justify-between gap-4">
													<div className="flex items-start justify-between gap-3">
														<div className="space-y-2">
															<p className="text-xl font-semibold text-neutral-950 transition-colors group-hover:text-fuchsia-800">
																Per {userType.label.toLowerCase()}
															</p>
															<div className="h-1.5 w-10 rounded-full bg-fuchsia-500/20 transition-colors group-hover:bg-fuchsia-500/35" />
														</div>
													</div>
													<p className="text-sm leading-6">
														{userType.description}
													</p>
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ Annunci ------------------------------ */}
				<section id="annunci-lista" className="border-t border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
							<motion.div
								initial="hidden"
								whileInView="visible"
								viewport={{once: true, margin: '-80px'}}
								variants={containerStagger}
							>
								<motion.div variants={fadeUp}>
									<SectionEyebrow>
										Ultimi annunci
									</SectionEyebrow>
								</motion.div>
								<motion.h2
									variants={fadeUp}
									className="mt-3 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
								>
									Nuove opportunità pubblicate
								</motion.h2>
							</motion.div>

							<div role="group" aria-label="Filtra annunci per categoria"
							     className="flex flex-wrap gap-2">
								{filters.map((filter) => (
									<FilterPill
										key={filter.value}
										label={filter.label}
										active={activeFilter === filter.value}
										onClick={() => setActiveFilter(filter.value)}
									/>
								))}
							</div>
						</div>

						<motion.div layout={!shouldReduceMotion}
						            className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
							<AnimatePresence mode="popLayout">
								{filteredListings.map((listing) => (
									<ListingCard key={listing.id} listing={listing}
									             reduceMotion={Boolean(shouldReduceMotion)}/>
								))}
							</AnimatePresence>
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ CTA finale ------------------------------ */}
				<section className="relative overflow-hidden bg-[#131316]">
					<div
						aria-hidden="true"
						className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent)_0%,transparent_60%)] opacity-25 blur-3xl"
					/>
					<div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="mx-auto max-w-xl"
						>
							<motion.div variants={fadeUp}>
                            <span
	                            className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-fuchsia-600">
                                Inizia ora
                            </span>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-4 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-white sm:text-4xl"
							>
								Il tuo prossimo annuncio parte da qui.
							</motion.h2>
							<motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-neutral-400">
								Pubblicare un annuncio è gratuito e richiede meno di due minuti.
							</motion.p>
							<motion.div variants={fadeUp} className="mt-8">
								<Link
									href="/pubblica-annuncio"
									className="inline-flex items-center gap-2 rounded-full bg-fuchsia-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--accent-dark) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
								>
									Pubblica un annuncio
									<ArrowRight className="h-4 w-4" aria-hidden="true"/>
								</Link>
							</motion.div>
						</motion.div>
					</div>
				</section>
			</main>
		</div>
	);
}
