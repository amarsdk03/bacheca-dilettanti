"use client";

import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import AnnuncioTextField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextField";
import AnnuncioTextareaField from "@/features/pubblica-annuncio/components/InputFields/AnnuncioTextareaField";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import ImmagineAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioPremiumField";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {useAnnuncioTorneoEventoStore} from "@/features/pubblica-annuncio/state/AnnuncioTorneoEvento.store";
import {ANNATE_OPTIONS, MODALITA_ISCRIZIONE_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export default function AnnuncioTorneoEvento() {
	const data = useAnnuncioTorneoEventoStore();
	const intervalloAnnateValido = data.annataDa === "" || data.annataA === "" || Number(data.annataDa) <= Number(data.annataA);

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Dati torneo / evento</FieldLegend>
					<FieldDescription>Inserisci le informazioni utili per squadre e partecipanti.</FieldDescription>
				</div>
				<AnnuncioTextField id="torneo-evento-nome" label="Nome torneo / evento" value={data.nome} onValueChange={(value) => data.setField("nome", value)} placeholder="Torneo estivo 2026" />
			</FieldSet>

			<ContattiAnnuncioFields contatti={data.contatti} setContatti={(value) => data.setField("contatti", value)} />
			<RegioniInteresseField idPrefix="torneo-evento-regioni-interessate" regioniInteressate={data.regioniInteressate} setRegioniInteressate={(value) => data.setField("regioniInteressate", value)} cittaComuniPerRegione={data.cittaComuniPerRegione} setCittaComuniPerRegione={(value) => data.setField("cittaComuniPerRegione", value)} />

			<FieldSet>
				<div className="mt-4"><FieldLegend variant="label" className="field-legend-title mb-0">Iscrizioni e partecipazione</FieldLegend></div>
				<Field>
					<FieldLabel>Modalità di iscrizione <OptionalLabel /></FieldLabel>
					<Select value={data.modalitaIscrizione || null} onValueChange={(value) => data.setField("modalitaIscrizione", value ?? "")}>
						<SelectTrigger className="w-full"><SelectValue placeholder="Non specificata" /></SelectTrigger>
						<SelectContent>
							<SelectItem value={null}>Non specificare</SelectItem>
							{MODALITA_ISCRIZIONE_OPTIONS.map((opzione) => <SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>)}
						</SelectContent>
					</Select>
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel>Annate ammesse: da <OptionalLabel /></FieldLabel>
						<Select value={data.annataDa || null} onValueChange={(value) => data.setField("annataDa", value ?? "")}>
							<SelectTrigger className="w-full"><SelectValue placeholder="Da" /></SelectTrigger>
							<SelectContent><SelectItem value={null}>Non specificare</SelectItem>{ANNATE_OPTIONS.map((annata) => <SelectItem key={annata} value={annata}>{annata}</SelectItem>)}</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel>Annate ammesse: a <OptionalLabel /></FieldLabel>
						<Select value={data.annataA || null} onValueChange={(value) => data.setField("annataA", value ?? "")}>
							<SelectTrigger className="w-full"><SelectValue placeholder="A" /></SelectTrigger>
							<SelectContent><SelectItem value={null}>Non specificare</SelectItem>{ANNATE_OPTIONS.map((annata) => <SelectItem key={annata} value={annata}>{annata}</SelectItem>)}</SelectContent>
						</Select>
					</Field>
				</div>
				{!intervalloAnnateValido && <FieldDescription className="font-medium text-red-800">L&apos;annata iniziale deve essere precedente o uguale a quella finale.</FieldDescription>}

				<div className="grid gap-4 sm:grid-cols-2">
					<AnnuncioTextField id="torneo-evento-numero-squadre" label="Numero squadre" value={data.numeroSquadre} onValueChange={(value) => data.setField("numeroSquadre", value)} placeholder="16" type="number" min={1} step={1} />
					<Field>
						<FieldLabel htmlFor="torneo-evento-costo">Costo partecipazione <OptionalLabel /></FieldLabel>
						<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
							<Input id="torneo-evento-costo" type="number" min={0} step={0.01} value={data.costoPartecipazione} onChange={(event) => data.setField("costoPartecipazione", event.target.value)} placeholder="0,00 EUR" />
							<Select value={data.costoPer} onValueChange={(value) => data.setField("costoPer", value ?? "squadra")}>
								<SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
								<SelectContent><SelectItem value="giocatore">Per giocatore</SelectItem><SelectItem value="squadra">Per squadra</SelectItem></SelectContent>
							</Select>
						</div>
					</Field>
				</div>

				<AnnuncioTextareaField id="torneo-evento-info-aggiuntive" label="Informazioni aggiuntive" value={data.infoAggiuntive} onValueChange={(value) => data.setField("infoAggiuntive", value)} placeholder="Programma, regolamento, date e altre informazioni utili..." />
				<ImmagineAnnuncioPremiumField idPrefix="torneo-evento" tipologia="torneo-evento" value={data.immagineAnnuncio} onValueChange={(value) => data.setField("immagineAnnuncio", value)} />
				<LinkAnnuncioPremiumField idPrefix="torneo-evento" tipologia="torneo-evento" value={data.linkAnnuncio} onValueChange={(value) => data.setField("linkAnnuncio", value)} />
			</FieldSet>
		</FieldGroup>
	);
}
