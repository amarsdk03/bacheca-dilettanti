export interface SottotipologiaAnnuncio {
	valore: string;
	nome: string;
	descrizione?: string;
	icona?: string;
}

export interface TipologiaAnnuncio {
	valore: string;
	nome: string;
	descrizione: string;
	icona?: string;
	sottotipologie?: SottotipologiaAnnuncio[];
}

export type PianoVisibilita = {
	valore: string;
	nome: string;
	prezzo: string;
	descrizione: string;
	durata?: string;
	prezzoAnnuale?: string;
	caratteristiche?: readonly string[];
};

/** Unica sorgente dei piani presentati in /visibilita, compresi quelli al momento nascosti. */
export const PIANI_VISIBILITA = {
	profili: {
		giocatore: [
			{valore: "giocatore-gratuito", nome: "Gratuito", prezzo: "0 EUR", descrizione: "Dati essenziali, zona, breve descrizione e un contatto.", caratteristiche: ["Dati essenziali, ruolo e anno di nascita", "Zona di appartenenza", "Breve presentazione", "Un contatto"]},
			{valore: "giocatore-plus", nome: "Plus", prezzo: "4,90 EUR / mese", prezzoAnnuale: "49 EUR / anno", descrizione: "Profilo completo con esperienze, caratteristiche tecniche, video, social e curriculum sportivo.", caratteristiche: ["Profilo completo con esperienze", "Caratteristiche tecniche", "Fino a 5 video", "Social e curriculum sportivo"]},
			{valore: "giocatore-pro", nome: "Pro", prezzo: "9,90 EUR / mese", prezzoAnnuale: "99 EUR / anno", descrizione: "Tutto il piano Plus, più video, evidenza nei risultati, descrizione estesa e statistiche.", caratteristiche: ["Tutto il piano Plus", "Fino a 15 video", "Evidenza nei risultati", "Descrizione estesa", "Aggiornamento disponibilità e statistiche essenziali"]},
		],
		staff: [
			{valore: "staff-base", nome: "Base", prezzo: "4,90 EUR / mese", prezzoAnnuale: "49 EUR / anno", descrizione: "Profilo professionale con qualifiche, esperienze, contatti, social e CV.", caratteristiche: ["Profilo professionale con foto e presentazione", "Qualifiche ed esperienze", "Contatti e social", "CV o documento allegato"]},
			{valore: "staff-pro", nome: "Pro", prezzo: "9,90 EUR / mese", prezzoAnnuale: "99 EUR / anno", descrizione: "Tutto il piano Base, sezione dedicata, portfolio e contenuti professionali.", caratteristiche: ["Tutto il piano Base", "Presenza nella sezione dedicata", "Bacheca personale e piccolo portfolio", "Pubblicazione di analisi, video o lavori professionali", "Massimo 2 nuovi contenuti al mese nel feed"]},
		],
		club: [
			{valore: "club-base", nome: "Base", prezzo: "4,90 EUR / mese", prezzoAnnuale: "49,90 EUR / anno", descrizione: "Pagina dedicata verificata con logo, descrizione, contatti, social e annunci.", caratteristiche: ["Pagina dedicata con logo, descrizione e contatti", "Link al sito e ai profili social", "Annunci e contenuti del club nella stessa pagina", "Profilo verificato"]},
			{valore: "club-advanced", nome: "Advanced", prezzo: "14,90 EUR / mese", prezzoAnnuale: "149,90 EUR / anno", descrizione: "Tutto il piano Base, Club Pilota, feed e un annuncio prioritario al mese.", caratteristiche: ["Tutto il piano Base", "Spazio nella sezione Club Pilota della regione", "Pubblicazione di aggiornamenti nel feed", "Accesso anticipato a nuove funzioni", "Un annuncio prioritario di 7 giorni al mese, non cumulabile", "Possibile sconto su prodotti e servizi Club Pilota"]},
		],
		professionisti: [{valore: "professionisti-base", nome: "Base professionisti e studi", prezzo: "34,90 EUR / mese", prezzoAnnuale: "349,90 EUR / anno", descrizione: "Pagina verificata con servizi, listino, promozioni, annunci e contenuti.", caratteristiche: ["Pagina dedicata con logo, descrizione e contatti", "Link al sito e ai social", "Listino prezzi e promozioni", "Annunci e contenuti raccolti nella pagina", "Profilo verificato", "Possibilità di proporre servizi ai club via e-mail o articoli dedicati"]}],
		agenzie: [{valore: "agenzie-base", nome: "Base agenzie e agenti", prezzo: "34,90 EUR / mese", prezzoAnnuale: "349,90 EUR / anno", descrizione: "Pagina verificata con attività, opportunità e fino a 5 pubblicazioni mensili.", caratteristiche: ["Pagina dedicata con logo o foto, descrizione e contatti", "Link al sito e ai social", "Listino prezzi e promozioni, quando applicabile", "Annunci e contenuti raccolti nella pagina", "Profilo verificato e spazio dedicato", "Fino a 5 pubblicazioni al mese"]}],
		campi: [{valore: "campi-base", nome: "Base gestori di campi", prezzo: "4,90 EUR / mese", prezzoAnnuale: "49 EUR / anno", descrizione: "Presenza nella ricerca locale con servizi, prezzi, prenotazioni e filtri.", caratteristiche: ["Presenza nella sezione Campi in affitto nella tua zona", "Servizi e prezzi del campo", "Link di prenotazione", "Filtri nella ricerca per tipologia e territorio", "Possibile pagina con disponibilità orarie e prenotazioni dirette"]}],
	},
	annunciPrioritari: [
		{valore: "prioritario-1-7", nome: "Annuncio prioritario", durata: "7 giorni", prezzo: "7,90 EUR", descrizione: "L'annuncio entra in rotazione con priorità rispetto alla lista standard."},
		{valore: "prioritario-2-7", nome: "Pacchetto 2 annunci", durata: "7 giorni", prezzo: "15,80 EUR", descrizione: "Due annunci prioritari attivati insieme per lo stesso periodo."},
		{valore: "prioritario-3-7", nome: "Pacchetto 3 annunci", durata: "7 giorni", prezzo: "19,90 EUR", descrizione: "Tre annunci prioritari con esposizione coordinata a rotazione."},
		{valore: "prioritario-1-30", nome: "Annuncio prioritario", durata: "30 giorni", prezzo: "29,90 EUR", descrizione: "Soluzione singola per un mese di maggiore esposizione."},
		{valore: "prioritario-2-30", nome: "Pacchetto 2 annunci", durata: "30 giorni", prezzo: "49,90 EUR", descrizione: "Due annunci prioritari attivi per 30 giorni."},
		{valore: "prioritario-4-30", nome: "Pacchetto 4 annunci", durata: "30 giorni", prezzo: "89,90 EUR", descrizione: "Quattro annunci prioritari per una presenza più estesa."},
	],
	social: [
		{valore: "story-boost", nome: "Story Boost", prezzo: "15 EUR", descrizione: "1 storia Instagram, revisione testo e ripubblicazione WhatsApp per 5 giorni."},
		{valore: "post-boost", nome: "Post Boost", prezzo: "30 EUR", descrizione: "1 post o carosello, grafica, revisione testo e ripubblicazione WhatsApp per 5 giorni."},
		{valore: "visibilita-plus", nome: "Visibilità Plus", prezzo: "40 EUR", descrizione: "Post/carosello, storia, grafica, revisione, WhatsApp e un credito web."},
		{valore: "visibilita-max", nome: "Visibilità Max", prezzo: "60 EUR", descrizione: "Post/carosello, due storie, WhatsApp, rilancio e un credito web."},
	],
	tornei: [
		{valore: "torneo-essential", nome: "Torneo Essential", prezzo: "49 EUR", descrizione: "Pagina per 30 giorni, evidenza, storia Instagram, 3 pubblicazioni WhatsApp e link iscrizioni."},
		{valore: "torneo-plus", nome: "Torneo Plus", prezzo: "89 EUR", descrizione: "Presenza per 60 giorni, post, 2 storie, 7 pubblicazioni WhatsApp, evidenza e rilancio."},
		{valore: "torneo-premium", nome: "Torneo Premium", prezzo: "149 EUR", descrizione: "Presenza per 90 giorni, homepage, 2 post, 4 storie, WhatsApp e report finale."},
	],
	pubblicitaSito: [
		["logo-footer", "Logo nel footer", "29 EUR", "Presenza diffusa e discreta in tutto il sito."], ["banner-annunci", "Banner alla fine degli annunci", "49 EUR", "Visibilità contestuale dopo la lettura."], ["box-annunci", "Box tra gli annunci", "69 EUR", "Maggiore attenzione nel flusso principale."], ["card-homepage", "Logo/card scorrevole in homepage", "89 EUR", "Esposizione centrale ma non invasiva."], ["banner-homepage", "Banner alto homepage", "149 EUR", "Posizionamento premium ad alta visibilità."], ["articolo-sponsorizzato", "Articolo sponsorizzato", "119 EUR", "Visibilità editoriale, indicizzazione e produzione."],
	].map(([valore, nome, prezzo, descrizione]) => ({valore, nome, prezzo, descrizione})),
	b2b: [
		["storia-sponsorizzata", "1 storia sponsorizzata", "29 EUR", "Presenza singola nelle storie del canale ufficiale."], ["post-sponsorizzato", "1 post o carosello sponsorizzato", "59 EUR", "Contenuto editoriale dedicato nel feed."], ["post-storia", "Post + storia", "75 EUR", "Post/carosello e storia nello stesso periodo."], ["whatsapp", "Distribuzione WhatsApp", "29 EUR", "Diffusione nei canali WhatsApp pertinenti al territorio."], ["articolo-post-storia", "Articolo + post + storia", "169 EUR", "Pacchetto editoriale completo su sito e social."], ["partner", "Partner", "199 EUR / mese", "Card homepage, box annunci, logo footer, post, storie e pagina partner."],
	].map(([valore, nome, prezzo, descrizione]) => ({valore, nome, prezzo, descrizione})),
} satisfies Record<string, unknown>;

