import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import type {EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export type AnnuncioArbitroData = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	tipologieCalcio: string[];
	presentazioneInformazioniAggiuntive: string;
	esperienze: EsperienzaAnnuncio[];
	automunito: string;
	linkAnnuncio: string;
};

const createInitialState = (): AnnuncioArbitroData => ({
	nome: "",
	cognome: "",
	giornoNascita: "",
	meseNascita: "",
	annoNascita: "",
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	tipologieCalcio: [],
	presentazioneInformazioniAggiuntive: "",
	esperienze: [],
	automunito: "",
	linkAnnuncio: "",
});

export const useAnnuncioArbitroStore = createAnnuncioStore(createInitialState);

export function isAnnuncioArbitroValid(data: AnnuncioArbitroData) {
	return (
		data.regioniInteressate.length > 0 &&
		data.presentazioneInformazioniAggiuntive.length <= 2000 &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
