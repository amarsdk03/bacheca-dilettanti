"use client";

import {cn} from "@/lib/utils";
import {useState, useEffect} from "react";
import Link from "next/link";
import {ArrowLeft, SearchX} from "lucide-react";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import {buttonVariants} from "@/components/ui/button";

const frasiErrori = [
	"Il pallone è uscito dal campo. Anche questa pagina.",
	"Fuorigioco netto: questa pagina non può essere convalidata.",
	"Abbiamo controllato anche al VAR: qui non c’è nulla.",
	"La pagina era convocata, ma non si è presentata.",
	"Novantesimo minuto: la pagina resta introvabile.",
	"Rigore sbagliato: questa pagina non esiste.",
	"Cartellino rosso per questo link: espulso dal campo.",
	"La formazione non prevede questa pagina.",
	"Palla persa a centrocampo, e anche la pagina.",
	"Il triplice fischio ha cancellato questa pagina.",
	"Recupero terminato: la pagina non è mai arrivata.",
	"Tabellino aggiornato: nessuna pagina in campo.",
	"Sostituzione forzata: la pagina non è più disponibile.",
	"Traversa piena, ma la pagina non è entrata.",
	"Il portiere ha bloccato anche questa richiesta.",
	"Fallo di mano: la pagina è stata annullata.",
	"Rosa incompleta: manca proprio questa pagina.",
	"Assist perfetto, peccato che la pagina non ci sia.",
	"Il campionato di questa pagina è finito da un pezzo.",
	"Squalifica a tempo indeterminato per questo indirizzo.",
	"Il calcio d’angolo non ha trovato questa pagina.",
	"Panchina vuota: nessuna pagina di riserva qui.",
	"Il fuorigioco è stato segnalato, la pagina no.",
	"Tempo scaduto: questa pagina non ha completato il match.",
	"Ammonizione per link fallito: pagina inesistente.",
];

export default function NotFound() {
	const [frase, setFrase] = useState(frasiErrori[0]);

	useEffect(() => {
		setFrase(frasiErrori[Math.random() * frasiErrori.length | 0]);
	}, []);

	return (
		<div className="flex min-h-screen flex-col bg-neutral-50">
			<Navbar />
			<main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-32">
				<div aria-hidden="true" className="absolute -left-24 top-10 size-72 rounded-full bg-fuchsia-200/50 blur-3xl" />
				<div aria-hidden="true" className="absolute -right-24 bottom-10 size-72 rounded-full bg-purple-200/50 blur-3xl" />
				<section className="relative mx-auto max-w-2xl text-center">
					<div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-fuchsia-200 bg-white text-fuchsia-600 shadow-sm">
						<SearchX className="size-8" aria-hidden="true" />
					</div>
					<p className="mt-7 text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-700">Errore 404</p>
					<h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">Pagina non trovata</h1>
					<p className="mx-auto mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg">{frase}</p>
					<Link href="/" className={cn(buttonVariants({size: "lg"}), "rounded-full px-5 mt-12")}><ArrowLeft /> Torna alla home</Link>
				</section>
			</main>
			<Footer whiteBackground />
		</div>
	);
}
