import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export type SedePrincipaleSquadra = {
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
};

export type CercaGiocatoreSquadra = {
	ruoliPrincipali: string[];
	ruoliSpecifici: string[];
	annateCercate: string[];
	requisiti: string;
	stagione: string;
	stagionePersonalizzata: string;
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
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	disponibilitaTrasferta: string;
};

export type CercaSponsorSquadra = {
	categoriaSettore: string;
	supportoRicercato: string;
	cosaOffrite: string;
};

export type AnnuncioSquadraData = {
	nomeSocieta: string;
	contatti: ContattiAnnuncio;
	sedePrincipale: SedePrincipaleSquadra;
	presentazioneAggiuntiva: string;
	tipologiaPrincipale: string;
	cercaGiocatore: CercaGiocatoreSquadra;
	cercaStaff: CercaStaffSquadra;
	cercaAmichevoli: CercaAmichevoliSquadra;
	cercaSponsor: CercaSponsorSquadra;
	linkAnnuncio: string;
};

export const SEDE_PRINCIPALE_SQUADRA_DEFAULT: SedePrincipaleSquadra = {
	regioniInteressate: [],
	cittaComuniPerRegione: {},
};

export const CERCA_GIOCATORE_SQUADRA_DEFAULT: CercaGiocatoreSquadra = {
	ruoliPrincipali: [],
	ruoliSpecifici: [],
	annateCercate: [],
	requisiti: "",
	stagione: "",
	stagionePersonalizzata: "",
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
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	disponibilitaTrasferta: "",
};

export const CERCA_SPONSOR_SQUADRA_DEFAULT: CercaSponsorSquadra = {
	categoriaSettore: "",
	supportoRicercato: "",
	cosaOffrite: "",
};

const createInitialState = (): AnnuncioSquadraData => ({
	nomeSocieta: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	sedePrincipale: {
		...SEDE_PRINCIPALE_SQUADRA_DEFAULT,
		regioniInteressate: [],
		cittaComuniPerRegione: {},
	},
	presentazioneAggiuntiva: "",
	tipologiaPrincipale: "",
	cercaGiocatore: {...CERCA_GIOCATORE_SQUADRA_DEFAULT},
	cercaStaff: {...CERCA_STAFF_SQUADRA_DEFAULT},
	cercaAmichevoli: {
		...CERCA_AMICHEVOLI_SQUADRA_DEFAULT,
		categorieAvversario: [],
		regioniInteressate: [],
		cittaComuniPerRegione: {},
	},
	cercaSponsor: {...CERCA_SPONSOR_SQUADRA_DEFAULT},
	linkAnnuncio: "",
});

export const useAnnuncioSquadraStore = createAnnuncioStore(createInitialState);

export function isAnnuncioSquadraValid(data: AnnuncioSquadraData, sottotipologia: string) {
	const profiloValido =
		hasContattoPubblico(data.contatti) &&
		data.tipologiaPrincipale !== "" &&
		data.presentazioneAggiuntiva.length <= 5000 &&
		isLinkAnnuncioValid(data.linkAnnuncio);

	if (!profiloValido) return false;

	switch (sottotipologia) {
		case "cerca-giocatore":
			return (
				data.cercaGiocatore.ruoliPrincipali.length > 0 &&
				data.cercaGiocatore.requisiti.length <= 2000 &&
				(data.cercaGiocatore.stagione !== "altro" ||
					data.cercaGiocatore.stagionePersonalizzata.trim().length > 0)
			);
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
