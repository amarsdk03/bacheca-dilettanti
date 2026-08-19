import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";

export type DisponibilitaCampoImpianto = {
	orario: string;
	costoOrario: string;
	serviziInclusi: string;
};

export type AnnuncioCampoImpiantoData = {
	nomeImpianto: string;
	indirizzo: string;
	presentazione: string;
	contatti: ContattiAnnuncio;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	disponibilita: DisponibilitaCampoImpianto;
	immagineAnnuncio: File | null;
	linkAnnuncio: string;
};

export const DISPONIBILITA_CAMPO_IMPIANTO_DEFAULT: DisponibilitaCampoImpianto = {
	orario: "",
	costoOrario: "",
	serviziInclusi: "",
};

const createInitialState = (): AnnuncioCampoImpiantoData => ({
	nomeImpianto: "",
	indirizzo: "",
	presentazione: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	disponibilita: {...DISPONIBILITA_CAMPO_IMPIANTO_DEFAULT},
	immagineAnnuncio: null,
	linkAnnuncio: "",
});

export const useAnnuncioCampoImpiantoStore = createAnnuncioStore(createInitialState);

export function isAnnuncioCampoImpiantoValid(data: AnnuncioCampoImpiantoData) {
	return (
		hasContattoPubblico(data.contatti) &&
		data.regioniInteressate.length > 0 &&
		data.presentazione.length <= 5000 &&
		data.disponibilita.serviziInclusi.length <= 2000 &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
