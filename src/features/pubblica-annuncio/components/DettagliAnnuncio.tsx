import AnnuncioArbitro from "@/features/pubblica-annuncio/components/AnnuncioArbitro";
import AnnuncioCampoImpianto from "@/features/pubblica-annuncio/components/AnnuncioCampoImpianto";
import AnnuncioGiocatore from "@/features/pubblica-annuncio/components/AnnuncioGiocatore";
import AnnuncioAziendeEnti from "@/features/pubblica-annuncio/components/AnnuncioAziendeEnti";
import AnnuncioProfessionistiStudi from "@/features/pubblica-annuncio/components/AnnuncioProfessionistiStudi";
import AnnuncioTorneoEvento from "@/features/pubblica-annuncio/components/AnnuncioTorneoEvento";
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
			return <AnnuncioAziendeEnti />;
		case "professionisti-studi":
			return <AnnuncioProfessionistiStudi />;
		case "torneo-evento":
			return <AnnuncioTorneoEvento />;
		case "campi-impianti-sportivi":
			return <AnnuncioCampoImpianto />;
		default:
			return null;
	}
}
