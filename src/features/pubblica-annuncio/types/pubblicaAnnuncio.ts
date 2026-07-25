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
	/** Se presenti, l'utente deve selezionarne una prima di poter proseguire allo step 2 */
	sottotipologie?: SottotipologiaAnnuncio[];
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
		sottotipologie: [
			{
				valore: "cerca-giocatore",
				nome: "Cerca giocatore",
				icona: "UserSearch",
			},
			{
				valore: "cerca-staff",
				nome: "Cerca staff sportivo",
				icona: "UsersRound",
			},
			{
				valore: "cerca-partite-amichevoli",
				nome: "Cerca partite/amichevoli",
				icona: "Swords",
			},
			{
				valore: "cerca-sponsor",
				nome: "Cerca sponsor",
				icona: "Handshake",
			},
		],
		descrizione: "Fatti trovare da nuovi talenti sportivi, sponsor e professionisti",
	},
	{
		nome: "Arbitro",
		valore: "arbitro",
		icona: "ClipboardList",
		descrizione: "Renditi disponibile per arbitrare o gestire partite ed eventi sportivi",
	},
	{
		nome: "Staff",
		valore: "staff",
		icona: "Briefcase",
		descrizione: "Registra le tue competenze professionali nel mondo dello sport",
	},
	{
		nome: "Società / Ente sportivo",
		valore: "societa-ente-sportivo",
		icona: "TrafficCone",
		descrizione: "Organizza e promuovi i tuoi eventi, allenamenti o impianti sportivi",
		sottotipologie: [
			{
				valore: "openday-allenamento-libero",
				nome: "OpenDay / Allenamento libero",
				icona: "CalendarDays",
			},
			{
				valore: "evento-torneo-sportivo",
				nome: "Evento",
				icona: "Trophy",
			},
			{
				valore: "struttura-campo",
				nome: "Disponibilità campo / struttura",
				icona: "LandPlot",
			},
		],
	},
	{
		nome: "Scout / Talent finder",
		valore: "scout-talent-finder",
		icona: "Star",
		descrizione: "Trova e analizza future promesse sportive sparse nel territorio",
	},
];

export function getTipologia(valore: string) {
	return tipologieAnnuncio.find((t) => t.valore === valore);
}

// ---------------------------------------------------------------------------
// Step 2 — campi dinamici in base alla combinazione tipologia / sottotipologia
// ---------------------------------------------------------------------------

export type CampoTipo = "text" | "textarea" | "select" | "number" | "date";

export interface OpzioneCampo {
	valore: string;
	etichetta: string;
}

export interface CampoFormAnnuncio {
	id: string;
	etichetta: string;
	tipo: CampoTipo;
	placeholder?: string;
	opzioni?: OpzioneCampo[];
	obbligatorio?: boolean;
}

/** Costruisce la chiave usata in campiPerTipologia. Se non c'è sottotipologia, usa solo la tipologia. */
export function getChiaveCampi(tipologia: string, sottotipologia?: string) {
	return sottotipologia ? `${tipologia}__${sottotipologia}` : tipologia;
}

const SPORT_OPTIONS: OpzioneCampo[] = [
	{valore: "calcio", etichetta: "Calcio"},
	{valore: "calcio_a_5", etichetta: "Calcio a 5"},
	{valore: "basket", etichetta: "Basket"},
	{valore: "pallavolo", etichetta: "Pallavolo"},
	{valore: "rugby", etichetta: "Rugby"},
	{valore: "tennis", etichetta: "Tennis"},
	{valore: "nuoto", etichetta: "Nuoto"},
	{valore: "atletica", etichetta: "Atletica"},
	{valore: "ciclismo", etichetta: "Ciclismo"},
	{valore: "pallamano", etichetta: "Pallamano"},
	{valore: "altro", etichetta: "Altro"},
];

const CATEGORIA_OPTIONS: OpzioneCampo[] = [
	{valore: "amatoriale", etichetta: "Amatoriale"},
	{valore: "terza_categoria", etichetta: "Terza categoria"},
	{valore: "seconda_categoria", etichetta: "Seconda categoria"},
	{valore: "prima_categoria", etichetta: "Prima categoria"},
	{valore: "promozione", etichetta: "Promozione"},
	{valore: "eccellenza", etichetta: "Eccellenza"},
];

