import {useAnnuncioGiocatoreStore} from "@/features/pubblica-annuncio/state/AnnuncioGiocatore.store";
import {
	formatContatti,
	formatDataNascita,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

export default function RecapAnnuncioGiocatore() {
	const data = useAnnuncioGiocatoreStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli giocatore</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome e cognome">{`${data.nome} ${data.cognome}`.trim() || "—"}</RecapField>
				<RecapField label="Data di nascita">{formatDataNascita(data.giornoNascita, data.meseNascita, data.annoNascita)}</RecapField>
				<RecapField label="Tipologia calcio">{data.tipologieCalcio.join(", ") || "—"}</RecapField>
				<RecapField label="Ruolo principale">{data.ruoliPrincipali.join(", ") || "—"}</RecapField>
				<RegioniRecap regioni={data.regioniInteressate} cittaComuniPerRegione={data.cittaComuniPerRegione} />
				<RecapField label="Contatti pubblici" wide>{formatContatti(data.contatti)}</RecapField>
				{data.foto && <RecapField label="Immagine premium" wide>{data.foto.name}</RecapField>}
				{data.descrizione.trim() !== "" && <RecapField label="Breve descrizione" wide>{data.descrizione}</RecapField>}
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}