export const PUBBLICAZIONE_GRATUITA: PianoVisibilita = {
	valore: "gratuito",
	nome: "Pubblicazione gratuita",
	prezzo: "0 EUR",
	descrizione: "Pubblica senza priorità o promozione aggiuntiva.",
};

export function getPianiPubblicazione(tipologia: string): readonly PianoVisibilita[] {
	let pianiSpecifici: readonly PianoVisibilita[] = [];

	switch (tipologia) {
		case "giocatore":
			pianiSpecifici = PIANI_VISIBILITA.profili.giocatore.filter(
				(piano) => piano.valore !== "giocatore-gratuito"
			);
			break;
		case "staff-sportivo":
		case "arbitro":
			pianiSpecifici = PIANI_VISIBILITA.profili.staff;
			break;
		case "squadra":
			pianiSpecifici = PIANI_VISIBILITA.profili.club;
			break;
		case "aziende-enti":
			pianiSpecifici = PIANI_VISIBILITA.b2b;
			break;
		case "professionisti-studi":
			pianiSpecifici = PIANI_VISIBILITA.profili.professionisti;
			break;
		case "torneo-evento":
			pianiSpecifici = PIANI_VISIBILITA.tornei;
			break;
		case "campo-impianto-sportivo":
			pianiSpecifici = PIANI_VISIBILITA.profili.campi;
			break;
	}

	return [PUBBLICAZIONE_GRATUITA, ...pianiSpecifici, ...PIANI_VISIBILITA.annunciPrioritari];
}

