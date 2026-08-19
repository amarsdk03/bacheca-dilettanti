import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export type AnnuncioTorneoEventoData = {
	nome: string;
	contatti: ContattiAnnuncio;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	infoAggiuntive: string;
	modalitaIscrizione: string;
	annataDa: string;
	annataA: string;
	numeroSquadre: string;
	costoPartecipazione: string;
	costoPer: string;
	immagineAnnuncio: File | null;
	linkAnnuncio: string;
};

const createInitialState = (): AnnuncioTorneoEventoData => ({
	nome: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	infoAggiuntive: "",
	modalitaIscrizione: "",
	annataDa: "",
	annataA: "",
	numeroSquadre: "",
	costoPartecipazione: "",
	costoPer: "squadra",
	immagineAnnuncio: null,
	linkAnnuncio: "",
});

export const useAnnuncioTorneoEventoStore = createAnnuncioStore(createInitialState);

export function isAnnuncioTorneoEventoValid(data: AnnuncioTorneoEventoData) {
	const intervalloAnnateValido =
		data.annataDa === "" ||
		data.annataA === "" ||
		Number(data.annataDa) <= Number(data.annataA);

	return (
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		data.infoAggiuntive.length <= 2000 &&
		intervalloAnnateValido &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
