import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import type {EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";

export type AnnuncioArbitroData = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	contatti: ContattiAnnuncio;
	tipologieCalcio: string[];
	presentazioneInformazioniAggiuntive: string;
	esperienze: EsperienzaAnnuncio[];
	automunito: string;
	immagineAnnuncio: File | null;
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
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	tipologieCalcio: [],
	presentazioneInformazioniAggiuntive: "",
	esperienze: [],
	automunito: "",
	immagineAnnuncio: null,
	linkAnnuncio: "",
});

export const useAnnuncioArbitroStore = createAnnuncioStore(createInitialState);

export function isAnnuncioArbitroValid(data: AnnuncioArbitroData) {
	return (
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		data.presentazioneInformazioniAggiuntive.length <= 2000 &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