export function isPianoPagamento(piano: PianoVisibilita) {
	return piano.valore !== PUBBLICAZIONE_GRATUITA.valore;
}

export const tipologieAnnuncio: TipologiaAnnuncio[] = [
	{
		nome: "Giocatore",
		valore: "giocatore",
		icona: "User",
		descrizione: "Inserisci i tuoi dati per farti scoprire da squadre e osservatori",
	},
	{
		nome: "Squadra",
		valore: "squadra",
		icona: "Award",
		descrizione: "Fatti trovare da nuovi talenti sportivi, sponsor e professionisti",
		sottotipologie: [
			{valore: "cerca-giocatore", nome: "Cerca giocatore", icona: "UserSearch"},
			{valore: "cerca-staff", nome: "Cerca staff sportivo", icona: "UsersRound"},
			{valore: "cerca-partite-amichevoli", nome: "Cerca partite/amichevoli", icona: "Swords"},
			{valore: "cerca-sponsor", nome: "Cerca sponsor", icona: "Handshake"},
		],
	},
	{
		nome: "Arbitro",
		valore: "arbitro",
		icona: "ClipboardList",
		descrizione: "Renditi disponibile per arbitrare o gestire partite ed eventi sportivi",
	},
	{
		nome: "Aziende ed enti",
		valore: "aziende-enti",
		icona: "Building2",
		descrizione: "Organizza e promuovi i tuoi OpenDay, eventi o allenamenti sportivi",
	},
	{
		nome: "Staff sportivo",
		valore: "staff-sportivo",
		icona: "Stethoscope",
		descrizione: "Cerca e applica per occupazioni retribuite nel settore sportivo",
	},
	{
		nome: "Professionisti e studi",
		valore: "professionisti-studi",
		icona: "Briefcase",
		descrizione: "Offri i tuoi servizi professionali a squadre, atleti e società sportive",
	},
	{
		nome: "Torneo / Evento",
		valore: "torneo-evento",
		icona: "Trophy",
		descrizione: "Organizza e promuovi il tuo torneo, evento o manifestazione sportiva",
	},
	{
		nome: "Campo / impianto sportivo",
		valore: "campo-impianto-sportivo",
		icona: "TrafficCone",
		descrizione: "Fornisci e pubblicizza l'uso dei tuoi campi e impianti sportivi",
	},
];

export function getTipologia(valore: string) {
	return tipologieAnnuncio.find((tipologia) => tipologia.valore === valore);
}
