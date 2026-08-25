"use client";

import {FieldDescription, FieldGroup, FieldLegend, FieldSet} from "@/components/ui/field";
import AnnuncioTextField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextField";
import AnnuncioTextareaField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextareaField";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import ImmagineAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioPremiumField";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {useAnnuncioAziendeEntiStore} from "@/features/pubblica-annuncio/state/AnnuncioAziendeEnti.store";

export default function AnnuncioAziendeEnti() {
	const data = useAnnuncioAziendeEntiStore();

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Dati azienda / ente</FieldLegend>
					<FieldDescription>Presenta l&apos;attività, i servizi e le realtà sportive a cui ti rivolgi.</FieldDescription>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<AnnuncioTextField id="aziende-enti-nome-ragione-sociale" label="Nome / ragione sociale" value={data.nomeRagioneSociale} onValueChange={(value) => data.setField("nomeRagioneSociale", value)} placeholder="Azienda o ente" />
					<AnnuncioTextField id="aziende-enti-tipologia-attivita" label="Tipologia di attività" value={data.tipologiaAttivita} onValueChange={(value) => data.setField("tipologiaAttivita", value)} placeholder="Formazione, consulenza, servizi..." />
					<AnnuncioTextField id="aziende-enti-sede" label="Sede" value={data.sede} onValueChange={(value) => data.setField("sede", value)} placeholder="Città o indirizzo della sede" />
				</div>
				<AnnuncioTextareaField id="aziende-enti-servizi-offerti" label="Servizi offerti" value={data.serviziOfferti} onValueChange={(value) => data.setField("serviziOfferti", value)} placeholder="Descrivi i servizi disponibili..." />
			</FieldSet>

			<ContattiAnnuncioFields contatti={data.contatti} setContatti={(value) => data.setField("contatti", value)} />
			<RegioniInteresseField idPrefix="aziende-enti-regioni-interessate" regioniInteressate={data.regioniInteressate} setRegioniInteressate={(value) => data.setField("regioniInteressate", value)} cittaComuniPerRegione={data.cittaComuniPerRegione} setCittaComuniPerRegione={(value) => data.setField("cittaComuniPerRegione", value)} />

			<FieldSet>
				<div className="mt-4"><FieldLegend variant="label" className="field-legend-title mb-0">Presentazione e destinatari</FieldLegend></div>
				<AnnuncioTextareaField id="aziende-enti-categorie-destinatarie" label="Categorie / realtà a cui si rivolge" value={data.categorieDestinatarie} onValueChange={(value) => data.setField("categorieDestinatarie", value)} placeholder="Settori giovanili, prime squadre, società, atleti..." />
				<AnnuncioTextareaField id="aziende-enti-esperienza-presentazione" label="Esperienza / presentazione" value={data.esperienzaPresentazione} onValueChange={(value) => data.setField("esperienzaPresentazione", value)} placeholder="Racconta l'esperienza e presenta la realtà..." />
				<AnnuncioTextareaField id="aziende-enti-qualifiche-certificazioni" label="Qualifiche / certificazioni" value={data.qualificheCertificazioni} onValueChange={(value) => data.setField("qualificheCertificazioni", value)} placeholder="Certificazioni, accreditamenti, qualifiche..." />
				<AnnuncioTextareaField id="aziende-enti-info-aggiuntive" label="Descrizione / info aggiuntive" value={data.infoAggiuntive} onValueChange={(value) => data.setField("infoAggiuntive", value)} placeholder="Aggiungi eventuali altre informazioni..." />
				<ImmagineAnnuncioPremiumField idPrefix="aziende-enti" tipologia="aziende-enti" value={data.immagineAnnuncio} onValueChange={(value) => data.setField("immagineAnnuncio", value)} />
				<LinkAnnuncioPremiumField idPrefix="aziende-enti" tipologia="aziende-enti" value={data.linkAnnuncio} onValueChange={(value) => data.setField("linkAnnuncio", value)} />
			</FieldSet>
		</FieldGroup>
	);
}
