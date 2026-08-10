import {
	CONTATTI_ANNUNCIO_DEFAULT,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export type TipologiaAnnuncioNuova = "aziende-enti" | "professionisti-studi" | "torneo-evento";

type DatiTerritoriali = {
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
};

export type AnnuncioAziendeEntiData = DatiTerritoriali & {
	nomeRagioneSociale: string;
	tipologiaAttivita: string;
	contatto: string;
	serviziOfferti: string;
	sede: string;
	categorieDestinatarie: string;
	esperienzaPresentazione: string;
	qualificheCertificazioni: string;
	infoAggiuntive: string;
	linkAnnuncio: string;
};

export type AnnuncioProfessionistiStudiData = DatiTerritoriali & {
	nomeCognome: string;
	figuraProfessionale: string;
	contatti: ContattiAnnuncio;
	specializzazione: string;
	serviziOfferti: string;
	modalitaServizio: string;
	categorieDestinatarie: string;
	qualificheTitoliAbilitazioni: string;
	esperienza: string;
	disponibilitaSpostamenti: string;
	infoAggiuntive: string;
	linkAnnuncio: string;
};

export type AnnuncioTorneoEventoData = DatiTerritoriali & {
	nome: string;
	infoAggiuntive: string;
	modalitaIscrizione: string;
	annataDa: string;
	annataA: string;
	numeroPostiSquadre: string;
	costoPartecipazione: string;
	costoPer: string;
	linkAnnuncio: string;
};

const TERRITORIO_DEFAULT: DatiTerritoriali = {
	regioniInteressate: [],
	cittaComuniPerRegione: {},
};

const createAziendeEntiInitialState = (): AnnuncioAziendeEntiData => ({
	...TERRITORIO_DEFAULT,
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	nomeRagioneSociale: "",
	tipologiaAttivita: "",
	contatto: "",
	serviziOfferti: "",
	sede: "",
	categorieDestinatarie: "",
	esperienzaPresentazione: "",
	qualificheCertificazioni: "",
	infoAggiuntive: "",
	linkAnnuncio: "",
});

const createProfessionistiStudiInitialState = (): AnnuncioProfessionistiStudiData => ({
	...TERRITORIO_DEFAULT,
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	nomeCognome: "",
	figuraProfessionale: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	specializzazione: "",
	serviziOfferti: "",
	modalitaServizio: "",
	categorieDestinatarie: "",
	qualificheTitoliAbilitazioni: "",
	esperienza: "",
	disponibilitaSpostamenti: "",
	infoAggiuntive: "",
	linkAnnuncio: "",
});

const createTorneoEventoInitialState = (): AnnuncioTorneoEventoData => ({
	...TERRITORIO_DEFAULT,
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	nome: "",
	infoAggiuntive: "",
	modalitaIscrizione: "",
	annataDa: "",
	annataA: "",
	numeroPostiSquadre: "",
	costoPartecipazione: "",
	costoPer: "squadra",
	linkAnnuncio: "",
});

export const useAnnuncioAziendeEntiStore = createAnnuncioStore(createAziendeEntiInitialState);
export const useAnnuncioProfessionistiStudiStore = createAnnuncioStore(createProfessionistiStudiInitialState);
export const useAnnuncioTorneoEventoStore = createAnnuncioStore(createTorneoEventoInitialState);

const TESTI_AZIENDE_ENTI_MAX = [
	"serviziOfferti",
	"categorieDestinatarie",
	"esperienzaPresentazione",
	"qualificheCertificazioni",
	"infoAggiuntive",
] as const;

export function isAnnuncioAziendeEntiValid(data: AnnuncioAziendeEntiData) {
	return (
		TESTI_AZIENDE_ENTI_MAX.every((campo) => data[campo].length <= 2000) &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}

const TESTI_PROFESSIONISTI_MAX = [
	"serviziOfferti",
	"categorieDestinatarie",
	"qualificheTitoliAbilitazioni",
	"esperienza",
	"infoAggiuntive",
] as const;

export function isAnnuncioProfessionistiStudiValid(data: AnnuncioProfessionistiStudiData) {
	return (
		TESTI_PROFESSIONISTI_MAX.every((campo) => data[campo].length <= 2000) &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}

export function isAnnuncioTorneoEventoValid(data: AnnuncioTorneoEventoData) {
	const intervalloAnnateValido =
		data.annataDa === "" ||
		data.annataA === "" ||
		Number(data.annataDa) <= Number(data.annataA);

	return (
		data.nome.trim() !== "" &&
		data.infoAggiuntive.length <= 2000 &&
		intervalloAnnateValido &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
