'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Bricolage_Grotesque, Manrope, IBM_Plex_Mono } from 'next/font/google';
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import type { LucideIcon } from 'lucide-react';
import {
	ArrowRight,
	ArrowUpRight,
	MapPin,
	Clock,
	User,
	Shield,
	ClipboardList,
	Pin,
} from 'lucide-react';

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

/* ------------------------------------------------------------------ */
/* Tipi                                                                */
/* ------------------------------------------------------------------ */

type ListingCategory = 'Giocatore' | 'Squadra' | 'Staff';
type FilterValue = 'Tutti' | ListingCategory;

interface Listing {
	id: string;
	category: ListingCategory;
	sport: string;
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

interface Step {
	number: string;
	title: string;
	description: string;
}

interface ProfileType {
	icon: LucideIcon;
	title: string;
	description: string;
}

/* ------------------------------------------------------------------ */
/* Dati (di esempio — collegare alle API reali)                       */
/* ------------------------------------------------------------------ */

const heroListings: Listing[] = [
	{
		id: 'h1',
		category: 'Giocatore',
		sport: 'Calcio',
		title: 'Terzino sinistro, classe 2001, valuta proposte',
		region: 'Lombardia',
		level: 'Promozione',
		postedAgo: '2 giorni fa',
		rotate: -4,
	},
	{
		id: 'h2',
		category: 'Squadra',
		sport: 'Volley',
		title: 'Cerchiamo schiacciatore per la prossima stagione',
		region: 'Emilia-Romagna',
		level: 'Serie C',
		postedAgo: '5 ore fa',
		rotate: 3,
	},
	{
		id: 'h3',
		category: 'Staff',
		sport: 'Calcio',
		title: 'Preparatore atletico disponibile da subito',
		region: 'Puglia',
		level: 'Eccellenza',
		postedAgo: '1 giorno fa',
		rotate: -2,
	},
];

const listings: Listing[] = [
	{
		id: 'l1',
		category: 'Giocatore',
		sport: 'Calcio',
		title: 'Centrocampista centrale, classe 1999, valuta proposte',
		region: 'Lombardia',
		level: 'Promozione',
		postedAgo: '2 giorni fa',
	},
	{
		id: 'l2',
		category: 'Squadra',
		sport: 'Calcio',
		title: 'Cerca portiere per la prossima stagione',
		region: 'Veneto',
		level: 'Eccellenza',
		postedAgo: '5 ore fa',
	},
	{
		id: 'l3',
		category: 'Staff',
		sport: 'Volley',
		title: 'Preparatore atletico disponibile da subito',
		region: 'Emilia-Romagna',
		level: 'Serie C',
		postedAgo: '1 giorno fa',
	},
	{
		id: 'l4',
		category: 'Giocatore',
		sport: 'Basket',
		title: 'Playmaker con esperienza in Serie D',
		region: 'Toscana',
		level: 'Serie D',
		postedAgo: '3 giorni fa',
	},
	{
		id: 'l5',
		category: 'Squadra',
		sport: 'Rugby',
		title: 'Cerchiamo terza linea under 20',
		region: 'Lazio',
		level: 'Serie C',
		postedAgo: '6 ore fa',
	},
	{
		id: 'l6',
		category: 'Staff',
		sport: 'Calcio',
		title: 'Allenatore UEFA B cerca nuova squadra',
		region: 'Puglia',
		level: 'Promozione',
		postedAgo: '4 giorni fa',
	},
];

const stats: Stat[] = [
	{ value: '1.240+', label: 'Annunci pubblicati' },
	{ value: '310+', label: 'Società iscritte' },
	{ value: '20', label: 'Regioni coperte' },
	{ value: '48h', label: 'Tempo medio di risposta' },
];

const steps: Step[] = [
	{
		number: '01',
		title: 'Crea il tuo profilo',
		description: 'Registrati come Giocatore, Squadra o Staff tecnico: bastano due minuti.',
	},
	{
		number: '02',
		title: 'Pubblica o cerca un annuncio',
		description:
			'Metti online la tua richiesta oppure filtra gli annunci attivi per ruolo, categoria e regione.',
	},
	{
		number: '03',
		title: 'Entra in contatto',
		description:
			'Scrivi direttamente a chi ha pubblicato l’annuncio e organizza il provino o il colloquio.',
	},
];

const profileTypes: ProfileType[] = [
	{
		icon: User,
		title: 'Giocatori',
		description: 'Trova la squadra giusta per la prossima stagione. Filtra per ruolo, categoria e regione.',
	},
	{
		icon: Shield,
		title: 'Squadre',
		description: 'Costruisci la rosa che ti serve pubblicando annunci mirati per ruolo e livello.',
	},
	{
		icon: ClipboardList,
		title: 'Staff tecnico',
		description: 'Allenatori, preparatori e dirigenti: proponi la tua candidatura alle società.',
	},
];

const filters: { label: string; value: FilterValue }[] = [
	{ label: 'Tutti', value: 'Tutti' },
	{ label: 'Giocatori', value: 'Giocatore' },
	{ label: 'Squadre', value: 'Squadra' },
	{ label: 'Staff', value: 'Staff' },
];

const categoryBadgeStyles: Record<ListingCategory, string> = {
	Giocatore: 'bg-[var(--accent-tint)] text-[var(--accent-dark)]',
	Squadra: 'bg-neutral-900 text-white',
	Staff: 'bg-neutral-100 text-neutral-700',
};

/* ------------------------------------------------------------------ */
/* Varianti di animazione                                             */
/* ------------------------------------------------------------------ */

const containerStagger: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/* ------------------------------------------------------------------ */
/* Sotto-componenti                                                    */
/* ------------------------------------------------------------------ */

function SectionEyebrow({ children }: { children: string }) {
	return (
		<span className="font-[family-name:var(--font-mono)] text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-dark)]">
      {children}
    </span>
	);
}

interface PinnedHeroCardProps {
	listing: Listing;
	index: number;
	reduceMotion: boolean;
}

function PinnedHeroCard({ listing, index, reduceMotion }: PinnedHeroCardProps) {
	const rotate = listing.rotate ?? 0;
	const alignment =
		index === 1 ? 'self-end' : index === 2 ? 'self-start ml-6 sm:ml-10' : 'self-start';

	return (
		<motion.div
			initial={reduceMotion ? false : { opacity: 0, y: 36, rotate: 0, scale: 0.92 }}
			animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
			transition={
				reduceMotion
					? { duration: 0 }
					: { type: 'spring', stiffness: 130, damping: 15, delay: 0.15 + index * 0.12 }
			}
			whileHover={{ rotate: 0, y: -6, scale: 1.03 }}
			className={`relative w-[86%] max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] sm:w-[78%] ${alignment}`}
		>
			<Pin
				aria-hidden="true"
				className="absolute -top-3 left-6 h-6 w-6 -rotate-12 text-[var(--accent)] drop-shadow-sm"
				fill="var(--accent-tint)"
				strokeWidth={1.75}
			/>
			<span
				className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${categoryBadgeStyles[listing.category]}`}
			>
        {listing.category}
      </span>
			<h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-neutral-900">
				{listing.title}
			</h3>
			<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
	        {listing.region}
        </span>
				<span>
          {listing.sport} · {listing.level}
        </span>
			</div>
		</motion.div>
	);
}

interface ListingCardProps {
	listing: Listing;
	reduceMotion: boolean;
}

function ListingCard({ listing, reduceMotion }: ListingCardProps) {
	return (
		<motion.article
			layout={!reduceMotion}
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.96 }}
			transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
			whileHover={reduceMotion ? undefined : { y: -4 }}
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
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
						{listing.postedAgo}
          </span>
				</div>
				<h3 className="mt-3 font-[family-name:var(--font-display)] text-base font-semibold leading-snug text-neutral-900">
					{listing.title}
				</h3>
				<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
	          {listing.region}
          </span>
					<span>
            {listing.sport} · {listing.level}
          </span>
				</div>
			</div>
			<a
				href="#"
				aria-label={`Vedi annuncio: ${listing.title}`}
				className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] transition-colors group-hover:text-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
			>
				Vedi annuncio
				<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
			</a>
		</motion.article>
	);
}

interface FilterPillProps {
	label: string;
	active: boolean;
	onClick: () => void;
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
				active
					? 'border-[var(--accent)] bg-[var(--accent)] text-white'
					: 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
			}`}
		>
			{label}
		</button>
	);
}

