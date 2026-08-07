"use client";

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {useAnnuncioArbitroStore} from "@/features/pubblica-annuncio/state/AnnuncioArbitro.store";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import DisponibilitaSpostamentoSelect from "@/features/pubblica-annuncio/components/InputFields/DisponibilitaSpostamentoSelect";
import EsperienzeAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import TipologiaCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";

const optionalLabel = <span className="font-normal text-neutral-400 -translate-x-1">(facoltativo)</span>;

export default function AnnuncioArbitro() {
	const {
		nome,
		cognome,
		giornoNascita,
		meseNascita,
		annoNascita,
		regioniInteressate,
		cittaComuniPerRegione,
		tipologieCalcio,
		presentazione,
		esperienze,
		disponibilitaSpostamento,
		setField,
	} = useAnnuncioArbitroStore();

	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati arbitro
					</FieldLegend>
					<FieldDescription>Puoi lasciare anonimi i dati personali.</FieldDescription>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="arbitro-nome">Nome {optionalLabel}</FieldLabel>
						<Input
							id="arbitro-nome"
							value={nome}
							onChange={(event) => setField("nome", event.target.value)}
							placeholder="Mario"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="arbitro-cognome">Cognome {optionalLabel}</FieldLabel>
						<Input
							id="arbitro-cognome"
							value={cognome}
							onChange={(event) => setField("cognome", event.target.value)}
							placeholder="Rossi"
						/>
					</Field>
				</div>

				<DataNascitaFields
					idPrefix="arbitro"
					giornoNascita={giornoNascita}
					setGiornoNascita={(value) => setField("giornoNascita", value)}
					meseNascita={meseNascita}
					setMeseNascita={(value) => setField("meseNascita", value)}
					annoNascita={annoNascita}
					setAnnoNascita={(value) => setField("annoNascita", value)}
				/>
			</FieldSet>

			<RegioniInteresseField
				regioniInteressate={regioniInteressate}
				setRegioniInteressate={(value) => setField("regioniInteressate", value)}
				cittaComuniPerRegione={cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) => setField("cittaComuniPerRegione", value)}
			/>

			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Profilo arbitrale
					</FieldLegend>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<TipologiaCalcioMultiselectField
						value={tipologieCalcio}
						onValueChange={(value) => setField("tipologieCalcio", value)}
					/>
					<DisponibilitaSpostamentoSelect
						id="arbitro-disponibilita-spostamento"
						value={disponibilitaSpostamento}
						setValue={(value) => setField("disponibilitaSpostamento", value)}
					/>
				</div>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="arbitro-presentazione">Presentazione personale</FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazione.length}/2000</span>
					</div>
					<Textarea
						id="arbitro-presentazione"
						value={presentazione}
						onChange={(event) => setField("presentazione", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Esperienza arbitrale, disponibilità, categorie seguite, approccio..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>

			<EsperienzeAnnuncioFields
				idPrefix="arbitro"
				esperienze={esperienze}
				setEsperienze={(value) => setField("esperienze", value)}
			/>
		</FieldGroup>
	);
}
