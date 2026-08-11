import {useAnnuncioArbitroStore} from "@/features/pubblica-annuncio/state/AnnuncioArbitro.store";
import {
	EsperienzeRecap,
	formatDataNascita,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

export default function RecapAnnuncioArbitro() {
	const data = useAnnuncioArbitroStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli arbitro</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome e cognome">{`${data.nome} ${data.cognome}`.trim() || "—"}</RecapField>
				<RecapField label="Data di nascita">{formatDataNascita(data.giornoNascita, data.meseNascita, data.annoNascita)}</RecapField>
				<RecapField label="Tipologia calcio">{data.tipologieCalcio.join(", ") || "—"}</RecapField>
				<RecapField label="Automunito?">{data.automunito || "Non specificato"}</RecapField>
				<RegioniRecap regioni={data.regioniInteressate} cittaComuniPerRegione={data.cittaComuniPerRegione} />
				{data.presentazioneInformazioniAggiuntive.trim() !== "" && (
					<RecapField label="Presentazione personale / informazioni aggiuntive" wide>
						{data.presentazioneInformazioniAggiuntive}
					</RecapField>
				)}
				<EsperienzeRecap esperienze={data.esperienze} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}