/* ------------------------------------------------------------------ */
/* Componente principale                                              */
/* ------------------------------------------------------------------ */

export default function Homepage() {
	const shouldReduceMotion = useReducedMotion();
	const [activeFilter, setActiveFilter] = useState<FilterValue>('Tutti');

	const filteredListings =
		activeFilter === 'Tutti' ? listings : listings.filter((item) => item.category === activeFilter);

	const accentVars = {
		'--accent': '#D6127F',
		'--accent-dark': '#A80E64',
		'--accent-tint': '#FCE7F3',
	} as CSSProperties;

	return (
		<div
			style={accentVars}
			className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-neutral-50 font-[family-name:var(--font-body)] text-neutral-900 antialiased`}
		>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
			>
				Vai al contenuto principale
			</a>

			{/* ------------------------------ Header ------------------------------ */}
			<header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
					<a href="#" className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
						Bacheca <span className="text-[var(--accent)]">Dilettanti</span>
					</a>

					<nav aria-label="Principale" className="hidden items-center gap-8 md:flex">
						<a href="#come-funziona" className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
							Come funziona
						</a>
						<a href="#categorie" className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
							Categorie
						</a>
						<a href="#annunci" className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
							Annunci
						</a>
					</nav>

					<div className="flex items-center gap-3">
						<a
							href="#"
							className="hidden text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 sm:inline-flex"
						>
							Accedi
						</a>
						<a
							href="/pubblica-annuncio"
							className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
						>
							Pubblica annuncio
						</a>
					</div>
				</div>
			</header>

			<main id="main-content">
				{/* ------------------------------ Hero ------------------------------ */}
				<section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
					<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
						<motion.div
							initial={shouldReduceMotion ? false : 'hidden'}
							animate="visible"
							variants={containerStagger}
						>
							<motion.div variants={fadeUp}>
								<SectionEyebrow>La bacheca dello sport dilettantistico italiano</SectionEyebrow>
							</motion.div>

							<motion.h1
								variants={fadeUp}
								className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl"
							>
								Cercasi giocatori.
								<br />
								Offresi maglie.
								<br />
								<span className="text-[var(--accent)]">Trovasi qui.</span>
							</motion.h1>

							<motion.p variants={fadeUp} className="mt-6 max-w-lg text-base leading-relaxed text-neutral-600 sm:text-lg">
								Bacheca Dilettanti mette in contatto giocatori, squadre e staff tecnico dello sport
								dilettantistico italiano. Pubblica il tuo annuncio o trova la prossima opportunità,
								gratis e in pochi minuti.
							</motion.p>

							<motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
								<a
									href="#"
									className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
								>
									Pubblica un annuncio
									<ArrowRight className="h-4 w-4" aria-hidden="true" />
								</a>
								<a
									href="#annunci"
									className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
								>
									Sfoglia gli annunci
								</a>
							</motion.div>

							<motion.dl variants={fadeUp} className="mt-12 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-8 sm:grid-cols-4">
								{stats.map((stat) => (
									<div key={stat.label}>
										<dt className="sr-only">{stat.label}</dt>
										<dd className="font-[family-name:var(--font-mono)] text-2xl font-semibold text-neutral-900">
											{stat.value}
										</dd>
										<dd className="mt-1 text-xs text-neutral-500">{stat.label}</dd>
									</div>
								))}
							</motion.dl>
						</motion.div>

						{/* Cluster di annunci "appuntati" — il segno distintivo della bacheca */}
						<div className="relative">
							<div
								aria-hidden="true"
								className="absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle,_rgba(0,0,0,0.08)_1px,_transparent_1px)] [background-size:18px_18px]"
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
				</section>

				{/* ------------------------------ Come funziona ------------------------------ */}
				<section id="come-funziona" className="border-t border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, margin: '-80px' }}
							variants={containerStagger}
							className="max-w-xl"
						>
							<motion.div variants={fadeUp}>
								<SectionEyebrow>Come funziona</SectionEyebrow>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
							>
								Dal profilo al provino, in tre passaggi.
							</motion.h2>
						</motion.div>

						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, margin: '-80px' }}
							variants={containerStagger}
							className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3"
						>
							{steps.map((step) => (
								<motion.div key={step.number} variants={fadeUp}>
                  <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--accent)]">
                    {step.number}
                  </span>
									<h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-neutral-900">
										{step.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.description}</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ Categorie ------------------------------ */}
				<section id="categorie" className="border-t border-neutral-200">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, margin: '-80px' }}
							variants={containerStagger}
							className="max-w-xl"
						>
							<motion.div variants={fadeUp}>
								<SectionEyebrow>Per ogni ruolo</SectionEyebrow>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
							>
								Tre profili, un solo punto d’incontro.
							</motion.h2>
						</motion.div>

						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, margin: '-80px' }}
							variants={containerStagger}
							className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3"
						>
							{profileTypes.map((profile) => (
								<motion.div
									key={profile.title}
									variants={fadeUp}
									className="rounded-2xl border border-neutral-200 bg-white p-6"
								>
									<div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-tint)]">
										<profile.icon className="h-5 w-5 text-[var(--accent-dark)]" aria-hidden="true" />
									</div>
									<h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold text-neutral-900">
										{profile.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-neutral-600">{profile.description}</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ Annunci ------------------------------ */}
				<section id="annunci" className="border-t border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
							<motion.div
								initial="hidden"
								whileInView="visible"
								viewport={{ once: true, margin: '-80px' }}
								variants={containerStagger}
							>
								<motion.div variants={fadeUp}>
									<SectionEyebrow>Ultimi annunci</SectionEyebrow>
								</motion.div>
								<motion.h2
									variants={fadeUp}
									className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
								>
									Cosa si muove in bacheca.
								</motion.h2>
							</motion.div>

							<div role="group" aria-label="Filtra annunci per categoria" className="flex flex-wrap gap-2">
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

						<motion.div layout={!shouldReduceMotion} className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
							<AnimatePresence mode="popLayout">
								{filteredListings.map((listing) => (
									<ListingCard key={listing.id} listing={listing} reduceMotion={Boolean(shouldReduceMotion)} />
								))}
							</AnimatePresence>
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ CTA finale ------------------------------ */}
				<section className="relative overflow-hidden bg-[#131316]">
					<div
						aria-hidden="true"
						className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_transparent_60%)] opacity-25 blur-3xl"
					/>
					<div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true, margin: '-80px' }}
							variants={containerStagger}
							className="mx-auto max-w-xl"
						>
							<motion.div variants={fadeUp}>
                <span className="font-[family-name:var(--font-mono)] text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                  Inizia ora
                </span>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white sm:text-4xl"
							>
								Il tuo prossimo annuncio parte da qui.
							</motion.h2>
							<motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-neutral-400">
								Pubblicare un annuncio è gratuito e richiede meno di due minuti.
							</motion.p>
							<motion.div variants={fadeUp} className="mt-8">
								<a
									href="#"
									className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
								>
									Pubblica un annuncio
									<ArrowRight className="h-4 w-4" aria-hidden="true" />
								</a>
							</motion.div>
						</motion.div>
					</div>
				</section>
			</main>

			{/* ------------------------------ Footer ------------------------------ */}
			<footer className="border-t border-neutral-200 bg-neutral-50">
				<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
						<div className="col-span-2 sm:col-span-1">
							<a href="#" className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
								Bacheca <span className="text-[var(--accent)]">Dilettanti</span>
							</a>
							<p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
								La bacheca dello sport dilettantistico italiano.
							</p>
							<div className="mt-5 flex items-center gap-3">
								<a
									href="#"
									aria-label="Instagram"
									className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
								>
									IG
								</a>
								<a
									href="#"
									aria-label="Facebook"
									className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
								>
									Facebook
								</a>
							</div>
						</div>

						<div>
							<h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-wide text-neutral-400">
								Piattaforma
							</h3>
							<ul className="mt-4 space-y-3 text-sm text-neutral-600">
								<li><a href="#come-funziona" className="hover:text-neutral-900">Come funziona</a></li>
								<li><a href="#categorie" className="hover:text-neutral-900">Categorie</a></li>
								<li><a href="#annunci" className="hover:text-neutral-900">Annunci</a></li>
							</ul>
						</div>

						<div>
							<h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-wide text-neutral-400">
								Per chi cerca
							</h3>
							<ul className="mt-4 space-y-3 text-sm text-neutral-600">
								<li><a href="#categorie" className="hover:text-neutral-900">Giocatori</a></li>
								<li><a href="#categorie" className="hover:text-neutral-900">Squadre</a></li>
								<li><a href="#categorie" className="hover:text-neutral-900">Staff tecnico</a></li>
							</ul>
						</div>

						<div>
							<h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold uppercase tracking-wide text-neutral-400">
								Legale
							</h3>
							<ul className="mt-4 space-y-3 text-sm text-neutral-600">
								<li><a href="#" className="hover:text-neutral-900">Termini di servizio</a></li>
								<li><a href="#" className="hover:text-neutral-900">Privacy</a></li>
								<li><a href="#" className="hover:text-neutral-900">Cookie</a></li>
							</ul>
						</div>
					</div>

					<div className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
						© 2026 Bacheca Dilettanti. Tutti i diritti riservati.
					</div>
				</div>
			</footer>
		</div>
	);
}