'use client';

import {useState} from 'react';
import Link from "next/link";
import type {ReactNode} from "react";
import {
	ArrowRight,
	BadgeCheck,
	BadgeEuro,
	Building2,
	Check,
	GraduationCap,
	Handshake,
	MapPin,
	Megaphone,
	Repeat2,
	Shield,
	Sparkles,
	User,
	ClipboardList
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipi                                                                 */
/* ------------------------------------------------------------------ */

type ProfileCategoryId =
	| 'giocatore'
	| 'staff'
	| 'club'
	| 'professionisti'
	| 'agenzie'
	| 'campi';

interface PlanTier {
	name: string;
	subtitle: string;
	priceMonthly: string;
	priceYearly?: string;
	isFree?: boolean;
	features: string[];
	note?: string;
}

interface ProfileCategory {
	id: ProfileCategoryId;
	label: string;
	icon: typeof User;
	intro: string;
	plans: PlanTier[];
}

type PriceRow = {
	name: string;
	duration: string;
	price: string;
	details: string;
};

type PackageRow = {
	name: string;
	price: string;
	includes: string;
};

type PlacementRow = {
	name: string;
	price: string;
	value: string;
};

type TournamentRow = {
	name: string;
	price: string;
	details: string;
};

/* ------------------------------------------------------------------ */
/* Dati — Sezioni 06 e 07 del master document (profili e abbonamenti)  */
/* ------------------------------------------------------------------ */

const profileCategories: ProfileCategory[] = [
	{
		id: 'giocatore',
		label: 'Giocatore',
		icon: User,
		intro:
			'Il prezzo dei profili giocatore rimane volutamente contenuto: il pubblico dilettantistico è sensibile al prezzo, il valore deve restare accessibile e continuativo.',
		plans: [
			{
				name: 'Gratuito',
				subtitle: 'Da decidere',
				priceMonthly: '0 EUR',
				isFree: true,
				features: [
					'Dati essenziali, ruolo e anno di nascita',
					'Zona di appartenenza',
					'Breve presentazione',
					'Un contatto',
				],
			},
			{
				name: 'Plus',
				subtitle: 'Da decidere',
				priceMonthly: '4,90 EUR / mese',
				priceYearly: '49 EUR / anno',
				features: [
					'Profilo completo con esperienze',
					'Caratteristiche tecniche',
					'Fino a 5 video',
					'Social e curriculum sportivo',
				],
			},
			{
				name: 'Pro',
				subtitle: 'Da decidere',
				priceMonthly: '9,90 EUR / mese',
				priceYearly: '99 EUR / anno',
				features: [
					'Tutto il piano Plus',
					'Fino a 15 video',
					'Evidenza nei risultati',
					'Descrizione estesa',
					'Aggiornamento disponibilità e statistiche essenziali',
				],
			},
		],
	},
	{
		id: 'staff',
		label: 'Staff',
		icon: ClipboardList,
		intro:
			'Professionisti dello staff tecnico: qualifiche, CV, analisi e lavori professionali in un profilo pensato per essere trovato dai club.',
		plans: [
			{
				name: 'Base',
				subtitle: 'Da decidere',
				priceMonthly: '4,90 EUR / mese',
				priceYearly: '49 EUR / anno',
				features: [
					'Profilo professionale con foto e presentazione',
					'Qualifiche ed esperienze',
					'Contatti e social',
					'CV o documento allegato',
				],
			},
			{
				name: 'Pro',
				subtitle: 'Da decidere',
				priceMonthly: '9,90 EUR / mese',
				priceYearly: '99 EUR / anno',
				features: [
					'Tutto il piano Base',
					'Presenza nella sezione dedicata',
					'Bacheca personale e piccolo portfolio',
					'Pubblicazione di analisi, video o lavori professionali',
					'Massimo 2 nuovi contenuti al mese nel feed',
				],
				note: 'Livelli ulteriori possibili in base al numero di contenuti caricabili.',
			},
		],
	},
	{
		id: 'club',
		label: 'Club dilettantistici',
		icon: Shield,
		intro:
			'Pubblicare annunci, presentare la società e trovare risorse: un profilo-vetrina essenziale con possibilità di crescere verso il programma Club Pilota.',
		plans: [
			{
				name: 'Base',
				subtitle: 'Da decidere',
				priceMonthly: '4,90 EUR / mese',
				priceYearly: '49,90 EUR / anno',
				features: [
					'Pagina dedicata con logo, descrizione e contatti',
					'Link al sito e ai profili social',
					'Annunci e contenuti del club nella stessa pagina',
					'Profilo verificato',
				],
			},
			{
				name: 'Advanced',
				subtitle: 'Da decidere',
				priceMonthly: '14,90 EUR / mese',
				priceYearly: '149,90 EUR / anno',
				features: [
					'Tutto il piano Base',
					'Spazio nella sezione Club Pilota della regione',
					'Pubblicazione di aggiornamenti nel feed',
					'Accesso anticipato a nuove funzioni',
					'Un annuncio prioritario di 7 giorni al mese, non cumulabile',
					'Possibile sconto su prodotti e servizi Club Pilota',
				],
				note: 'Criteri di accesso al programma Club Pilota da definire.',
			},
		],
	},
	{
		id: 'professionisti',
		label: 'Professionisti e studi',
		icon: GraduationCap,
		intro:
			'Nutrizionisti, psicologi, studi, consulenti e servizi per il settore: uno spazio per proporsi a club, atleti e famiglie. Per gli enti di formazione è prevista una proposta personalizzata; in assenza di accordi si applicano prezzi e servizi del profilo professionale.',
		plans: [
			{
				name: 'Base',
				subtitle: 'Da decidere',
				priceMonthly: '34,90 EUR / mese',
				priceYearly: '349,90 EUR / anno',
				features: [
					'Pagina dedicata con logo, descrizione e contatti',
					'Link al sito e ai social',
					'Listino prezzi e promozioni',
					'Annunci e contenuti raccolti nella pagina',
					'Profilo verificato',
					'Possibilità di proporre servizi ai club via e-mail o articoli dedicati',
				],
			},
		],
	},
	{
		id: 'agenzie',
		label: 'Agenzie e agenti',
		icon: Handshake,
		intro:
			'Agenzie di scouting e agenti di giocatori: presentare attività, opportunità e contenuti con un numero di pubblicazioni incluso.',
		plans: [
			{
				name: 'Base',
				subtitle: 'Da decidere',
				priceMonthly: '34,90 EUR / mese',
				priceYearly: '349,90 EUR / anno',
				features: [
					'Pagina dedicata con logo o foto, descrizione e contatti',
					'Link al sito e ai social',
					'Listino prezzi e promozioni, quando applicabile',
					'Annunci e contenuti raccolti nella pagina',
					'Profilo verificato e spazio dedicato',
					'Fino a 5 pubblicazioni al mese',
				],
				note: 'Il prezzo aumenta in base al numero di pubblicazioni incluse. Livelli superiori da definire.',
			},
		],
	},
	{
		id: 'campi',
		label: 'Gestori di campi',
		icon: MapPin,
		intro:
			'Essere trovati e facilitare le prenotazioni per chi gestisce campi da calcio dilettantistico.',
		plans: [
			{
				name: 'Base',
				subtitle: 'Da decidere',
				priceMonthly: '4,90 EUR / mese',
				priceYearly: '49 EUR / anno',
				features: [
					'Presenza nella sezione "Campi in affitto nella tua zona"',
					'Servizi e prezzi del campo',
					'Link di prenotazione',
					'Filtri nella ricerca per tipologia e territorio',
					'Possibile pagina con disponibilità orarie e prenotazioni dirette',
				],
				note: 'Da decidere se il booking sarà nativo nella piattaforma o collegato a strumenti esterni.',
			},
		],
	},
];

/* ------------------------------------------------------------------ */
/* Dati — Sezioni 08, 09 e 10 (annunci prioritari, social, tornei, ads) */
/* ------------------------------------------------------------------ */

const priorityRows: PriceRow[] = [
	{name: 'Annuncio prioritario', duration: '7 giorni', price: '7,90 EUR', details: "L'annuncio entra in rotazione con priorità rispetto alla lista standard."},
	{name: 'Pacchetto 2 annunci', duration: '7 giorni', price: '15,80 EUR', details: 'Due annunci prioritari attivati insieme per lo stesso periodo.'},
	{name: 'Pacchetto 3 annunci', duration: '7 giorni', price: '19,90 EUR', details: 'Tre annunci prioritari con esposizione coordinata a rotazione.'},
	{name: 'Annuncio prioritario', duration: '30 giorni', price: '29,90 EUR', details: 'Soluzione singola per un mese di maggiore esposizione.'},
	{name: 'Pacchetto 2 annunci', duration: '30 giorni', price: '49,90 EUR', details: 'Due annunci prioritari attivi per 30 giorni.'},
	{name: 'Pacchetto 4 annunci', duration: '30 giorni', price: '89,90 EUR', details: 'Quattro annunci prioritari per una presenza più estesa.'},
];

const socialRows: PackageRow[] = [
	{name: 'Story Boost', price: '15 EUR', includes: '1 storia Instagram, revisione testo, ripubblicazione quotidiana per 5 giorni su WhatsApp.'},
	{name: 'Post Boost', price: '30 EUR', includes: '1 post o carosello, grafica, revisione testo, ripubblicazione quotidiana per 5 giorni su WhatsApp.'},
	{name: 'Visibilità Plus', price: '40 EUR', includes: '1 post/carosello, 1 storia, grafica e revisione, 5 giorni WhatsApp, 1 credito visibilità web.'},
	{name: 'Visibilità Max', price: '60 EUR', includes: '1 post/carosello, 2 storie in momenti differenti, 5 giorni WhatsApp, rilancio successivo, 1 credito visibilità web.'},
];

const tournamentRows: TournamentRow[] = [
	{name: 'Torneo Essential', price: '49 EUR', details: 'Pagina/annuncio per 30 giorni, evidenza di sezione, 1 storia Instagram, 3 pubblicazioni WhatsApp, link iscrizioni.'},
	{name: 'Torneo Plus', price: '89 EUR', details: 'Presenza per 60 giorni, 1 post/carosello, 2 storie, 7 pubblicazioni WhatsApp, evidenza, rilancio vicino a scadenza.'},
	{name: 'Torneo Premium', price: '149 EUR', details: 'Presenza per 90 giorni, maggiore evidenza in homepage, 2 post/caroselli, 4 storie, fino a 14 WhatsApp, avviso "ultimi posti", report finale.'},
];

const sitePlacements: PlacementRow[] = [
	{name: 'Logo nel footer', price: '29 EUR', value: 'Presenza diffusa e discreta in tutto il sito.'},
	{name: 'Banner alla fine degli annunci', price: '49 EUR', value: 'Visibilità contestuale dopo la lettura.'},
	{name: 'Box tra gli annunci', price: '69 EUR', value: 'Maggiore attenzione nel flusso principale.'},
	{name: 'Logo/card scorrevole in homepage', price: '89 EUR', value: 'Esposizione centrale ma non invasiva.'},
	{name: 'Banner alto homepage', price: '149 EUR', value: 'Posizionamento premium ad alta visibilità.'},
	{name: 'Articolo sponsorizzato', price: '119 EUR', value: 'Visibilità editoriale, indicizzazione e lavoro di produzione.'},
];

const b2bSocialRows: PackageRow[] = [
	{name: '1 storia sponsorizzata', price: '29 EUR', includes: 'Presenza singola nelle storie del canale ufficiale.'},
	{name: '1 post o carosello sponsorizzato', price: '59 EUR', includes: 'Contenuto editoriale dedicato nel feed.'},
	{name: 'Post + storia', price: '75 EUR', includes: 'Combinazione di post/carosello e storia nello stesso periodo.'},
	{name: 'Distribuzione WhatsApp', price: '29 EUR', includes: 'Diffusione nei canali WhatsApp pertinenti al territorio.'},
	{name: 'Articolo + post + storia', price: '169 EUR', includes: 'Pacchetto editoriale completo su sito e canali social.'},
];

const partnerPackage = {
	name: 'Partner',
	price: '199 EUR / mese',
	features: [
		'Card nella homepage',
		'Box pubblicitario tra gli annunci',
		'Logo nel footer',
		'1 post Instagram',
		'2 storie Instagram',
		'Presenza nella pagina partner',
	],
	note: "Un'esclusiva merceologica prevede almeno un +25-30%, con condizioni specifiche su durata, categoria e limiti.",
};

/* ------------------------------------------------------------------ */
/* Componenti di supporto                                              */
/* ------------------------------------------------------------------ */

function SectionHeading({
	                        eyebrow,
	                        icon: Icon,
	                        title,
	                        description,
                        }: {
	eyebrow: string;
	icon: typeof User;
	title: string;
	description: string;
}) {
	return (
		<div className="max-w-2xl">
			<p className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
				<Icon className="h-4 w-4" aria-hidden="true" />
				{eyebrow}
			</p>
			<h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
				{title}
			</h2>
			<p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">{description}</p>
		</div>
	);
}

function PlanCard({plan}: {plan: PlanTier}) {
	return (
		<div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="text-lg font-semibold text-neutral-950">{plan.name}</h3>
					<p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
						{plan.subtitle}
					</p>
				</div>
				{plan.isFree && (
					<span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
						Gratuito
					</span>
				)}
			</div>

			<div className="mt-4">
				<p className="text-2xl font-semibold tracking-tight text-neutral-950">
					{plan.priceMonthly}
				</p>
				{plan.priceYearly && (
					<p className="mt-0.5 text-sm text-neutral-500">{plan.priceYearly}</p>
				)}
			</div>

			<ul className="mt-5 flex flex-1 flex-col gap-2.5">
				{plan.features.map((feature) => (
					<li key={feature} className="flex items-start gap-2 text-sm leading-6 text-neutral-700">
						<Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600" aria-hidden="true" />
						<span>{feature}</span>
					</li>
				))}
			</ul>

			{plan.note && (
				<p className="mt-4 border-t border-neutral-100 pt-3 text-xs leading-5 text-neutral-500">
					{plan.note}
				</p>
			)}
		</div>
	);
}

function PricingTable<T extends {name: string}>({
	                                                headers,
	                                                rows,
	                                                renderRow,
	                                                minWidthClass,
                                                }: {
	headers: string[];
	rows: T[];
	renderRow: (row: T) => ReactNode;
	minWidthClass: string;
}) {
	return (
		<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
			<div className="overflow-x-auto">
				<table className={`w-full ${minWidthClass}`}>
					<thead className="bg-neutral-50">
					<tr>
						{headers.map((header) => (
							<th
								key={header}
								scope="col"
								className="border-b border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500"
							>
								{header}
							</th>
						))}
					</tr>
					</thead>
					<tbody className="divide-y divide-neutral-200">{rows.map(renderRow)}</tbody>
				</table>
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Pagina                                                               */
/* ------------------------------------------------------------------ */

export default function Visibilita() {
	const [activeCategory, setActiveCategory] = useState<ProfileCategoryId>('giocatore');
	const current = profileCategories.find((c) => c.id === activeCategory)!;

	return (
		<div className="min-h-screen bg-neutral-50 text-neutral-900">
			<main>
				{/* ------------------------------ Hero ------------------------------ */}
				<section className="border-b border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
						<div className="flex flex-col items-center">
							<div className="max-w-xl text-center">
								<p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-700">
									Piani e pacchetti
								</p>
								<h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
									Visibilità
								</h1>
								<p className="mt-4 text-base leading-7 text-neutral-600 sm:text-lg">
									La registrazione è sempre gratuita. L'abbonamento riguarda la presenza premium:
									pagina vetrina, verifica, contenuti e strumenti aggiuntivi.
								</p>
							</div>

							<div className="mt-8 flex flex-wrap justify-center gap-3">
								<Link
									href="/pubblica-annuncio"
									className="inline-flex items-center gap-2 rounded-full bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
								>
									Pubblica un annuncio
									<ArrowRight className="h-4 w-4" aria-hidden="true" />
								</Link>
								<Link
									href="/"
									className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
								>
									Torna alla home
								</Link>
							</div>
						</div>
					</div>
				</section>

				{/* ------------------------------ Selettore categoria + piani ------------------------------ */}
				<section className="border-b border-neutral-200 bg-white" hidden>
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<div className="max-w-2xl">
							<p className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
								<BadgeCheck className="h-4 w-4" aria-hidden="true" />
								Profili e abbonamenti
							</p>
							<h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
								Scegli il profilo a cui dare visibilità
							</h2>
							<p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">
								Ogni categoria ha un piano dedicato. I prezzi indicati sono tariffe di lancio, da
								confermare come importi finali o soggetti a IVA.
							</p>
						</div>

						{/* Selettore categoria */}
						<div
							role="group"
							aria-label="Seleziona categoria di profilo"
							className="mt-8 flex flex-wrap gap-2"
						>
							{profileCategories.map((category) => {
								const Icon = category.icon;
								const active = category.id === activeCategory;
								return (
									<button
										key={category.id}
										type="button"
										onClick={() => setActiveCategory(category.id)}
										aria-pressed={active}
										className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 ${
											active
												? 'border-fuchsia-600 bg-fuchsia-600 text-white'
												: 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
										}`}
									>
										<Icon className="h-4 w-4" aria-hidden="true" />
										{category.label}
									</button>
								);
							})}
						</div>

						{/* Intro categoria attiva */}
						<p className="mt-6 max-w-2xl text-sm leading-6 text-neutral-600">
							{current.intro}
						</p>

						{/* Card piani */}
						<div
							className={`mt-8 grid grid-cols-1 gap-5 ${
								current.plans.length === 1
									? 'sm:grid-cols-1 lg:max-w-md'
									: current.plans.length === 2
										? 'sm:grid-cols-2'
										: 'sm:grid-cols-2 lg:grid-cols-3'
							}`}
						>
							{current.plans.map((plan) => (
								<PlanCard key={plan.name} plan={plan} />
							))}
						</div>
					</div>
				</section>

				{/* ------------------------------ Annunci prioritari ------------------------------ */}
				<section className="border-b border-neutral-200">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<SectionHeading
								eyebrow="Annunci prioritari"
								icon={Repeat2}
								title="Aumento di esposizione per l'annuncio standard"
								description="La priorità è disponibile in pacchetti da 7 o 30 giorni. La rotazione mantiene l'equilibrio tra gli annunci attivi."
							/>
							<div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-medium text-fuchsia-800">
								<BadgeEuro className="h-4 w-4" aria-hidden="true" />
								Acquisto diretto dal sito
							</div>
						</div>

						<div className="mt-8">
							<PricingTable
								headers={["Pacchetto", "Durata", "Prezzo", "Dettagli"]}
								rows={priorityRows}
								minWidthClass="min-w-[920px]"
								renderRow={(row: PriceRow) => (
									<tr key={`${row.name}-${row.duration}`}>
										<td className="px-4 py-4 align-top">
											<p className="font-medium text-neutral-950">{row.name}</p>
										</td>
										<td className="px-4 py-4 align-top text-sm text-neutral-600">{row.duration}</td>
										<td className="px-4 py-4 align-top text-sm font-semibold text-neutral-950">
											{row.price}
										</td>
										<td className="px-4 py-4 align-top text-sm leading-6 text-neutral-600">
											{row.details}
										</td>
									</tr>
								)}
							/>
						</div>
					</div>
				</section>

				{/* ------------------------------ Social + WhatsApp ------------------------------ */}
				<section className="border-b border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<SectionHeading
							eyebrow="Pacchetti Instagram + WhatsApp"
							icon={Sparkles}
							title="Promozione editoriale e rilancio sui canali"
							description="Ogni pacchetto combina produzione, revisione e distribuzione sui canali più coerenti con il contenuto. Il credito visibilità web ha un valore interno orientativo di 7,90 EUR."
						/>

						<div className="mt-8">
							<PricingTable
								headers={["Pacchetto", "Prezzo", "Cosa comprende"]}
								rows={socialRows}
								minWidthClass="min-w-[760px]"
								renderRow={(row: PackageRow) => (
									<tr key={row.name}>
										<td className="px-4 py-4 align-top">
											<p className="font-medium text-neutral-950">{row.name}</p>
										</td>
										<td className="px-4 py-4 align-top text-sm font-semibold text-neutral-950">
											{row.price}
										</td>
										<td className="px-4 py-4 align-top text-sm leading-6 text-neutral-600">
											{row.includes}
										</td>
									</tr>
								)}
							/>
						</div>
					</div>
				</section>

				{/* ------------------------------ Tornei ed eventi ------------------------------ */}
				<section className="border-b border-neutral-200">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<SectionHeading
							eyebrow="Promozione di tornei ed eventi"
							icon={Megaphone}
							title="Pacchetti combinati sito, Instagram e WhatsApp"
							description="Non è un servizio separato: è una combinazione di posizionamenti e pubblicazioni pensata per incidere direttamente sulle iscrizioni."
						/>

						<div className="mt-8">
							<PricingTable
								headers={["Pacchetto", "Prezzo", "Durata e attività"]}
								rows={tournamentRows}
								minWidthClass="min-w-[820px]"
								renderRow={(row: TournamentRow) => (
									<tr key={row.name}>
										<td className="px-4 py-4 align-top">
											<p className="font-medium text-neutral-950">{row.name}</p>
										</td>
										<td className="px-4 py-4 align-top text-sm font-semibold text-neutral-950">
											{row.price}
										</td>
										<td className="px-4 py-4 align-top text-sm leading-6 text-neutral-600">
											{row.details}
										</td>
									</tr>
								)}
							/>
						</div>

						<p className="mt-4 text-xs leading-5 text-neutral-500">
							Dopo la crescita del traffico e la disponibilità di dati reali, i prezzi potranno
							salire indicativamente a 69 / 119 / 199 EUR.
						</p>
					</div>
				</section>

				{/* ------------------------------ Pubblicità sul sito ------------------------------ */}
				<section className="border-b border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<SectionHeading
							eyebrow="Spazi pubblicitari sul sito"
							icon={Megaphone}
							title="Opzioni da 30 giorni per una presenza più ampia"
							description="Gli spazi coprono homepage, pagine elenco e contenuti editoriali, con livelli di visibilità diversi in base al posizionamento. Tariffe di lancio, da aggiornare con i dati reali del sito."
						/>

						<div className="mt-8">
							<PricingTable
								headers={["Posizionamento", "Prezzo di lancio", "Valore"]}
								rows={sitePlacements}
								minWidthClass="min-w-[760px]"
								renderRow={(row: PlacementRow) => (
									<tr key={row.name}>
										<td className="px-4 py-4 align-top">
											<p className="font-medium text-neutral-950">{row.name}</p>
										</td>
										<td className="px-4 py-4 align-top text-sm font-semibold text-neutral-950">
											{row.price}
										</td>
										<td className="px-4 py-4 align-top text-sm leading-6 text-neutral-600">
											{row.value}
										</td>
									</tr>
								)}
							/>
						</div>
					</div>
				</section>

				{/* ------------------------------ B2B social + Partner ------------------------------ */}
				<section className="bg-neutral-50">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<SectionHeading
							eyebrow="Aziende e partner"
							icon={Building2}
							title="Visibilità social aggiuntiva e pacchetto Partner"
							description="Servizi B2B acquistabili singolarmente o come parte del pacchetto Partner mensile."
						/>

						<div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
							<PricingTable
								headers={["Servizio", "Prezzo", "Cosa comprende"]}
								rows={b2bSocialRows}
								minWidthClass="min-w-[560px]"
								renderRow={(row: PackageRow) => (
									<tr key={row.name}>
										<td className="px-4 py-4 align-top">
											<p className="font-medium text-neutral-950">{row.name}</p>
										</td>
										<td className="px-4 py-4 align-top text-sm font-semibold text-neutral-950">
											{row.price}
										</td>
										<td className="px-4 py-4 align-top text-sm leading-6 text-neutral-600">
											{row.includes}
										</td>
									</tr>
								)}
							/>

							<div className="flex flex-col rounded-2xl border-2 border-fuchsia-600 bg-white p-6">
								<span className="inline-flex w-fit items-center rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-semibold text-fuchsia-800">
									Pacchetto più completo
								</span>
								<h3 className="mt-3 text-lg font-semibold text-neutral-950">
									{partnerPackage.name}
								</h3>
								<p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
									{partnerPackage.price}
								</p>
								<ul className="mt-5 flex flex-1 flex-col gap-2.5">
									{partnerPackage.features.map((feature) => (
										<li key={feature} className="flex items-start gap-2 text-sm leading-6 text-neutral-700">
											<Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600" aria-hidden="true" />
											<span>{feature}</span>
										</li>
									))}
								</ul>
								<p className="mt-4 border-t border-neutral-100 pt-3 text-xs leading-5 text-neutral-500">
									{partnerPackage.note}
								</p>
							</div>
						</div>

						<div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className={"mb-2 sm:mb-0"}>
									<p className="text-sm font-semibold text-neutral-950">Nota operativa</p>
									<p className="mt-2 text-sm leading-6 text-neutral-600">
										Priorità, pacchetti social e pubblicità affiancano gli annunci standard, non li
										sostituiscono.
									</p>
									<p className="mt-2 sm:mt-0 text-sm leading-6 text-neutral-600">
										Nessun pacchetto garantisce visualizzazioni minime, contatti o
										ingaggi.
									</p>
								</div>
								<Link
									href="/pubblica-annuncio"
									className="max-w-56 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
								>
									Avvia la pubblicazione
									<ArrowRight className="size-6" aria-hidden="true" />
								</Link>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}