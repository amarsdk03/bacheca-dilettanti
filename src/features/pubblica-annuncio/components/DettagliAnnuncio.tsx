import AnnuncioArbitro from "@/features/pubblica-annuncio/components/AnnuncioArbitro";
import AnnuncioCampoImpianto from "@/features/pubblica-annuncio/components/AnnuncioCampoImpianto";
import AnnuncioGiocatore from "@/features/pubblica-annuncio/components/AnnuncioGiocatore";
import AnnuncioNuovaTipologia from "@/features/pubblica-annuncio/components/AnnuncioNuovaTipologia";
import AnnuncioSquadra from "@/features/pubblica-annuncio/components/AnnuncioSquadra";
import AnnuncioStaff from "@/features/pubblica-annuncio/components/AnnuncioStaff";

export default function DettagliAnnuncio({tipologia, sottotipologia}: {tipologia: string; sottotipologia: string}) {
	switch (tipologia) {
		case "giocatore":
			return <AnnuncioGiocatore />;
		case "squadra":
			return <AnnuncioSquadra sottotipologia={sottotipologia} />;
		case "arbitro":
			return <AnnuncioArbitro />;
		case "staff-sportivo":
			return <AnnuncioStaff />;
		case "aziende-enti":
		case "professionisti-studi":
		case "torneo-evento":
			return <AnnuncioNuovaTipologia tipologia={tipologia} />;
		case "campo-impianto-sportivo":
			return <AnnuncioCampoImpianto />;
		default:
			return null;
	}
}
