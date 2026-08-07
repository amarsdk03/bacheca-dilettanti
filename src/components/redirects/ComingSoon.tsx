'use client';

import type {CSSProperties} from 'react';

import type {Variants} from "motion/react";
import {motion, useReducedMotion} from "motion/react";
import {Bricolage_Grotesque, IBM_Plex_Mono, Manrope} from 'next/font/google';
import {
	ArrowRight,
	Sparkles,
} from 'lucide-react';
import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import Image from "next/image";
import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";



/**
 * Font setup — per un'app reale conviene spostare questi loader in app/layout.tsx
 * e riusare le stesse CSS variable ovunque. Qui restano nel componente per renderlo
 * autonomo e facile da incollare in un progetto esistente (stesso approccio di Homepage.tsx).
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




interface Step {
	label: string;
	title: string;
	description: string;
	icon: string;
}

interface AudienceCategory {
	icon: string;
	title: string;
	description: string;
}

type FeatureStatus = 'In sviluppo' | 'Pianificato';

interface RoadmapFeature {
	icon: string;
	title: string;
	description: string;
	status: FeatureStatus;
}




const steps: Step[] = [
	{
		label: 'Passo 1',
		icon: 'PenLine',
		title: 'Crea il tuo annuncio',
		description: 'Scegli la categoria giusta per te e compila un annuncio guidato in pochi passaggi, senza campi inutili.',
	},
	{
		label: 'Passo 2',
		icon: 'SlidersHorizontal',
		title: 'Scegli la visibilità',
		description: 'Pubblica gratuitamente oppure aumenta la copertura del tuo annuncio con i profili Plus e Pro.',
	},
	{
		label: 'Passo 3',
		icon: 'MessageCircle',
		title: 'Ricevi risposte',
		description: 'Le persone e le società giuste ti troveranno e potranno contattarti direttamente dalla bacheca.',
	},
];

const audienceCategories: AudienceCategory[] = [
	{
		icon: 'User',
		title: 'Giocatori',
		description: 'Proponiti alle società con un profilo completo di esperienze, ruolo e disponibilità.',
	},
	{
		icon: 'Award',
		title: 'Squadre',
		description: 'Pubblica ricerche mirate per rinforzare la rosa, per ogni formato: 11, 7 e 5.',
	},
	{
		icon: 'ClipboardList',
		title: 'Arbitri',
		description: 'Rendi visibile la tua disponibilità a dirigere gare in tutte le categorie dilettantistiche.',
	},
	{
		icon: 'Briefcase',
		title: 'Staff',
		description: 'Allenatori, preparatori e professionisti possono presentare qualifiche ed esperienza.',
	},
	{
		icon: 'DoorOpen',
		title: 'Società ed enti sportivi',
		description: 'Le realtà sportive trovano risorse e si presentano al pubblico giusto.',
	},
	{
		icon: 'TrafficCone',
		title: 'Campi e impianti sportivi',
		description: 'Pubblicizzate la vostra struttura sportiva a chiunque possa beneficiarne',
	},
];

const roadmapFeatures: RoadmapFeature[] = [
	{
		icon: 'LayoutGrid',
		title: 'Bacheca annunci filtrabile',
		description: 'Cerca e filtra annunci per categoria, regione, formato di gioco e livello.',
		status: 'In sviluppo',
	},
	{
		icon: 'FileEdit',
		title: 'Pubblicazione guidata multi-step',
		description: 'Un flusso dedicato per ogni categoria: dai giocatori alle squadre, staff ed enti sportivi.',
		status: 'In sviluppo',
	},
	{
		icon: 'Tag',
		title: 'Pagina Prezzi e Visibilità',
		description: 'Piani pensati su misura per ogni categoria, dal profilo gratuito a quello in evidenza.',
		status: 'In sviluppo',
	},
	{
		icon: 'Newspaper',
		title: 'Blog e approfondimenti',
		description: 'Guide, consigli e articoli dedicati a chi vive il calcio dilettantistico ogni giorno.',
		status: 'In sviluppo',
	},
	{
		icon: 'IdCard',
		title: 'Profili dedicati per categoria',
		description: 'Ogni profilo mostra i dati che contano davvero, senza campi generici.',
		status: 'Pianificato',
	},
	{
		icon: 'BellRing',
		title: 'Notifiche e contatti rapidi',
		description: 'Ricevi un avviso non appena qualcuno risponde al tuo annuncio o al tuo profilo.',
		status: 'Pianificato',
	},
];




const containerStagger: Variants = {
	hidden: {},
	visible: {transition: {staggerChildren: 0.1, delayChildren: 0.25}},
};

const fadeUp: Variants = {
	hidden: {opacity: 0, y: 20},
	visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: [0.22, 1, 0.36, 1]}},
};




function SectionEyebrow({children}: { children: string }) {
	return (
		<span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-(--accent-dark)">
			{children}
	    </span>
	);
}

const statusStyles: Record<FeatureStatus, string> = {
	'In sviluppo': 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
	'Pianificato': 'bg-neutral-100 text-neutral-500 border border-neutral-200',
};




export default function ComingSoon() {
	const shouldReduceMotion = useReducedMotion();

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
				<section className="relative overflow-hidden bg-[#131316]">
					<div
						aria-hidden="true"
						className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent)_0%,transparent_60%)] opacity-25 blur-3xl"
					/>
					<div className="relative mx-auto flex max-w-4xl flex-col items-center justify-center px-4 pb-24 text-center sm:px-6 lg:px-8">
						<motion.div
							initial={shouldReduceMotion ? false : 'hidden'}
							animate="visible"
							variants={containerStagger}
							className="flex flex-col items-center"
						>
							<motion.div variants={fadeUp}>
								<Image
									src={DEFAULT_LOGO_TRANSPARENT_PATH}
									alt={"Logo torneo"}
									width={300}
									height={300}
									draggable={false}
									loading={"eager"}
									style={{filter: 'invert(1)'}}
								/>
							</motion.div>

							<motion.h1
								variants={fadeUp}
								className="font-(family-name:--font-display) text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
							>
								Il calcio dilettantistico italiano
								<br />
								avrà finalmente la sua bacheca.
							</motion.h1>

							<motion.p
								variants={fadeUp}
								className="mt-6 max-w-xl text-base leading-relaxed text-neutral-300 sm:text-lg"
							>
								Stiamo costruendo il punto di incontro tra giocatori, arbitri, staff tecnico e società.
							</motion.p>
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ Come funzionerà ------------------------------ */}
				<section className="border-t border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="max-w-xl"
						>
							<motion.div variants={fadeUp}>
								<SectionEyebrow>Come funzionerà</SectionEyebrow>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-3 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
							>
								Dalla prima visita al primo contatto.
							</motion.h2>
							<motion.p variants={fadeUp} className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
								Un percorso pensato per essere semplice fin dal primo giorno, qualunque sia il tuo ruolo
								nel mondo del calcio dilettantistico.
							</motion.p>
						</motion.div>

						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3"
						>
							{steps.map((step) => (
								<motion.div
									key={step.title}
									variants={fadeUp}
									className="rounded-2xl border border-neutral-200 bg-white p-6"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--accent-tint) text-(--accent-dark)">
										<DynamicLucideIcon iconName={step.icon} className="h-5 w-5" aria-hidden="true" />
									</div>
									<span className="mt-4 block font-mono text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
										{step.label}
									</span>
									<h3 className="mt-2 font-(family-name:--font-display) text-lg font-semibold text-neutral-900">
										{step.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-neutral-600">
										{step.description}
									</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ Per chi è pensata ------------------------------ */}
				<section className="border-t border-neutral-200 bg-neutral-50">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="max-w-xl"
						>
							<motion.div variants={fadeUp}>
								<SectionEyebrow>Per chi è pensata</SectionEyebrow>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-3 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
							>
								Un unico spazio, 6 mondi da rappresentare.
							</motion.h2>
							<motion.p variants={fadeUp} className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
								Ogni categoria avrà un percorso di pubblicazione pensato apposta per lei, con i campi e
								le informazioni che contano davvero.
							</motion.p>
						</motion.div>

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
										{item.description}
									</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ Cosa stiamo costruendo ------------------------------ */}
				<section className="border-t border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="max-w-xl"
						>
							<motion.div variants={fadeUp}>
								<SectionEyebrow>Cosa stiamo costruendo</SectionEyebrow>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-3 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
							>
								Le funzionalità in arrivo.
							</motion.h2>
							<motion.p variants={fadeUp} className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
								Stiamo lavorando un pezzo alla volta, con un obiettivo chiaro: farti trovare le persone
								o le opportunità giuste il prima possibile.
							</motion.p>
						</motion.div>

						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
						>
							{roadmapFeatures.map((feature) => (
								<motion.div
									key={feature.title}
									variants={fadeUp}
									className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.16)]"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--accent-tint) text-(--accent-dark)">
											<DynamicLucideIcon iconName={feature.icon} className="h-5 w-5" aria-hidden="true" />
										</div>
										<span
											className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[feature.status]}`}
										>
											{feature.status}
										</span>
									</div>
									<h3 className="mt-4 font-(family-name:--font-display) text-base font-semibold text-neutral-900">
										{feature.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-neutral-600">
										{feature.description}
									</p>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* ------------------------------ CTA finale ------------------------------ */}
				<section className="relative overflow-hidden bg-[#131316]">
					<div
						aria-hidden="true"
						className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent)_0%,transparent_60%)] opacity-25 blur-3xl"
					/>
					<div className="relative mx-auto max-w-6xl px-4 pt-20 pb-32 text-center sm:px-6 lg:px-8">
						<motion.div
							initial="hidden"
							whileInView="visible"
							viewport={{once: true, margin: '-80px'}}
							variants={containerStagger}
							className="mx-auto max-w-xl"
						>
							<motion.div
								variants={fadeUp}
								className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5"
							>
								<Sparkles className="h-3.5 w-3.5 text-(--accent)" aria-hidden="true" />
								<span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white">
									Prossimamente
								</span>
							</motion.div>
							<motion.h2
								variants={fadeUp}
								className="mt-4 font-(family-name:--font-display) text-3xl font-bold tracking-tight text-white sm:text-4xl"
							>
								Vuoi essere tra i primi a provarla?
							</motion.h2>
							<motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-neutral-400">
								Visita la nostra pagina Instagram per rimanere aggiornato sul rilascio!
							</motion.p>
							<motion.div variants={fadeUp} className="mt-8">
								<a
									href="https://www.instagram.com/bachecadilettanti/"
									target="_blank"
									className="inline-flex items-center gap-2 rounded-full bg-fuchsia-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--accent-dark) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#131316]"
								>
									Visita la pagina Instagram
									<ArrowRight className="h-4 w-4" aria-hidden="true" />
								</a>
							</motion.div>
						</motion.div>
					</div>
				</section>
			</main>
		</div>
	);
}