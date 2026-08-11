import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export type AnnuncioGiocatoreData = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	contatti: ContattiAnnuncio;
	descrizioneAggiuntiva: string;
	tipologieCalcio: string[];
	ruoliPrincipali: string[];
	ruoliSpecifici: string[];
	foto: File | null;
	linkAnnuncio: string;
};

const createInitialState = (): AnnuncioGiocatoreData => ({
	nome: "",
	cognome: "",
	giornoNascita: "",
	meseNascita: "",
	annoNascita: "",
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	descrizioneAggiuntiva: "",
	tipologieCalcio: [],
	ruoliPrincipali: [],
	ruoliSpecifici: [],
	foto: null,
	linkAnnuncio: "",
});

export const useAnnuncioGiocatoreStore = createAnnuncioStore(createInitialState);

export function isAnnuncioGiocatoreValid(data: AnnuncioGiocatoreData) {
	return (
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		data.descrizioneAggiuntiva.length <= 2000 &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
