import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";

export type EventoSocietaEnte = {
	periodoDa: string;
	periodoA: string;
	orario: string;
	tipologieCalcio: string[];
	descrizioneEvento: string;
	modalitaIscrizioneRequisiti: string;
	scadenzaIscrizioni: string;
	annateAmmesse: string[];
	livelloIndicativo: string;
	partecipazione: string;
	costoPartecipazione: string;
	postiDisponibili: string;
};

export type AnnuncioSocietaEnteData = {
	nomeEnte: string;
	indirizzo: string;
	presentazione: string;
	contatti: ContattiAnnuncio;
	evento: EventoSocietaEnte;
};

export const EVENTO_SOCIETA_ENTE_DEFAULT: EventoSocietaEnte = {
	periodoDa: "",
	periodoA: "",
	orario: "",
	tipologieCalcio: [],
	descrizioneEvento: "",
	modalitaIscrizioneRequisiti: "",
	scadenzaIscrizioni: "",
	annateAmmesse: [],
	livelloIndicativo: "",
	partecipazione: "",
	costoPartecipazione: "",
	postiDisponibili: "",
};

const createInitialState = (): AnnuncioSocietaEnteData => ({
	nomeEnte: "",
	indirizzo: "",
	presentazione: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	evento: {...EVENTO_SOCIETA_ENTE_DEFAULT, tipologieCalcio: [], annateAmmesse: []},
});

export const useAnnuncioSocietaEnteStore = createAnnuncioStore(createInitialState);

export function isAnnuncioSocietaEnteValid(data: AnnuncioSocietaEnteData) {
	return (
		data.nomeEnte.trim() !== "" &&
		hasContattoPubblico(data.contatti) &&
		data.presentazione.length <= 5000 &&
		data.evento.descrizioneEvento.length <= 5000 &&
		data.evento.modalitaIscrizioneRequisiti.length <= 2000 &&
		data.evento.livelloIndicativo.length <= 2000
	);
}
