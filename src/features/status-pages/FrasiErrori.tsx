// src/components/ErrorPhrase.tsx
"use client";

import { useState, useEffect } from "react";

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

export default function FrasiErrori() {
	const [frase, setFrase] = useState(frasiErrori[0]);

	useEffect(() => {
		setFrase(frasiErrori[Math.random() * frasiErrori.length | 0]);
	}, []);

	return (
		<p className="mx-auto mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg">{frase}</p>
	);
}