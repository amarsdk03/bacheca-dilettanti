import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";

export type SedePrincipaleSquadra = {
	citta: string;
	cap: string;
	indirizzo: string;
};

export type CercaGiocatoreSquadra = {
	ruoliPrincipali: string[];
	ruoliSpecifici: string[];
	annateCercate: string[];
	requisiti: string;
	periodoDa: string;
	periodoA: string;
};

export type CercaStaffSquadra = {
	figuraCercata: string;
	settore: string;
	compensoMensile: string;
	requisiti: string;
	periodoDa: string;
	periodoA: string;
};

export type CercaAmichevoliSquadra = {
	categorieAvversario: string[];
	periodoDa: string;
	periodoA: string;
	campoIndirizzo: string;
	disponibilitaTrasferta: string;
};

export type CercaSponsorSquadra = {
	categoriaSettore: string;
	supportoRicercato: string;
	cosaOffrite: string;
};

export type AnnuncioSquadraData = {
	nomeSocieta: string;
	linkStemma: string;
	contatti: ContattiAnnuncio;
	sedePrincipale: SedePrincipaleSquadra;
	descrizione: string;
	tipologiaSport: string;
	cercaGiocatore: CercaGiocatoreSquadra;
	cercaStaff: CercaStaffSquadra;
	cercaAmichevoli: CercaAmichevoliSquadra;
	cercaSponsor: CercaSponsorSquadra;
};

export const SEDE_PRINCIPALE_SQUADRA_DEFAULT: SedePrincipaleSquadra = {
	citta: "",
	cap: "",
	indirizzo: "",
};

export const CERCA_GIOCATORE_SQUADRA_DEFAULT: CercaGiocatoreSquadra = {
	ruoliPrincipali: [],
	ruoliSpecifici: [],
	annateCercate: [],
	requisiti: "",
	periodoDa: "",
	periodoA: "",
};

export const CERCA_STAFF_SQUADRA_DEFAULT: CercaStaffSquadra = {
	figuraCercata: "",
	settore: "",
	compensoMensile: "",
	requisiti: "",
	periodoDa: "",
	periodoA: "",
};

export const CERCA_AMICHEVOLI_SQUADRA_DEFAULT: CercaAmichevoliSquadra = {
	categorieAvversario: [],
	periodoDa: "",
	periodoA: "",
	campoIndirizzo: "",
	disponibilitaTrasferta: "",
};

export const CERCA_SPONSOR_SQUADRA_DEFAULT: CercaSponsorSquadra = {
	categoriaSettore: "",
	supportoRicercato: "",
	cosaOffrite: "",
};

const createInitialState = (): AnnuncioSquadraData => ({
	nomeSocieta: "",
	linkStemma: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	sedePrincipale: {...SEDE_PRINCIPALE_SQUADRA_DEFAULT},
	descrizione: "",
	tipologiaSport: "",
	cercaGiocatore: {...CERCA_GIOCATORE_SQUADRA_DEFAULT},
	cercaStaff: {...CERCA_STAFF_SQUADRA_DEFAULT},
	cercaAmichevoli: {...CERCA_AMICHEVOLI_SQUADRA_DEFAULT},
	cercaSponsor: {...CERCA_SPONSOR_SQUADRA_DEFAULT},
});

export const useAnnuncioSquadraStore = createAnnuncioStore(createInitialState);

export function isAnnuncioSquadraValid(data: AnnuncioSquadraData, sottotipologia: string) {
	const profiloValido =
		data.nomeSocieta.trim() !== "" &&
		hasContattoPubblico(data.contatti) &&
		data.tipologiaSport !== "" &&
		data.descrizione.length <= 5000;

	if (!profiloValido) return false;

	switch (sottotipologia) {
		case "cerca-giocatore":
			return data.cercaGiocatore.ruoliPrincipali.length > 0 && data.cercaGiocatore.requisiti.length <= 2000;
		case "cerca-staff":
			return data.cercaStaff.figuraCercata !== "" && data.cercaStaff.requisiti.length <= 2000;
		case "cerca-partite-amichevoli":
			return data.cercaAmichevoli.categorieAvversario.length > 0;
		case "cerca-sponsor":
			return (
				data.cercaSponsor.categoriaSettore.trim() !== "" &&
				data.cercaSponsor.supportoRicercato.trim() !== "" &&
				data.cercaSponsor.cosaOffrite.trim() !== ""
			);
		default:
			return false;
	}
}
