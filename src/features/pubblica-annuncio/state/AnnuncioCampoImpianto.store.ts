import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";

export type DisponibilitaCampoImpianto = {
	periodoDa: string;
	periodoA: string;
	orario: string;
	costoOrario: string;
	serviziInclusi: string;
};

export type AnnuncioCampoImpiantoData = {
	nomeImpianto: string;
	indirizzo: string;
	presentazione: string;
	contatti: ContattiAnnuncio;
	disponibilita: DisponibilitaCampoImpianto;
};

export const DISPONIBILITA_CAMPO_IMPIANTO_DEFAULT: DisponibilitaCampoImpianto = {
	periodoDa: "",
	periodoA: "",
	orario: "",
	costoOrario: "",
	serviziInclusi: "",
};

const createInitialState = (): AnnuncioCampoImpiantoData => ({
	nomeImpianto: "",
	indirizzo: "",
	presentazione: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	disponibilita: {...DISPONIBILITA_CAMPO_IMPIANTO_DEFAULT},
});

export const useAnnuncioCampoImpiantoStore = createAnnuncioStore(createInitialState);

export function isAnnuncioCampoImpiantoValid(data: AnnuncioCampoImpiantoData) {
	return (
		data.nomeImpianto.trim() !== "" &&
		hasContattoPubblico(data.contatti) &&
		data.presentazione.length <= 5000 &&
		data.disponibilita.serviziInclusi.length <= 2000
	);
}
