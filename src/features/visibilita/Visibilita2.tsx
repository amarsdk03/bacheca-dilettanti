import Link from "next/link";
import type {ReactNode} from "react";
import {ArrowRight, BadgeEuro, Megaphone, Repeat2, Sparkles} from "lucide-react";

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

const priorityRows: PriceRow[] = [
	{
		name: "Annuncio prioritario",
		duration: "7 giorni",
		price: "7,90 EUR",
		details: "7,90 EUR. L'annuncio viene messo in rotazione con priorità rispetto alla lista standard.",
	},
	{
		name: "Pacchetto 2 annunci",
		duration: "7 giorni",
		price: "15,80 EUR",
		details: "15,80 EUR. Due annunci prioritari attivati insieme per lo stesso periodo.",
	},
	{
		name: "Pacchetto 3 annunci",
		duration: "7 giorni",
		price: "19,90 EUR",
		details: "19,90 EUR. Tre annunci prioritari con esposizione coordinata e distribuzione a rotazione.",
	},
	{
		name: "Annuncio prioritario",
		duration: "30 giorni",
		price: "29,90 EUR",
		details: "29,90 EUR. Soluzione singola per un mese di maggiore esposizione.",
	},
	{
		name: "Pacchetto 2 annunci",
		duration: "30 giorni",
		price: "49,90 EUR",
		details: "49,90 EUR. Due annunci prioritari attivi per 30 giorni.",
	},
	{
		name: "Pacchetto 4 annunci",
		duration: "30 giorni",
		price: "89,90 EUR",
		details: "89,90 EUR. Quattro annunci prioritari per una presenza più estesa sul periodo.",
	},
];

const socialRows: PackageRow[] = [
	{
		name: "Story Boost",
		price: "15 EUR",
		includes: "1 storia Instagram, revisione testo, ripubblicazione quotidiana per 5 giorni nei canali WhatsApp pertinenti.",
	},
	{
		name: "Post Boost",
		price: "30 EUR",
		includes: "1 post o carosello, grafica, revisione testo, ripubblicazione quotidiana per 5 giorni su WhatsApp.",
	},
	{
		name: "Visibilità Plus",
		price: "40 EUR",
		includes: "1 post/carosello, 1 storia, grafica e revisione, 5 giorni WhatsApp, 1 credito visibilità web.",
	},
	{
		name: "Visibilità Max",
		price: "60 EUR",
		includes: "1 post/carosello, 2 storie in momenti differenti, 5 giorni WhatsApp, rilancio successivo, 1 credito visibilità web.",
	},
];

const sitePlacements: PlacementRow[] = [
	{
		name: "Logo nel footer",
		price: "29 EUR",
		value: "Presenza diffusa e discreta in tutto il sito.",
	},
	{
		name: "Banner alla fine degli annunci",
		price: "49 EUR",
		value: "Visibilità contestuale dopo la lettura.",
	},
	{
		name: "Box tra gli annunci",
		price: "69 EUR",
		value: "Maggiore attenzione nel flusso principale.",
	},
	{
		name: "Logo/card scorrevole in homepage",
		price: "89 EUR",
		value: "Esposizione centrale ma non invasiva.",
	},
	{
		name: "Banner alto homepage",
		price: "149 EUR",
		value: "Posizionamento premium ad alta visibilità.",
	},
	{
		name: "Articolo sponsorizzato",
		price: "119 EUR",
		value: "Visibilità editoriale, indicizzazione e lavoro di produzione.",
	},
];

function PricingTable<T extends { name: string }>({
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

export default function Visibilita() {
	return (
		<div className="min-h-screen bg-neutral-50 text-neutral-900">
			<main>
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
									Gli annunci standard restano gratuiti. La visibilità è un acquisto semplice e
									immediato che aumenta l’esposizione dell’annuncio o del contenuto per un periodo
									definito.
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

				<section className="border-b border-neutral-200">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="max-w-2xl">
								<p className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
									<Repeat2 className="h-4 w-4" aria-hidden="true" />
									Annunci prioritari
								</p>
								<h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
									Aumento di esposizione per l’annuncio standard
								</h2>
								<p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">
									La priorità è disponibile in pacchetti da 7 o 30 giorni. La rotazione mantiene l’equilibrio tra gli annunci attivi.
								</p>
							</div>
							<div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-medium text-fuchsia-800">
								<BadgeEuro className="h-4 w-4" aria-hidden="true" />
								Piani semplici da acquistare
							</div>
						</div>

						<div className="mt-8">
							<PricingTable
								headers={["Pacchetto", "Durata", "Prezzo", "Dettagli"]}
								rows={priorityRows}
								minWidthClass="min-w-[920px]"
								renderRow={(row: PriceRow) => (
									<tr key={`${row.name}-${row.price}-${row.details}`}>
										<td className="px-4 py-4 align-top">
											<p className="font-medium text-neutral-950">{row.name}</p>
										</td>
										<td className="px-4 py-4 align-top text-sm text-neutral-600">{row.duration}</td>
										<td className="px-4 py-4 align-top text-sm font-semibold text-neutral-950">
											{row.price}
										</td>
										<td className="px-4 py-4 align-top text-sm leading-6 text-neutral-600">
											{row.details.replace(/^\d+,\d{2}\sEUR\.\s/, "")}
										</td>
									</tr>
								)}
							/>
						</div>
					</div>
				</section>

				<section className="border-b border-neutral-200 bg-white">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<div className="max-w-2xl">
							<p className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
								<Sparkles className="h-4 w-4" aria-hidden="true" />
								Pacchetti Instagram + WhatsApp
							</p>
							<h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
								Promozione editoriale e rilancio sui canali
							</h2>
							<p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">
								Ogni pacchetto combina produzione, revisione e distribuzione sui canali più coerenti con il contenuto.
							</p>
						</div>

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

				<section className="bg-neutral-50">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
						<div className="max-w-2xl">
							<p className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
								<Megaphone className="h-4 w-4" aria-hidden="true" />
								Spazi pubblicitari sul sito
							</p>
							<h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
								Opzioni da 30 giorni per una presenza più ampia
							</h2>
							<p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">
								Gli spazi coprono homepage, pagine elenco e contenuti editoriali, con livelli di visibilità diversi in base al posizionamento.
							</p>
						</div>

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

						<div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="text-sm font-semibold text-neutral-950">Nota operativa</p>
									<p className="mt-1 text-sm leading-6 text-neutral-600">
										Le priorità e i pacchetti social sono pensati per affiancare gli annunci standard, non per sostituirli.
									</p>
								</div>
								<Link
									href="/pubblica-annuncio"
									className="max-w-56 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2"
								>
									Avvia la pubblicazione
									<ArrowRight className="h-4 w-4" aria-hidden="true" />
								</Link>
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
