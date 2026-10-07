import type {AnnouncementFactKind, AnnouncementType,} from "@/features/annunci/announcement-model";

export interface AnnouncementDetailPresentation {
	intro: string;
	summary: string;
	narrativeTitle: string;
	emptyNarrative: string;
	detailsTitle: string;
	heroFactKinds: readonly AnnouncementFactKind[];
	detailFieldLabels: readonly string[];
}

export const ANNOUNCEMENT_DETAIL_PRESENTATIONS = {
	annuncio_giocatore: {
		intro: "Un giocatore disponibile per una nuova opportunità sportiva.",
		summary: "Ruoli, categorie e tipologie cercate.",
		narrativeTitle: "La ricerca del giocatore",
		emptyNarrative: "Il giocatore non ha aggiunto una presentazione all’annuncio.",
		detailsTitle: "Preferenze sportive",
		heroFactKinds: ["roles", "types", "categories"],
		detailFieldLabels: [],
	},
	annuncio_squadra_cerca_giocatore: {
		intro: "Una squadra è alla ricerca di un nuovo giocatore.",
		summary: "Ruolo, annate e stagione richiesti.",
		narrativeTitle: "La ricerca della squadra",
		emptyNarrative: "La squadra non ha aggiunto ulteriori dettagli alla ricerca.",
		detailsTitle: "Requisiti del giocatore",
		heroFactKinds: ["roles", "categories"],
		detailFieldLabels: ["Gruppo squadra", "Ruoli specifici", "Tipologie", "Stagione"],
	},
	annuncio_squadra_cerca_staff: {
		intro: "Una squadra cerca figure per il proprio staff.",
		summary: "Ruolo, gruppo squadra e condizioni dell’incarico.",
		narrativeTitle: "L’incarico proposto",
		emptyNarrative: "La squadra non ha aggiunto una descrizione dell’incarico.",
		detailsTitle: "Requisiti e condizioni",
		heroFactKinds: ["figures", "compensation"],
		detailFieldLabels: ["Gruppo squadra", "Stagione", "Requisiti"],
	},
	annuncio_squadra_cerca_partita: {
		intro: "Una squadra cerca avversarie per partite o amichevoli.",
		summary: "Categoria avversario, periodo e disponibilità alla trasferta.",
		narrativeTitle: "La partita cercata",
		emptyNarrative: "La squadra non ha aggiunto ulteriori informazioni sulla partita.",
		detailsTitle: "Organizzazione della partita",
		heroFactKinds: ["categories", "period"],
		detailFieldLabels: ["Gruppo squadra", "Disponibilità alla trasferta", "Orario"],
	},
	annuncio_squadra_cerca_sponsor: {
		intro: "Una squadra cerca un partner o uno sponsor.",
		summary: "Settore e visibilità offerta.",
		narrativeTitle: "La collaborazione proposta",
		emptyNarrative: "La squadra non ha aggiunto una presentazione della collaborazione.",
		detailsTitle: "Dettagli della proposta",
		heroFactKinds: ["sector"],
		detailFieldLabels: [],
	},
	annuncio_staff_sportivo: {
		intro: "Un professionista dello staff è disponibile per un nuovo incarico.",
		summary: "Competenze, categorie e disponibilità agli spostamenti.",
		narrativeTitle: "La disponibilità professionale",
		emptyNarrative: "Questo professionista non ha aggiunto una presentazione all’annuncio.",
		detailsTitle: "Competenze e disponibilità",
		heroFactKinds: ["figures", "categories"],
		detailFieldLabels: ["Tipologie", "Disponibilità lavorativa", "Disponibilità agli spostamenti"],
	},
	annuncio_arbitro: {
		intro: "Un arbitro è disponibile per partite, tornei ed eventi.",
		summary: "Disponibilità e possibilità di spostamento.",
		narrativeTitle: "La disponibilità arbitrale",
		emptyNarrative: "L’arbitro non ha aggiunto una presentazione all’annuncio.",
		detailsTitle: "Disponibilità e spostamenti",
		heroFactKinds: ["availability"],
		detailFieldLabels: ["Tipologie", "Disponibilità agli spostamenti", "Automunito"],
	},
	annuncio_torneo_evento: {
		intro: "Un torneo o evento aperto alle partecipazioni.",
		summary: "Modalità di iscrizione, partecipazione e costo.",
		narrativeTitle: "Il torneo o evento",
		emptyNarrative: "L’organizzazione non ha aggiunto una presentazione dell’evento.",
		detailsTitle: "Iscrizione e partecipazione",
		heroFactKinds: ["registration", "price"],
		detailFieldLabels: ["Tipologie", "Annate ammesse", "Numero di squadre", "Premi e trofei"],
	},
	annuncio_campo_impianto: {
		intro: "Un campo o impianto disponibile per attività sportive.",
		summary: "Tipologie e costo del campo.",
		narrativeTitle: "Lo spazio disponibile",
		emptyNarrative: "Il gestore non ha aggiunto una presentazione dell’impianto.",
		detailsTitle: "Informazioni del campo",
		heroFactKinds: ["types", "price"],
		detailFieldLabels: [],
	},
	annuncio_servizi_consulenze: {
		intro: "Un servizio o una consulenza dedicati al mondo del calcio.",
		summary: "Servizi e competenze offerti alla community.",
		narrativeTitle: "Il servizio offerto",
		emptyNarrative: "L’autore non ha aggiunto una descrizione del servizio.",
		detailsTitle: "Competenze e servizi",
		heroFactKinds: ["figures", "specializations"],
		detailFieldLabels: ["Tipologie", "Contenuto", "Promozione/offerta per la Community"],
	},
	annuncio_creators: {
		intro: "Un creator digitale della community online.",
		summary: "Contenuti, collaborazioni e opportunità proposte da un creator.",
		narrativeTitle: "Contenuto dell’annuncio",
		emptyNarrative: "Il creator non ha aggiunto una descrizione all’annuncio.",
		detailsTitle: "Informazioni",
		heroFactKinds: [],
		detailFieldLabels: ["Contenuto dell’annuncio"],
	}
} as const satisfies Record<AnnouncementType, AnnouncementDetailPresentation>;

export function isSpecifiedAnnouncementValue(value: string) {
	return value.trim().length > 0 && value !== "Non specificato";
}
