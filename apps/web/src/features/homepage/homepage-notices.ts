import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";

export interface HomepageNotice {
	id: string;
	tipo: "notizia" | "evento" | "problema";
	titolo: string;
	testo?: string;
	/** Nome dell'icona Lucide, ad esempio HandshakeIcon. */
	icona?: string;
	/** Colore CSS che sostituisce quello previsto dalla tipologia. */
	colore?: string;
	/** Data di pubblicazione nel formato YYYY-MM-DD. */
	data: string;
	azione?: {
		etichetta: string;
		href: string;
	};
}

// L'ordine dell'array è l'ordine di visualizzazione; il primo comunicato è aperto.
export const HOMEPAGE_NOTICES = [
	{
		id: "apertura-piattaforma-settembre",
		tipo: "notizia",
		titolo: "Pubblica in anonimo e senza contatti pubblici",
		testo: "Quando crei il profilo puoi scegliere di non mostrare il nome, e grazie alla funzione “Manifesta Interesse” puoi anche evitare di mettere i contatti pubblici.",
		icona: "MegaphoneIcon",
		data: "2026-11-01",
		azione: {etichetta: "Pubblica un'annuncio ora!", href: "/pubblica-annuncio"},
	},
	{
		id: "spazio-servizi-calcio",
		tipo: "evento",
		titolo: "Offri servizi nel mondo del calcio? Ottieni il tuo spazio esclusivo e fatti trovare",
		icona: "BriefcaseBusinessIcon",
		data: "2026-11-01",
		azione: {etichetta: "Richiedi informazioni", href: "/partner"},
	},
	{
		id: "founding-partner-bacheca",
		tipo: "evento",
		titolo: "Entra nel progetto sin dall’inizio: diventa Founding Partner di Bacheca",
		icona: "HandshakeIcon",
		data: "2026-11-01",
		azione: {etichetta: "Scopri la Partnership", href: "/partner"},
	},
] as const satisfies readonly HomepageNotice[];
