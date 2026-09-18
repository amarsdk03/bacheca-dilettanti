export interface HomepageNotice {
	id: string;
	tipo: "notizia" | "evento" | "problema";
	titolo: string;
	testo: string;
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
		titolo: "Bacheca Dilettanti apre le porte",
		testo: "Bacheca Dilettanti è online: uno spazio per giocatori, squadre, staff e professionisti che vogliono farsi trovare o scoprire nuove opportunità nel calcio dilettantistico.\n\nDurante settembre continueremo ad ampliare la piattaforma con nuove tipologie di profilo, strumenti per gli annunci e miglioramenti pensati per rendere più semplice il primo contatto tra le persone giuste.",
		data: "2026-09-18",
		azione: {etichetta: "Sfoglia gli annunci", href: "/annunci"},
	},
	{
		id: "stato-alpha-segnalazioni",
		tipo: "problema",
		titolo: "Bacheca è ancora in alpha",
		testo: "La piattaforma è ancora in fase alpha: alcune funzionalità possono cambiare, essere incomplete o presentare rallentamenti. Stiamo lavorando per migliorare l'esperienza ogni giorno.\n\nSe trovi un errore, un'informazione poco chiara o hai un suggerimento, segnalacelo dalla pagina Contatti oppure tramite i nostri canali WhatsApp e Instagram. Ogni segnalazione ci aiuta a costruire una Bacheca migliore.",
		data: "2026-09-18",
		azione: {etichetta: "Vai ai contatti", href: "/contatti"},
	},
] as const satisfies readonly HomepageNotice[];
