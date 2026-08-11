import {useAnnuncioStaffStore} from "@/features/pubblica-annuncio/state/AnnuncioStaff.store";
import {
	EsperienzeRecap,
	formatDataNascita,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

export default function RecapAnnuncioStaff() {
	const data = useAnnuncioStaffStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli staff</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome e cognome">{`${data.nome} ${data.cognome}`.trim() || "—"}</RecapField>
				<RecapField label="Data di nascita">{formatDataNascita(data.giornoNascita, data.meseNascita, data.annoNascita)}</RecapField>
				<RecapField label="Tipologia calcio">{data.tipologieCalcio.join(", ") || "—"}</RecapField>
				<RecapField label="Figura professionale">{data.figureProfessionali.join(", ") || "—"}</RecapField>
				<RecapField label="Categorie ricercate">{data.categorieRicercate.join(", ") || "—"}</RecapField>
				<RecapField label="Disponibilità spostamento">{data.disponibilitaSpostamento || "Non specificato"}</RecapField>
				<RegioniRecap regioni={data.regioniInteressate} cittaComuniPerRegione={data.cittaComuniPerRegione} />
				{data.presentazioneInformazioniAggiuntive.trim() !== "" && (
					<RecapField label="Breve presentazione / informazioni aggiuntive" wide>
						{data.presentazioneInformazioniAggiuntive}
					</RecapField>
				)}
				<EsperienzeRecap esperienze={data.esperienze} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}
