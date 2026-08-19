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

export type CanaleContattoAnnuncio =
	| "Email"
	| "Telefono"
	| "Instagram"
	| "Facebook"
	| "Tiktok"
	| "Youtube"
	| "X (Twitter)"
	| "Linkedin";

export type ContattiAnnuncio = Record<CanaleContattoAnnuncio, string>;

export const CONTATTI_ANNUNCIO_DEFAULT: ContattiAnnuncio = {
	Email: "",
	Telefono: "",
	Instagram: "",
	Facebook: "",
	Tiktok: "",
	Youtube: "",
	"X (Twitter)": "",
	Linkedin: "",
};

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATA_NASCITA_PLACEHOLDERS = {
	anno: "Anno",
	mese: "Mese",
	giorno: "Giorno",
} as const;

export const CITTA_ESEMPIO_PER_REGIONE: Record<string, string[]> = {
	Abruzzo: ["Pescara", "L'Aquila", "Chieti"],
	Basilicata: ["Potenza", "Matera", "Melfi"],
	Calabria: ["Reggio Calabria", "Catanzaro", "Cosenza"],
	Campania: ["Napoli", "Salerno", "Caserta"],
	"Emilia-Romagna": ["Bologna", "Modena", "Parma"],
	"Friuli-Venezia Giulia": ["Trieste", "Udine", "Pordenone"],
	Lazio: ["Roma", "Latina", "Viterbo"],
	Liguria: ["Genova", "La Spezia", "Savona"],
	Lombardia: ["Milano", "Bergamo", "Brescia"],
	Marche: ["Ancona", "Pesaro", "Ascoli Piceno"],
	Molise: ["Campobasso", "Isernia", "Termoli"],
	Piemonte: ["Torino", "Novara", "Alessandria"],
	Puglia: ["Bari", "Lecce", "Taranto"],
	Sardegna: ["Cagliari", "Sassari", "Nuoro"],
	Sicilia: ["Palermo", "Catania", "Messina"],
	Toscana: ["Firenze", "Pisa", "Siena"],
	"Trentino-Alto Adige": ["Trento", "Bolzano", "Rovereto"],
	Umbria: ["Perugia", "Terni", "Assisi"],
	"Valle d'Aosta": ["Aosta", "Courmayeur", "Saint-Vincent"],
	Veneto: ["Verona", "Venezia", "Padova"],
};

export const TIPOLOGIA_CALCIO_OPTIONS = ["Calcio a 11", "Calcio a 7", "Calcio a 5"] as const;

export const TIPOLOGIA_PRINCIPALE_SQUADRA_OPTIONS = TIPOLOGIA_CALCIO_OPTIONS.map((tipologia) => ({
	valore: tipologia,
	etichetta: tipologia,
}));

export const RUOLO_PRINCIPALE_OPTIONS = ["Portiere", "Difensore", "Centrocampista", "Attaccante"] as const;

export const RUOLI_SPECIFICI_PER_RUOLO: Record<string, string[]> = {
	Portiere: [],
	Difensore: ["Libero", "Terzino sinistro", "Difensore centrale", "Terzino destro", "Esterno sinistro a tutta fascia", "Esterno destro a tutta fascia"],
	Centrocampista: ["Mediano", "Centrocampista sinistro", "Centrocampista centrale", "Centrocampista destro", "Trequartista"],
	Attaccante: ["Ala sinistra", "Ala destra", "Attaccante sinistro / Seconda punta sinistra", "Centravanti", "Attaccante destro / Seconda punta destra", "Seconda punta"],
};

export const FIGURA_PROFESSIONALE_OPTIONS = [
	"Analisi", "Coaching/Preparatore", "Osservatore/Scouting", "Esecutivo/Amministrativo",
	"Manutenzione/Infrastruttura", "HR", "Fisioterapia/Medicina sportiva", "Commerciale/Business",
	"Educativo/Sociale", "Media/Design", "Altro",
] as const;

export const CATEGORIE_CALCIO_GROUPS = [
	{gruppo: "Calcio professionistico", opzioni: ["Serie A", "Serie B", "Serie C"]},
	{gruppo: "Calcio dilettantistico", opzioni: ["Serie D", "Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria", "Terza Categoria"]},
	{gruppo: "Calcio giovanile", opzioni: ["Primavera 1", "Primavera 2", "Primavera 3", "Primavera 4"]},
	{gruppo: "Calcio femminile", opzioni: ["Serie A Femminile", "Serie B Femminile", "Serie C Femminile", "Eccellenza Femminile", "Promozione Femminile"]},
	{gruppo: "Calcio a 5", opzioni: ["Serie A C5", "Serie A2 Élite", "Serie A2", "Serie B C5", "Serie C C5"]},
	{gruppo: "Calcio amatoriale", opzioni: ["Calcio amatoriale"]},
] as const;