const FIGURA_PROFESSIONALE_OPTIONS: OpzioneCampo[] = [
	{valore: "allenatore", etichetta: "Allenatore"},
	{valore: "vice_allenatore", etichetta: "Vice allenatore"},
	{valore: "preparatore_atletico", etichetta: "Preparatore atletico"},
	{valore: "team_manager", etichetta: "Team manager"},
	{valore: "fisioterapista", etichetta: "Fisioterapista"},
	{valore: "altro", etichetta: "Altro"},
];

const DISPONIBILITA_OPTIONS: OpzioneCampo[] = [
	{valore: "weekend", etichetta: "Weekend"},
	{valore: "infrasettimanale", etichetta: "Infrasettimanale"},
	{valore: "entrambi", etichetta: "Entrambi"},
];

export const campiPerTipologia: Record<string, CampoFormAnnuncio[]> = {
	giocatore: [
		{id: "sport", etichetta: "Sport praticato", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{id: "ruolo", etichetta: "Ruolo principale", tipo: "text", placeholder: "Es. Centrocampista, Ala, Libero...", obbligatorio: true},
		{id: "eta", etichetta: "Età", tipo: "number", placeholder: "Es. 24", obbligatorio: true},
		{id: "livello", etichetta: "Livello ricercato", tipo: "select", opzioni: CATEGORIA_OPTIONS, obbligatorio: true},
		{id: "descrizione", etichetta: "Presentati in breve", tipo: "textarea", placeholder: "Racconta il tuo percorso, i tuoi punti di forza...", obbligatorio: false},
	],

	squadra__cerca_giocatore: [
		{id: "sport", etichetta: "Sport", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{id: "ruolo_ricercato", etichetta: "Ruolo ricercato", tipo: "text", placeholder: "Es. Portiere, Opposto...", obbligatorio: true},
		{id: "categoria", etichetta: "Categoria del campionato", tipo: "select", opzioni: CATEGORIA_OPTIONS, obbligatorio: true},
		{id: "fascia_eta", etichetta: "Fascia d'età richiesta", tipo: "text", placeholder: "Es. 18-30", obbligatorio: false},
		{id: "descrizione", etichetta: "Descrivi cosa cerca la squadra", tipo: "textarea", obbligatorio: false},
	],

	squadra__cerca_staff: [
		{id: "sport", etichetta: "Sport", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{id: "figura_ricercata", etichetta: "Figura ricercata", tipo: "select", opzioni: FIGURA_PROFESSIONALE_OPTIONS, obbligatorio: true},
		{id: "categoria", etichetta: "Categoria del campionato", tipo: "select", opzioni: CATEGORIA_OPTIONS, obbligatorio: true},
		{id: "esperienza_richiesta", etichetta: "Esperienza richiesta", tipo: "text", placeholder: "Es. almeno 2 stagioni in prima categoria", obbligatorio: false},
		{id: "descrizione", etichetta: "Descrivi cosa cerca la squadra", tipo: "textarea", obbligatorio: false},
	],

	squadra__cerca_amichevoli: [
		{id: "sport", etichetta: "Sport", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{id: "categoria", etichetta: "Categoria", tipo: "select", opzioni: CATEGORIA_OPTIONS, obbligatorio: true},
		{id: "data_proposta", etichetta: "Data proposta", tipo: "date", obbligatorio: false},
		{id: "zona_incontro", etichetta: "Zona / città per l'incontro", tipo: "text", obbligatorio: false},
		{id: "descrizione", etichetta: "Note aggiuntive", tipo: "textarea", obbligatorio: false},
	],

	squadra__cerca_sponsor: [
		{id: "sport", etichetta: "Sport", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{
			id: "tipo_sponsorizzazione",
			etichetta: "Tipo di sponsorizzazione ricercata",
			tipo: "select",
			opzioni: [
				{valore: "economica", etichetta: "Contributo economico"},
				{valore: "materiale_tecnico", etichetta: "Materiale tecnico"},
				{valore: "servizi", etichetta: "Servizi"},
			],
			obbligatorio: true,
		},
		{id: "budget_indicativo", etichetta: "Budget indicativo ricercato", tipo: "text", placeholder: "Es. 1000-3000€ a stagione", obbligatorio: false},
		{id: "visibilita_offerta", etichetta: "Visibilità offerta in cambio", tipo: "textarea", placeholder: "Es. logo su maglia, striscioni a bordo campo...", obbligatorio: false},
		{id: "descrizione", etichetta: "Descrizione della ricerca", tipo: "textarea", obbligatorio: false},
	],

	arbitro: [
		{id: "sport", etichetta: "Sport", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{id: "livello_categoria", etichetta: "Livello di competizione", tipo: "text", placeholder: "Es. Regionale, Provinciale...", obbligatorio: true},
		{id: "raggio_spostamento", etichetta: "Raggio di spostamento (km)", tipo: "number", obbligatorio: false},
		{id: "disponibilita", etichetta: "Disponibilità", tipo: "select", opzioni: DISPONIBILITA_OPTIONS, obbligatorio: true},
		{id: "descrizione", etichetta: "Presentati in breve", tipo: "textarea", obbligatorio: false},
	],

	staff: [
		{id: "sport", etichetta: "Sport", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{id: "figura_professionale", etichetta: "Figura professionale", tipo: "select", opzioni: FIGURA_PROFESSIONALE_OPTIONS, obbligatorio: true},
		{id: "categoria_ricercata", etichetta: "Categoria ricercata", tipo: "text", obbligatorio: false},
		{id: "disponibilita", etichetta: "Disponibilità", tipo: "select", opzioni: DISPONIBILITA_OPTIONS, obbligatorio: true},
		{id: "descrizione", etichetta: "Presentati in breve", tipo: "textarea", obbligatorio: false},
	],

	ente_sportivo__open_day: [
		{id: "sport", etichetta: "Sport", tipo: "select", opzioni: SPORT_OPTIONS, obbligatorio: true},
		{
			id: "tipo_evento",
			etichetta: "Tipo di evento",
			tipo: "select",
			opzioni: [
				{valore: "open_day", etichetta: "OpenDay"},
				{valore: "allenamento_libero", etichetta: "Allenamento libero"},
				{valore: "evento", etichetta: "Evento"},
			],
			obbligatorio: true,
		},
		{id: "data_evento", etichetta: "Data dell'evento", tipo: "date", obbligatorio: true},
		{id: "luogo", etichetta: "Indirizzo della struttura", tipo: "text", obbligatorio: true},
		{id: "descrizione", etichetta: "Descrizione dell'evento", tipo: "textarea", obbligatorio: false},
	],

	ente_sportivo__disponibilita_struttura: [
		{
			id: "tipo_struttura",
			etichetta: "Tipo di struttura",
			tipo: "select",
			opzioni: [
				{valore: "campo_calcio", etichetta: "Campo da calcio"},
				{valore: "palestra", etichetta: "Palestra"},
				{valore: "piscina", etichetta: "Piscina"},
				{valore: "campo_tennis", etichetta: "Campo da tennis"},
				{valore: "altro", etichetta: "Altro"},
			],
			obbligatorio: true,
		},
		{id: "indirizzo", etichetta: "Indirizzo", tipo: "text", obbligatorio: true},
		{id: "orari_disponibili", etichetta: "Orari disponibili", tipo: "text", placeholder: "Es. Lun-Ven 18:00-23:00", obbligatorio: true},
		{id: "costo_orario", etichetta: "Costo orario (€)", tipo: "number", placeholder: "Lascia vuoto se gratuito", obbligatorio: false},
		{id: "descrizione", etichetta: "Descrizione della struttura", tipo: "textarea", obbligatorio: false},
	],
};

// ---------------------------------------------------------------------------
// Step 3 — metodi di pagamento
// ---------------------------------------------------------------------------

export interface MetodoPagamento {
	valore: string;
	nome: string;
	descrizione: string;
	icona?: string;
}

export const metodiPagamento: MetodoPagamento[] = [
	{
		valore: "gratuito",
		nome: "Gratuito",
		descrizione: "Pubblica il tuo annuncio senza alcun costo.",
		icona: "Gift",
	},
	{
		valore: "iban",
		nome: "Bonifico IBAN",
		descrizione: "Ricevi le coordinate per il pagamento tramite bonifico bancario.",
		icona: "Landmark",
	},
];
