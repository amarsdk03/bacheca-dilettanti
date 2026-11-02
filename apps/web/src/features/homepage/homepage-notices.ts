export interface HomepageNotice {
	id: string;
	tipo: "notizia" | "evento" | "problema";
	titolo: string;
	testo?: string;
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
		data: "2026-10-01",
		azione: {etichetta: "Pubblica un'annuncio ora!", href: "/pubblica-annuncio"},
	},
	{
		id: "founding-partner-bacheca",
		tipo: "evento",
		titolo: "Entra nel progetto sin dall’inizio: diventa Founding Partner di Bacheca",
		data: "2026-10-01",
		azione: {etichetta: "Scopri la Partnership", href: "/partner"},
	},
	{
		id: "stato-alpha-segnalazioni",
		tipo: "problema",
		titolo: "Sito web ancora in fase di sviluppo",
		testo: "La piattaforma è ancora in fase alpha: alcune funzionalità possono cambiare, essere incomplete o presentare rallentamenti. Stiamo lavorando per migliorare l'esperienza ogni giorno.\n\nSe trovi un errore, un'informazione poco chiara o hai un suggerimento, segnalacelo dalla pagina Contatti oppure tramite i nostri canali WhatsApp e Instagram. Ogni segnalazione ci aiuta a costruire una Bacheca migliore.",
		data: "2026-10-01",
		azione: {etichetta: "Vai ai contatti", href: "/contatti"},
	},
] as const satisfies readonly HomepageNotice[];
