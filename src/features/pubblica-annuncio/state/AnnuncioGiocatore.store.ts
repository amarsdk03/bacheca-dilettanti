import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";

export type AnnuncioGiocatoreData = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	contatti: ContattiAnnuncio;
	biografia: string;
	tipologieCalcio: string[];
	ruoliPrincipali: string[];
	foto: File | null;
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
	biografia: "",
	tipologieCalcio: [],
	ruoliPrincipali: [],
	foto: null,
});

export const useAnnuncioGiocatoreStore = createAnnuncioStore(createInitialState);

export function isAnnuncioGiocatoreValid(data: AnnuncioGiocatoreData) {
	return (
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		data.biografia.length <= 2000
	);
}
