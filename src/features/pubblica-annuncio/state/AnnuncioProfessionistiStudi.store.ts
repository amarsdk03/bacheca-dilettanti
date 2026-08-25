import {
	CONTATTI_ANNUNCIO_DEFAULT,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import type {CittaComuniPerRegione} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {createAnnuncioStore} from "@/features/pubblica-annuncio/state/createAnnuncioStore";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

export type AnnuncioProfessionistiStudiData = {
	nome: string;
	cognome: string;
	figuraProfessionale: string;
	contatti: ContattiAnnuncio;
	specializzazione: string;
	serviziOfferti: string;
	modalitaServizio: string;
	regioniInteressate: string[];
	cittaComuniPerRegione: CittaComuniPerRegione;
	categorieDestinatarie: string;
	qualificheTitoliAbilitazioni: string;
	esperienza: string;
	disponibilitaSpostamenti: string;
	infoAggiuntive: string;
	immagineAnnuncio: File | null;
	linkAnnuncio: string;
};

const createInitialState = (): AnnuncioProfessionistiStudiData => ({
	nome: "",
	cognome: "",
	figuraProfessionale: "",
	contatti: {...CONTATTI_ANNUNCIO_DEFAULT},
	specializzazione: "",
	serviziOfferti: "",
	modalitaServizio: "",
	regioniInteressate: [],
	cittaComuniPerRegione: {},
	categorieDestinatarie: "",
	qualificheTitoliAbilitazioni: "",
	esperienza: "",
	disponibilitaSpostamenti: "",
	infoAggiuntive: "",
	immagineAnnuncio: null,
	linkAnnuncio: "",
});

export const useAnnuncioProfessionistiStudiStore = createAnnuncioStore(createInitialState);

const TESTI_MAX = [
	"serviziOfferti",
	"categorieDestinatarie",
	"qualificheTitoliAbilitazioni",
	"esperienza",
	"infoAggiuntive",
] as const;

export function isAnnuncioProfessionistiStudiValid(data: AnnuncioProfessionistiStudiData) {
	return (
		data.nome.trim() !== "" &&
		data.cognome.trim() !== "" &&
		data.figuraProfessionale.trim() !== "" &&
		data.regioniInteressate.length > 0 &&
		hasContattoPubblico(data.contatti) &&
		TESTI_MAX.every((campo) => data[campo].length <= 2000) &&
		isLinkAnnuncioValid(data.linkAnnuncio)
	);
}