export const DISPONIBILITA_SPOSTAMENTO_OPTIONS = ["Non specificare", "Si", "No"] as const;
export const DISPONIBILITA_TRASFERTA_OPTIONS = [
	{valore: "Si", etichetta: "Si"},
	{valore: "No", etichetta: "No"},
] as const;

export const ORARIO_INDICATIVO_DA_OPTIONS = Array.from({length: 24}, (_, index) => {
	const orario = `${String(index).padStart(2, "0")}:00`;
	return {valore: orario, etichetta: `Dalle ${orario}`};
});

export const ORARIO_INDICATIVO_A_OPTIONS = Array.from({length: 24}, (_, index) => {
	const orario = `${String((index + 1) % 24).padStart(2, "0")}:00`;
	return {valore: orario, etichetta: `Alle ${orario}`};
});

export const MESI_OPTIONS = [
	"Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
	"Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
] as const;
export const ANNATE_OPTIONS = Array.from({length: 101}, (_, index) => String(new Date().getFullYear() - index));
export const ANNI_NASCITA_OPTIONS = Array.from({length: 84}, (_, index) => String(new Date().getFullYear() - 18 - index));

export type StatoEsperienza = "non-specificare" | "in-corso" | "conseguito";
export const STATO_ESPERIENZA_OPTIONS: {value: StatoEsperienza; label: string}[] = [
	{value: "non-specificare", label: "Non specificare"},
	{value: "in-corso", label: "In corso"},
	{value: "conseguito", label: "Conseguito"},
];

export const MODALITA_SERVIZIO_OPTIONS = [
	{valore: "in-presenza", etichetta: "In presenza"},
	{valore: "online", etichetta: "Online"},
	{valore: "entrambe", etichetta: "Entrambe"},
] as const;
export const DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS = [
	{valore: "si", etichetta: "Sì"},
	{valore: "no", etichetta: "No"},
] as const;
export const MODALITA_ISCRIZIONE_OPTIONS = [
	{valore: "libera", etichetta: "Libera"},
	{valore: "posti-limitati", etichetta: "Posti limitati"},
] as const;

export const SOCIAL_CONTACT_OPTIONS: {
	valore: CanaleContattoAnnuncio;
	etichetta: string;
	placeholder: string;
	tipoInput: "email" | "tel" | "url";
	icona?: string;
}[] = [
	{valore: "Email", etichetta: "Email", placeholder: "nome@email.it", tipoInput: "email", icona: "Mail"},
	{valore: "Telefono", etichetta: "Telefono", placeholder: "+39 333 123 4567", tipoInput: "tel", icona: "Phone"},
	{valore: "Instagram", etichetta: "Instagram", placeholder: "https://instagram.com/nomeutente", tipoInput: "url", icona: "Camera"},
	{valore: "Facebook", etichetta: "Facebook", placeholder: "https://facebook.com/nomeutente", tipoInput: "url", icona: "Users"},
	{valore: "Tiktok", etichetta: "TikTok", placeholder: "https://tiktok.com/@nomeutente", tipoInput: "url", icona: "Music2"},
	{valore: "Youtube", etichetta: "YouTube", placeholder: "https://youtube.com/nomeutente", tipoInput: "url", icona: "Video"},
	{valore: "X (Twitter)", etichetta: "X (Twitter)", placeholder: "https://x.com/nomeutente", tipoInput: "url", icona: "MessagesSquare"},
	{valore: "Linkedin", etichetta: "LinkedIn", placeholder: "https://linkedin.com/in/nomeutente", tipoInput: "url", icona: "BriefcaseBusiness"},
];

export function getOptionLabel(options: readonly {valore: string; etichetta: string}[], value: string) {
	return options.find((option) => option.valore === value)?.etichetta;
}

export type PianoVisibilita = {
	valore: string;
	nome: string;
	prezzo: string;
	descrizione: string;
	durata?: string;
	caratteristiche?: readonly string[];
};

