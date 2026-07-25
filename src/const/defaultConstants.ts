export const DEFAULT_LOGO_PATH = "/logo.png";
export const DEFAULT_LOGO_TRANSPARENT_PATH = "/logo_transparent.png";

export type Regione = {nome: string; area: "Nord" | "Centro" | "Sud"};

export const REGIONI_ITALIANE: Regione[] = [
	{nome: "Abruzzo", area: "Centro"},
	{nome: "Basilicata", area: "Sud"},
	{nome: "Calabria", area: "Sud"},
	{nome: "Campania", area: "Sud"},
	{nome: "Emilia-Romagna", area: "Nord"},
	{nome: "Friuli-Venezia Giulia", area: "Nord"},
	{nome: "Lazio", area: "Centro"},
	{nome: "Liguria", area: "Nord"},
	{nome: "Lombardia", area: "Nord"},
	{nome: "Marche", area: "Centro"},
	{nome: "Molise", area: "Sud"},
	{nome: "Piemonte", area: "Nord"},
	{nome: "Puglia", area: "Sud"},
	{nome: "Sardegna", area: "Sud"},
	{nome: "Sicilia", area: "Sud"},
	{nome: "Toscana", area: "Centro"},
	{nome: "Trentino-Alto Adige", area: "Nord"},
	{nome: "Umbria", area: "Centro"},
	{nome: "Valle d'Aosta", area: "Nord"},
	{nome: "Veneto", area: "Nord"},
];