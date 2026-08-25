import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export const MAX_PREMI_TROFEI = 20;

export type PremioTrofeo = {
	id: string;
	posto: string;
	titoloPremio: string;
};

export function createPremioTrofeo(): PremioTrofeo {
	const id = globalThis.crypto?.randomUUID?.()
		?? `premio-${Date.now()}-${Math.random().toString(36).slice(2)}`;

	return {id, posto: "", titoloPremio: ""};
}

export type AnnuncioTorneoEventoData = {
	nome: string;
	tipologieCalcio: string[];
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
	premiTrofei: PremioTrofeo[];
	immagineAnnuncio: File | null;
	linkAnnuncio: string;
};

const createInitialState = (): AnnuncioTorneoEventoData => ({
	nome: "",
	tipologieCalcio: [],
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
	premiTrofei: [],
	immagineAnnuncio: null,
	linkAnnuncio: "",
});

export const useAnnuncioTorneoEventoStore = createAnnuncioStore(createInitialState);

export function isAnnuncioTorneoEventoValid(data: AnnuncioTorneoEventoData) {
	const intervalloAnnateValido =
		data.annataDa === "" ||
		data.annataA === "" ||
		Number(data.annataDa) <= Number(data.annataA);
	const premiTrofeiValidi =
		data.premiTrofei.length <= MAX_PREMI_TROFEI &&
		data.premiTrofei.every((premio) => premio.titoloPremio.trim() !== "");

	return (
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		data.infoAggiuntive.length <= 2000 &&
		intervalloAnnateValido &&
		premiTrofeiValidi &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