/** Unica sorgente dei piani presentati in /visibilita, compresi quelli al momento nascosti. */
export const PIANI_VISIBILITA = {
	profili: {
		giocatore: [
			{valore: "giocatore-gratuito", nome: "Gratuito", prezzo: "0 EUR", descrizione: "Dati essenziali, zona, breve descrizione e un contatto.", caratteristiche: ["Dati essenziali, ruolo e anno di nascita", "Zona di appartenenza", "Breve presentazione", "Un contatto"]},
			{valore: "giocatore-plus", nome: "Plus", prezzo: "4,90 EUR / mese", descrizione: "Profilo completo con esperienze, caratteristiche tecniche, video, social e curriculum sportivo.", caratteristiche: ["Profilo completo con esperienze", "Caratteristiche tecniche", "Fino a 5 video", "Social e curriculum sportivo"]},
			{valore: "giocatore-pro", nome: "Pro", prezzo: "9,90 EUR / mese", descrizione: "Tutto il piano Plus, più video, evidenza nei risultati, descrizione estesa e statistiche.", caratteristiche: ["Tutto il piano Plus", "Fino a 15 video", "Evidenza nei risultati", "Descrizione estesa", "Aggiornamento disponibilità e statistiche essenziali"]},
		],
		staff: [
			{valore: "staff-base", nome: "Base", prezzo: "4,90 EUR / mese", descrizione: "Profilo professionale con qualifiche, esperienze, contatti, social e CV.", caratteristiche: ["Profilo professionale con foto e presentazione", "Qualifiche ed esperienze", "Contatti e social", "CV o documento allegato"]},
			{valore: "staff-pro", nome: "Pro", prezzo: "9,90 EUR / mese", descrizione: "Tutto il piano Base, sezione dedicata, portfolio e contenuti professionali.", caratteristiche: ["Tutto il piano Base", "Presenza nella sezione dedicata", "Bacheca personale e piccolo portfolio", "Pubblicazione di analisi, video o lavori professionali", "Massimo 2 nuovi contenuti al mese nel feed"]},
		],
		club: [
			{valore: "club-base", nome: "Base", prezzo: "4,90 EUR / mese", descrizione: "Pagina dedicata verificata con logo, descrizione, contatti, social e annunci.", caratteristiche: ["Pagina dedicata con logo, descrizione e contatti", "Link al sito e ai profili social", "Annunci e contenuti del club nella stessa pagina", "Profilo verificato"]},
			{valore: "club-advanced", nome: "Advanced", prezzo: "14,90 EUR / mese", descrizione: "Tutto il piano Base, Club Pilota, feed e un annuncio prioritario al mese.", caratteristiche: ["Tutto il piano Base", "Spazio nella sezione Club Pilota della regione", "Pubblicazione di aggiornamenti nel feed", "Accesso anticipato a nuove funzioni", "Un annuncio prioritario di 7 giorni al mese, non cumulabile", "Possibile sconto su prodotti e servizi Club Pilota"]},
		],
		professionisti: [{valore: "professionisti-base", nome: "Base professionisti e studi", prezzo: "34,90 EUR / mese", descrizione: "Pagina verificata con servizi, listino, promozioni, annunci e contenuti.", caratteristiche: ["Pagina dedicata con logo, descrizione e contatti", "Link al sito e ai social", "Listino prezzi e promozioni", "Annunci e contenuti raccolti nella pagina", "Profilo verificato", "Possibilità di proporre servizi ai club via e-mail o articoli dedicati"]}],
		agenzie: [{valore: "agenzie-base", nome: "Base agenzie e agenti", prezzo: "34,90 EUR / mese", descrizione: "Pagina verificata con attività, opportunità e fino a 5 pubblicazioni mensili.", caratteristiche: ["Pagina dedicata con logo o foto, descrizione e contatti", "Link al sito e ai social", "Listino prezzi e promozioni, quando applicabile", "Annunci e contenuti raccolti nella pagina", "Profilo verificato e spazio dedicato", "Fino a 5 pubblicazioni al mese"]}],
		campi: [{valore: "campi-base", nome: "Base gestori di campi", prezzo: "4,90 EUR / mese", descrizione: "Presenza nella ricerca locale con servizi, prezzi, prenotazioni e filtri.", caratteristiche: ["Presenza nella sezione Campi in affitto nella tua zona", "Servizi e prezzi del campo", "Link di prenotazione", "Filtri nella ricerca per tipologia e territorio", "Possibile pagina con disponibilità orarie e prenotazioni dirette"]}],
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

export type CategoriaVisibilita = "gratis" | "plus" | "pro" | "prioritario";

export const CATEGORIE_VISIBILITA_OPTIONS: readonly {
	valore: CategoriaVisibilita;
	nome: string;
}[] = [
	{valore: "gratis", nome: "Gratis"},
	{valore: "plus", nome: "Plus"},
	{valore: "pro", nome: "Pro"},
	{valore: "prioritario", nome: "Prioritario"},
];

export type OpzioniVisibilita = {
	gratis: PianoVisibilita;
	plus?: PianoVisibilita;
	pro?: PianoVisibilita;
	prioritari: readonly PianoVisibilita[];
};

export function getOpzioniVisibilita(tipologia: string): OpzioniVisibilita {
	let plus: PianoVisibilita | undefined;
	let pro: PianoVisibilita | undefined;
	let prioritari: readonly PianoVisibilita[] = PIANI_VISIBILITA.annunciPrioritari;

	switch (tipologia) {
		case "giocatore":
			plus = PIANI_VISIBILITA.profili.giocatore[1];
			pro = PIANI_VISIBILITA.profili.giocatore[2];
			break;
		case "staff-sportivo":
		case "arbitro":
			plus = PIANI_VISIBILITA.profili.staff[0];
			pro = PIANI_VISIBILITA.profili.staff[1];
			break;
		case "squadra":
			plus = PIANI_VISIBILITA.profili.club[0];
			pro = PIANI_VISIBILITA.profili.club[1];
			break;
		case "professionisti-studi":
			plus = PIANI_VISIBILITA.profili.professionisti[0];
			break;
		case "campi-impianti-sportivi":
			plus = PIANI_VISIBILITA.profili.campi[0];
			break;
		case "aziende-enti":
			prioritari = [...PIANI_VISIBILITA.annunciPrioritari, ...PIANI_VISIBILITA.b2b];
			break;
		case "torneo-evento":
			prioritari = [...PIANI_VISIBILITA.annunciPrioritari, ...PIANI_VISIBILITA.tornei];
			break;
	}

	return {gratis: PUBBLICAZIONE_GRATUITA, plus, pro, prioritari};
}

export function getPianiPubblicazione(tipologia: string): readonly PianoVisibilita[] {
	const {gratis, plus, pro, prioritari} = getOpzioniVisibilita(tipologia);
	return [gratis, plus, pro, ...prioritari].filter(
		(piano): piano is PianoVisibilita => Boolean(piano)
	);
}

export function isPianoPagamento(piano: PianoVisibilita) {
	return piano.valore !== PUBBLICAZIONE_GRATUITA.valore;
}

export const tipologieAnnuncio: TipologiaAnnuncio[] = [
	{
		nome: "Giocatore",
		valore: "giocatore",
		icona: "User",
		descrizione: "Crea il tuo profilo e fai scoprire il tuo talento a società sportive e osservatori",
	},
	{
		nome: "Squadra",
		valore: "squadra",
		icona: "Award",
		descrizione: "Cerca nuove figure calcistiche, staff, partite o sponsor per la tua squadra",
		sottotipologie: [
			{valore: "cerca-giocatore", nome: "Cerca giocatore", icona: "UserSearch"},
			{valore: "cerca-staff", nome: "Cerca staff sportivo", icona: "UsersRound"},
			{valore: "cerca-partite-amichevoli", nome: "Cerca partite/amichevoli", icona: "Swords"},
			{valore: "cerca-sponsor", nome: "Cerca sponsor", icona: "Handshake"},
		],
	},
	{
		nome: "Staff sportivo",
		valore: "staff-sportivo",
		icona: "Search",
		descrizione: "Cerca e applica per occupazioni retribuite full o part time nel settore sportivo",
	},
	{
		nome: "Professionisti e studi",
		valore: "professionisti-studi",
		icona: "Briefcase",
		descrizione: "Offri i tuoi servizi professionali occasionali a squadre, atleti e società sportive",
	},
	{
		nome: "Arbitro",
		valore: "arbitro",
		icona: "ClipboardList",
		descrizione: "Renditi disponibile per arbitrare o gestire partite ed eventi sportivi vicino a te",
	},
	{
		nome: "Torneo / Evento",
		valore: "torneo-evento",
		icona: "Trophy",
		descrizione: "Organizza e promuovi il tuo torneo, evento o manifestazione sportiva",
	},
	{
		nome: "Campi e impianti",
		valore: "campi-impianti-sportivi",
		icona: "TrafficCone",
		descrizione: "Fornisci e pubblicizza i tuoi campi e impianti sportivi",
	},
];

export function getTipologia(valore: string) {
	return tipologieAnnuncio.find((tipologia) => tipologia.valore === valore);
}
