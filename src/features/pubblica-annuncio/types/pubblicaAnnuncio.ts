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
		nome: "Staff",
		valore: "staff",
		icona: "Briefcase",
		descrizione: "Registra le tue competenze professionali nel mondo dello sport",
	},
	{
		nome: "Società / Ente sportivo",
		valore: "societa-ente-sportivo",
		icona: "DoorOpen",
		descrizione: "Organizza e promuovi i tuoi OpenDay, eventi o allenamenti sportivi",
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
