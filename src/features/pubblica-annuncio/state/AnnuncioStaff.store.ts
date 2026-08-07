import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import type {EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";

export type AnnuncioStaffData = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	tipologieCalcio: string[];
	figureProfessionali: string[];
	presentazione: string;
	esperienze: EsperienzaAnnuncio[];
	categoriaRicercata: string;
	disponibilitaSpostamento: string;
};

const createInitialState = (): AnnuncioStaffData => ({
	nome: "",
	cognome: "",
	giornoNascita: "",
	meseNascita: "",
	annoNascita: "",
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	tipologieCalcio: [],
	figureProfessionali: [],
	presentazione: "",
	esperienze: [],
	categoriaRicercata: "",
	disponibilitaSpostamento: "",
});

export const useAnnuncioStaffStore = createAnnuncioStore(createInitialState);

export function isAnnuncioStaffValid(data: AnnuncioStaffData) {
	return (
		data.regioniInteressate.length > 0 &&
		data.figureProfessionali.length > 0 &&
		data.presentazione.length <= 2000
	);
}
