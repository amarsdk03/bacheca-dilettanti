import type {
	AnnouncementFactKind,
	AnnouncementType,
} from "@/features/annunci/announcement-model";

export interface AnnouncementDetailPresentation {
	intro: string;
	summary: string;
	narrativeTitle: string;
	emptyNarrative: string;
	detailsTitle: string;
	primaryFactKinds: readonly AnnouncementFactKind[];
	detailFieldLabels: readonly string[];
}

export const ANNOUNCEMENT_DETAIL_PRESENTATIONS = {
	annuncio_giocatore: {
		intro: "Un giocatore disponibile per una nuova opportunità sportiva.",
		summary: "Ruoli, categorie e tipologie cercate.",
		narrativeTitle: "La ricerca del giocatore",
		emptyNarrative: "Il giocatore non ha aggiunto una presentazione all’annuncio.",
		detailsTitle: "Preferenze sportive",
		primaryFactKinds: ["roles", "types", "categories", "location"],
		detailFieldLabels: [],
	},
	annuncio_squadra_cerca_giocatore: {
		intro: "Una squadra è alla ricerca di un nuovo giocatore.",
		summary: "Ruolo, annate e stagione richiesti.",
		narrativeTitle: "La ricerca della squadra",
		emptyNarrative: "La squadra non ha aggiunto ulteriori dettagli alla ricerca.",
		detailsTitle: "Requisiti del giocatore",
		primaryFactKinds: ["roles", "categories", "season", "location"],
		detailFieldLabels: ["Ruoli secondari", "Tipologie"],
	},
	annuncio_squadra_cerca_staff: {
		intro: "Una squadra cerca una figura per il proprio staff.",
		summary: "Ruolo, settore e condizioni dell’incarico.",
		narrativeTitle: "L’incarico proposto",
		emptyNarrative: "La squadra non ha aggiunto una descrizione dell’incarico.",
		detailsTitle: "Requisiti e condizioni",
		primaryFactKinds: ["figures", "sector", "compensation", "location"],
		detailFieldLabels: ["Periodo", "Requisiti"],
	},
	annuncio_squadra_cerca_partita: {
		intro: "Una squadra cerca un avversario per una partita o un’amichevole.",
		summary: "Categorie, periodo e disponibilità alla trasferta.",
		narrativeTitle: "La partita cercata",
		emptyNarrative: "La squadra non ha aggiunto ulteriori informazioni sulla partita.",
		detailsTitle: "Organizzazione della partita",
		primaryFactKinds: ["categories", "period", "availability", "location"],
		detailFieldLabels: ["Orario"],
	},
	annuncio_squadra_cerca_sponsor: {
		intro: "Una squadra cerca un partner o uno sponsor.",
		summary: "Settore, supporto richiesto e proposta di collaborazione.",
		narrativeTitle: "La collaborazione proposta",
		emptyNarrative: "La squadra non ha aggiunto una presentazione della collaborazione.",
		detailsTitle: "Dettagli della proposta",
		primaryFactKinds: ["sector", "services", "location"],
		detailFieldLabels: [],
	},
	annuncio_staff_sportivo: {
		intro: "Un professionista dello staff è disponibile per un nuovo incarico.",
		summary: "Competenze, categorie e disponibilità agli spostamenti.",
		narrativeTitle: "La disponibilità professionale",
		emptyNarrative: "Questo professionista non ha aggiunto una presentazione all’annuncio.",
		detailsTitle: "Competenze e disponibilità",
		primaryFactKinds: ["figures", "categories", "availability", "location"],
		detailFieldLabels: ["Tipologie", "Disponibilità lavorativa"],
	},
	annuncio_arbitro: {
		intro: "Un arbitro è disponibile per partite, tornei ed eventi.",
		summary: "Categorie, disponibilità e possibilità di spostamento.",
		narrativeTitle: "La disponibilità arbitrale",
		emptyNarrative: "L’arbitro non ha aggiunto una presentazione all’annuncio.",
		detailsTitle: "Disponibilità e spostamenti",
		primaryFactKinds: ["categories", "availability", "car", "location"],
		detailFieldLabels: ["Tipologie", "Disponibilità agli spostamenti"],
	},
	annuncio_torneo_evento: {
		intro: "Un torneo o evento aperto alle partecipazioni.",
		summary: "Modalità di iscrizione, partecipazione e costo.",
		narrativeTitle: "Il torneo o evento",
		emptyNarrative: "L’organizzazione non ha aggiunto una presentazione dell’evento.",
		detailsTitle: "Iscrizione e partecipazione",
		primaryFactKinds: ["registration", "participation", "price", "location"],
		detailFieldLabels: ["Tipologie", "Annate ammesse", "Numero di squadre", "Premi e trofei"],
	},
	annuncio_campo_impianto: {
		intro: "Un campo o impianto disponibile per attività sportive.",
		summary: "Tipologie, costo e servizi inclusi.",
		narrativeTitle: "Lo spazio disponibile",
		emptyNarrative: "Il gestore non ha aggiunto una presentazione dell’impianto.",
		detailsTitle: "Servizi e condizioni",
		primaryFactKinds: ["types", "price", "services", "location"],
		detailFieldLabels: ["Orari"],
	},
} as const satisfies Record<AnnouncementType, AnnouncementDetailPresentation>;

export function isSpecifiedAnnouncementValue(value: string) {
	return value.trim().length > 0 && value !== "Non specificato";
}
