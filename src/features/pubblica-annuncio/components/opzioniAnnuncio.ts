export const TIPOLOGIA_CALCIO_OPTIONS = [
	{valore: null, etichetta: "Non specificare"},
	{valore: "Calcio a 11", etichetta: "Calcio a 11"},
	{valore: "Calcio a 7", etichetta: "Calcio a 7"},
	{valore: "Calcio a 5", etichetta: "Calcio a 5"},
] as const;

export const RUOLO_PRINCIPALE_OPTIONS = [
	{valore: null, etichetta: "Non specificare"},
	{valore: "Portiere", etichetta: "Portiere"},
	{valore: "Difensore", etichetta: "Difensore"},
	{valore: "Centrocampista", etichetta: "Centrocampista"},
	{valore: "Attaccante", etichetta: "Attaccante"},
] as const;

export const FIGURA_PROFESSIONALE_OPTIONS = [
	"Analisi",
	"Coaching/Preparatore",
	"Osservatore/Scouting",
	"Esecutivo/Amministrativo",
	"Manutenzione/Infrastruttura",
	"HR",
	"Fisioterapia/Medicina sportiva",
	"Commerciale/Business",
	"Educativo/Sociale",
	"Media/Design",
	"Altro",
] as const;

export const CATEGORIA_RICERCATA_OPTIONS = [
	{valore: null, etichetta: "Non specificare"},
	{valore: "Calcio professionistico", etichetta: "Calcio professionistico"},
	{valore: "Serie A", etichetta: "Serie A"},
	{valore: "Serie B", etichetta: "Serie B"},
	{valore: "Serie C", etichetta: "Serie C"},
	{valore: "Serie D", etichetta: "Serie D"},
	{valore: "Eccellenza", etichetta: "Eccellenza"},
	{valore: "Promozione", etichetta: "Promozione"},
	{valore: "Prima Categoria", etichetta: "Prima Categoria"},
	{valore: "Seconda Categoria", etichetta: "Seconda Categoria"},
	{valore: "Terza Categoria", etichetta: "Terza Categoria"},
	{valore: "Settore giovanile", etichetta: "Settore giovanile"},
	{valore: "Calcio femminile", etichetta: "Calcio femminile"},
	{valore: "Calcio a 5", etichetta: "Calcio a 5"},
	{valore: "Calcio amatoriale", etichetta: "Calcio amatoriale"},
	{valore: "Altro", etichetta: "Altro"},
] as const;

export const DISPONIBILITA_SPOSTAMENTO_OPTIONS = [
	{valore: null, etichetta: "Non specificare"},
	{valore: "Si", etichetta: "Si"},
	{valore: "No", etichetta: "No"},
] as const;

export const PARTECIPAZIONE_EVENTO_OPTIONS = [
	{valore: null, etichetta: "Non specificata"},
	{valore: "Libera", etichetta: "Libera"},
	{valore: "Su prenotazione", etichetta: "Su prenotazione"},
	{valore: "Privata", etichetta: "Privata"},
] as const;
