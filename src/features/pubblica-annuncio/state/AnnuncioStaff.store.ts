import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import type {EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";

export type AnnuncioStaffData = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	contatti: ContattiAnnuncio;
	tipologieCalcio: string[];
	figureProfessionali: string[];
	categorieRicercate: string[];
	presentazioneInformazioniAggiuntive: string;
	esperienze: EsperienzaAnnuncio[];
	disponibilitaSpostamento: string;
	immagineAnnuncio: File | null;
	linkAnnuncio: string;
};

const createInitialState = (): AnnuncioStaffData => ({
	nome: "",
	cognome: "",
	giornoNascita: "",
	meseNascita: "",
	annoNascita: "",
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	tipologieCalcio: [],
	figureProfessionali: [],
	categorieRicercate: [],
	presentazioneInformazioniAggiuntive: "",
	esperienze: [],
	disponibilitaSpostamento: "",
	immagineAnnuncio: null,
	linkAnnuncio: "",
});

export const useAnnuncioStaffStore = createAnnuncioStore(createInitialState);

export function isAnnuncioStaffValid(data: AnnuncioStaffData) {
	return (
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		data.figureProfessionali.length > 0 &&
		data.presentazioneInformazioniAggiuntive.length <= 2000 &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
