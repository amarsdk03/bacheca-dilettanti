"use client";

import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import AnnuncioTextField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextField";
import AnnuncioTextareaField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextareaField";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import ImmagineAnnuncioField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioField";
import LinkAnnuncioField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {
	useAnnuncioServiziConsulenzeStore
} from "@/features/pubblica-annuncio/state/AnnuncioServiziConsulenze.store";
import {
	DISPONIBILITA_SPOSTAMENTI_OPTIONS,
	MODALITA_SERVIZIO_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export default function AnnuncioServiziConsulenze() {
	const data = useAnnuncioServiziConsulenzeStore();

	return (
		<FieldGroup spacing="sections">
			<FieldSet>
				<div>
					<FieldLegend variant="label" className="field-legend-title mb-0">Dati per servizi e consulenze</FieldLegend>
					<FieldDescription>Descrivi la tua figura professionale e i servizi offerti al mondo sportivo.</FieldDescription>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<AnnuncioTextField id="servizi-consulenze-nome" label="Nome" value={data.nome} onValueChange={(value) => data.setField("nome", value)} placeholder="Mario" required />
					<AnnuncioTextField id="servizi-consulenze-cognome" label="Cognome" value={data.cognome} onValueChange={(value) => data.setField("cognome", value)} placeholder="Rossi" required />
					<AnnuncioTextField id="servizi-consulenze-figura-professionale" label="Figura professionale" value={data.figuraProfessionale} onValueChange={(value) => data.setField("figuraProfessionale", value)} placeholder="Nutrizionista, psicologo, consulente..." required />
					<AnnuncioTextField id="servizi-consulenze-specializzazione" label="Specializzazione" value={data.specializzazione} onValueChange={(value) => data.setField("specializzazione", value)} placeholder="Ambito o disciplina di specializzazione" />
				</div>
			</FieldSet>

			<ContattiAnnuncioFields contatti={data.contatti} setContatti={(value) => data.setField("contatti", value)} />

			<FieldSet>
				<div><FieldLegend variant="label" className="field-legend-title mb-0">Servizio</FieldLegend></div>
				<AnnuncioTextareaField id="servizi-consulenze-servizi-offerti" label="Servizi offerti" value={data.serviziOfferti} onValueChange={(value) => data.setField("serviziOfferti", value)} placeholder="Descrivi consulenze, percorsi e prestazioni..." />
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

			<RegioniInteresseField idPrefix="servizi-consulenze-regioni-interessate" regioniInteressate={data.regioniInteressate} setRegioniInteressate={(value) => data.setField("regioniInteressate", value)} cittaComuniPerRegione={data.cittaComuniPerRegione} setCittaComuniPerRegione={(value) => data.setField("cittaComuniPerRegione", value)} />

			<FieldSet>
				<div><FieldLegend variant="label" className="field-legend-title mb-0">Esperienza e disponibilità</FieldLegend></div>
				<AnnuncioTextareaField id="servizi-consulenze-categorie-destinatarie" label="Categorie / realtà a cui si rivolge" value={data.categorieDestinatarie} onValueChange={(value) => data.setField("categorieDestinatarie", value)} placeholder="Settore giovanile, prime squadre, singoli calciatori, società..." />
				<AnnuncioTextareaField id="servizi-consulenze-qualifiche" label="Qualifiche / titoli / abilitazioni" value={data.qualificheTitoliAbilitazioni} onValueChange={(value) => data.setField("qualificheTitoliAbilitazioni", value)} placeholder="Titoli di studio, albo, abilitazioni e certificazioni..." />
				<AnnuncioTextareaField id="servizi-consulenze-esperienza" label="Esperienza" value={data.esperienza} onValueChange={(value) => data.setField("esperienza", value)} placeholder="Esperienze professionali e collaborazioni rilevanti..." />
				<Field>
					<FieldLabel>Disponibilità agli spostamenti <OptionalLabel /></FieldLabel>
					<Select value={data.disponibilitaSpostamenti || null} onValueChange={(value) => data.setField("disponibilitaSpostamenti", value ?? "")}>
						<SelectTrigger className="w-full"><SelectValue placeholder="Non specificato" /></SelectTrigger>
						<SelectContent>
							<SelectItem value={null}>Non specificare</SelectItem>
							{DISPONIBILITA_SPOSTAMENTI_OPTIONS.map((opzione) => <SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>)}
						</SelectContent>
					</Select>
				</Field>
				<AnnuncioTextareaField id="servizi-consulenze-info-aggiuntive" label="Info aggiuntive" value={data.infoAggiuntive} onValueChange={(value) => data.setField("infoAggiuntive", value)} placeholder="Aggiungi eventuali altre informazioni..." />
				<ImmagineAnnuncioField idPrefix="servizi-consulenze" tipologia="servizi-consulenze" value={data.immagineAnnuncio} onValueChangeAction={(value) => data.setField("immagineAnnuncio", value)} />
				<LinkAnnuncioField idPrefix="servizi-consulenze" tipologia="servizi-consulenze" value={data.linkAnnuncio} onValueChange={(value) => data.setField("linkAnnuncio", value)} />
			</FieldSet>
		</FieldGroup>
	);
}
