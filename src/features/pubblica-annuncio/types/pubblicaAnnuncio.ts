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

export const TIPOLOGIA_CALCIO_OPTIONS = ["Calcio a 11", "Calcio a 8", "Calcio a 7", "Calcio a 5"] as const;

export type DisponibilitaProfilo = "non-specificare" | "disponibile-subito" | "sotto-contratto";
export const DISPONIBILITA_PROFILO_OPTIONS: readonly {
	valore: DisponibilitaProfilo;
	etichetta: string;
}[] = [
	{valore: "non-specificare", etichetta: "Non specificare"},
	{valore: "disponibile-subito", etichetta: "Disponibile subito"},
	{valore: "sotto-contratto", etichetta: "Al momento sotto contratto"},
];

export const TIPOLOGIA_PRINCIPALE_SQUADRA_OPTIONS = TIPOLOGIA_CALCIO_OPTIONS.map((tipologia) => ({
	valore: tipologia,
	etichetta: tipologia,
}));

import {PLAYER_PRIMARY_ROLES, PLAYER_SPECIFIC_ROLES_BY_PRIMARY,} from "@/features/profilo/player-roles";

export const RUOLO_PRINCIPALE_OPTIONS = PLAYER_PRIMARY_ROLES;
export const RUOLI_SPECIFICI_PER_RUOLO: Readonly<Record<string, readonly string[]>> = PLAYER_SPECIFIC_ROLES_BY_PRIMARY;

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
const CURRENT_YEAR = new Date().getFullYear();
export const ANNATE_OPTIONS = Array.from({length: CURRENT_YEAR - 1900 + 1}, (_, index) => String(CURRENT_YEAR - index));
export const ANNI_NASCITA_OPTIONS = ANNATE_OPTIONS;

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

export const tipologieAnnuncio: TipologiaAnnuncio[] = [
	{
		nome: "Giocatore",
		valore: "giocatore",
		icona: "User",
		descrizione: "Cerchi squadra o una nuova opportunità? Pubblica il tuo annuncio.",
	},
	{
		nome: "Squadra",
		valore: "squadra",
		icona: "Award",
		descrizione: "Cerca giocatori, membri dello staff, o altre figure per la tua squadra.",
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
		descrizione: "Cerchi una squadra o una nuova collaborazione? Pubblica il tuo annuncio.",
	},
	{
		nome: "Arbitro",
		valore: "arbitro",
		icona: "ClipboardList",
		descrizione: "Cerca opportunità e renditi disponibile per partite ed eventi.",
	},
	{
		nome: "Torneo / Evento",
		valore: "torneo-evento",
		icona: "Trophy",
		descrizione: "Promuovi tornei, eventi e iniziative dedicate al calcio.",
	},
	{
		nome: "Campi e impianti",
		valore: "campi-impianti-sportivi",
		icona: "TrafficCone",
		descrizione: "Promuovi il tuo impianto e le disponibilità dei tuoi spazi.",
	},
	{
		nome: "Professionisti e studi",
		valore: "professionisti-studi",
		icona: "BriefcaseBusiness",
		descrizione: "Promuovi servizi e opportunità dedicate ai giocatori, staff e società.",
	},
	{
		nome: "Creators",
		valore: "creators",
		icona: "Sparkles",
		descrizione: "Condividi progetti, collaborazioni e opportunità con la community.",
	},
];

export function getTipologia(valore: string) {
	return tipologieAnnuncio.find((tipologia) => tipologia.valore === valore);
}
