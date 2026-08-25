import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export type AnnuncioAziendeEntiData = {
	nomeRagioneSociale: string;
	tipologiaAttivita: string;
	contatti: ContattiAnnuncio;
	serviziOfferti: string;
	sede: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	categorieDestinatarie: string;
	esperienzaPresentazione: string;
	qualificheCertificazioni: string;
	infoAggiuntive: string;
	immagineAnnuncio: File | null;
	linkAnnuncio: string;
};

const createInitialState = (): AnnuncioAziendeEntiData => ({
	nomeRagioneSociale: "",
	tipologiaAttivita: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	serviziOfferti: "",
	sede: "",
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	categorieDestinatarie: "",
	esperienzaPresentazione: "",
	qualificheCertificazioni: "",
	infoAggiuntive: "",
	immagineAnnuncio: null,
	linkAnnuncio: "",
});

export const useAnnuncioAziendeEntiStore = createAnnuncioStore(createInitialState);

const TESTI_MAX = [
	"serviziOfferti",
	"categorieDestinatarie",
	"esperienzaPresentazione",
	"qualificheCertificazioni",
	"infoAggiuntive",
] as const;

export function isAnnuncioAziendeEntiValid(data: AnnuncioAziendeEntiData) {
	return (
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		TESTI_MAX.every((campo) => data[campo].length <= 2000) &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
