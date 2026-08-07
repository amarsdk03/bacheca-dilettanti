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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {useAnnuncioStaffStore} from "@/features/pubblica-annuncio/state/AnnuncioStaff.store";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import DisponibilitaSpostamentoSelect from "@/features/pubblica-annuncio/components/InputFields/DisponibilitaSpostamentoSelect";
import EsperienzeAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import FiguraProfessionaleMultiselectField from "@/features/pubblica-annuncio/components/InputFields/FiguraProfessionaleMultiselectField";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import TipologiaCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";

export const CATEGORIA_RICERCATA_OPTIONS = [
	"Calcio professionistico",
	"Serie A",
	"Serie B",
	"Serie C",
	"Serie D",
	"Eccellenza",
	"Promozione",
	"Prima Categoria",
	"Seconda Categoria",
	"Terza Categoria",
	"Settore giovanile",
	"Calcio femminile",
	"Calcio a 5",
	"Calcio amatoriale",
	"Altro",
] as const;

const optionalLabel = <span className="font-normal text-neutral-400 -translate-x-1">(facoltativo)</span>;

export default function AnnuncioStaff() {
	const {
		nome,
		cognome,
		giornoNascita,
		meseNascita,
		annoNascita,
		regioniInteressate,
		cittaComuniPerRegione,
		tipologieCalcio,
		figureProfessionali,
		presentazione,
		esperienze,
		categoriaRicercata,
		disponibilitaSpostamento,
		setField,
	} = useAnnuncioStaffStore();

	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Dati staff</FieldLegend>
					<FieldDescription>Puoi lasciare anonimi i dati personali.</FieldDescription>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="staff-nome">Nome {optionalLabel}</FieldLabel>
						<Input id="staff-nome" value={nome} onChange={(event) => setField("nome", event.target.value)} placeholder="Mario" />
					</Field>
					<Field>
						<FieldLabel htmlFor="staff-cognome">Cognome {optionalLabel}</FieldLabel>
						<Input id="staff-cognome" value={cognome} onChange={(event) => setField("cognome", event.target.value)} placeholder="Rossi" />
					</Field>
				</div>

				<DataNascitaFields
					idPrefix="staff"
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
					<FieldLegend variant="label" className="field-legend-title mb-0">Profilo professionale</FieldLegend>
					<FieldDescription
						className="text-red-800 font-medium mb-2 pt-1.5"
						hidden={figureProfessionali.length > 0}
					>
						Seleziona almeno una figura professionale.
					</FieldDescription>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<FiguraProfessionaleMultiselectField required value={figureProfessionali} onValueChange={(value) => setField("figureProfessionali", value)} />
					<TipologiaCalcioMultiselectField value={tipologieCalcio} onValueChange={(value) => setField("tipologieCalcio", value)} />

					<Field>
						<FieldLabel>Categoria ricercata</FieldLabel>
						<Select value={categoriaRicercata || null} onValueChange={(value) => setField("categoriaRicercata", value ?? "")}>
							<SelectTrigger className="w-full"><SelectValue placeholder="Non specificare" /></SelectTrigger>
							<SelectContent>
								<SelectItem value={null}>Non specificare</SelectItem>
								{CATEGORIA_RICERCATA_OPTIONS.map((opzione) => <SelectItem key={opzione} value={opzione}>{opzione}</SelectItem>)}
							</SelectContent>
						</Select>
					</Field>

					<DisponibilitaSpostamentoSelect
						id="staff-disponibilita-spostamento"
						value={disponibilitaSpostamento}
						setValue={(value) => setField("disponibilitaSpostamento", value)}
					/>
				</div>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="staff-presentazione">Breve presentazione</FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazione.length}/2000</span>
					</div>
					<Textarea
						id="staff-presentazione"
						value={presentazione}
						onChange={(event) => setField("presentazione", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Esperienze, competenze, disponibilità, metodo di lavoro..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>

			<EsperienzeAnnuncioFields idPrefix="staff" esperienze={esperienze} setEsperienze={(value) => setField("esperienze", value)} />
		</FieldGroup>
	);
}
