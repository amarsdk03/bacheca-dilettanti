"use client";

import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import AnnuncioTextField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextField";
import AnnuncioTextareaField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextareaField";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import ImmagineAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioPremiumField";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {useAnnuncioProfessionistiStudiStore} from "@/features/pubblica-annuncio/state/AnnuncioProfessionistiStudi.store";
import {
	DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS,
	MODALITA_SERVIZIO_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export default function AnnuncioProfessionistiStudi() {
	const data = useAnnuncioProfessionistiStudiStore();

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Dati professionista / studio</FieldLegend>
					<FieldDescription>Descrivi la tua figura professionale e i servizi offerti al mondo sportivo.</FieldDescription>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<AnnuncioTextField id="professionisti-studi-nome" label="Nome" value={data.nome} onValueChange={(value) => data.setField("nome", value)} placeholder="Mario" />
					<AnnuncioTextField id="professionisti-studi-cognome" label="Cognome" value={data.cognome} onValueChange={(value) => data.setField("cognome", value)} placeholder="Rossi" />
					<AnnuncioTextField id="professionisti-studi-figura-professionale" label="Figura professionale" value={data.figuraProfessionale} onValueChange={(value) => data.setField("figuraProfessionale", value)} placeholder="Nutrizionista, psicologo, consulente..." />
					<AnnuncioTextField id="professionisti-studi-specializzazione" label="Specializzazione" value={data.specializzazione} onValueChange={(value) => data.setField("specializzazione", value)} placeholder="Ambito o disciplina di specializzazione" />
				</div>
			</FieldSet>

			<ContattiAnnuncioFields contatti={data.contatti} setContatti={(value) => data.setField("contatti", value)} />

			<FieldSet>
				<div className="mt-4"><FieldLegend variant="label" className="field-legend-title mb-0">Servizio</FieldLegend></div>
				<AnnuncioTextareaField id="professionisti-studi-servizi-offerti" label="Servizi offerti" value={data.serviziOfferti} onValueChange={(value) => data.setField("serviziOfferti", value)} placeholder="Descrivi consulenze, percorsi e prestazioni..." />
				<Field>
					<FieldLabel>Modalità del servizio <OptionalLabel /></FieldLabel>
					<Select value={data.modalitaServizio || null} onValueChange={(value) => data.setField("modalitaServizio", value ?? "")}>
						<SelectTrigger className="w-full"><SelectValue placeholder="Non specificato" /></SelectTrigger>
						<SelectContent>
							<SelectItem value={null}>Non specificare</SelectItem>
							{MODALITA_SERVIZIO_OPTIONS.map((opzione) => <SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>)}
						</SelectContent>
					</Select>
				</Field>
			</FieldSet>

			<RegioniInteresseField idPrefix="professionisti-studi-regioni-interessate" regioniInteressate={data.regioniInteressate} setRegioniInteressate={(value) => data.setField("regioniInteressate", value)} cittaComuniPerRegione={data.cittaComuniPerRegione} setCittaComuniPerRegione={(value) => data.setField("cittaComuniPerRegione", value)} />

			<FieldSet>
				<div className="mt-4"><FieldLegend variant="label" className="field-legend-title mb-0">Esperienza e disponibilità</FieldLegend></div>
				<AnnuncioTextareaField id="professionisti-studi-categorie-destinatarie" label="Categorie / realtà a cui si rivolge" value={data.categorieDestinatarie} onValueChange={(value) => data.setField("categorieDestinatarie", value)} placeholder="Settore giovanile, prime squadre, singoli calciatori, società..." />
				<AnnuncioTextareaField id="professionisti-studi-qualifiche" label="Qualifiche / titoli / abilitazioni" value={data.qualificheTitoliAbilitazioni} onValueChange={(value) => data.setField("qualificheTitoliAbilitazioni", value)} placeholder="Titoli di studio, albo, abilitazioni e certificazioni..." />
				<AnnuncioTextareaField id="professionisti-studi-esperienza" label="Esperienza" value={data.esperienza} onValueChange={(value) => data.setField("esperienza", value)} placeholder="Esperienze professionali e collaborazioni rilevanti..." />
				<Field>
					<FieldLabel>Disponibilità agli spostamenti <OptionalLabel /></FieldLabel>
					<Select value={data.disponibilitaSpostamenti || null} onValueChange={(value) => data.setField("disponibilitaSpostamenti", value ?? "")}>
						<SelectTrigger className="w-full"><SelectValue placeholder="Non specificato" /></SelectTrigger>
						<SelectContent>
							<SelectItem value={null}>Non specificare</SelectItem>
							{DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS.map((opzione) => <SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>)}
						</SelectContent>
					</Select>
				</Field>
				<AnnuncioTextareaField id="professionisti-studi-info-aggiuntive" label="Info aggiuntive" value={data.infoAggiuntive} onValueChange={(value) => data.setField("infoAggiuntive", value)} placeholder="Aggiungi eventuali altre informazioni..." />
				<ImmagineAnnuncioPremiumField idPrefix="professionisti-studi" tipologia="professionisti-studi" value={data.immagineAnnuncio} onValueChange={(value) => data.setField("immagineAnnuncio", value)} />
				<LinkAnnuncioPremiumField idPrefix="professionisti-studi" tipologia="professionisti-studi" value={data.linkAnnuncio} onValueChange={(value) => data.setField("linkAnnuncio", value)} />
			</FieldSet>
		</FieldGroup>
	);
}
