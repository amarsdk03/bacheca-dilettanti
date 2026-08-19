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
import {useAnnuncioStaffStore} from "@/features/pubblica-annuncio/state/AnnuncioStaff.store";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import DisponibilitaSpostamentoSelect from "@/features/pubblica-annuncio/components/InputFields/DisponibilitaSpostamentoSelect";
import EsperienzeAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import FiguraProfessionaleMultiselectField from "@/features/pubblica-annuncio/components/InputFields/FiguraProfessionaleMultiselectField";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import TipologiaCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import ImmagineAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioPremiumField";
import CategorieCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/CategorieCalcioMultiselectField";
import {CATEGORIE_CALCIO_GROUPS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export default function AnnuncioStaff() {
	const {
		nome,
		cognome,
		contatti,
		giornoNascita,
		meseNascita,
		annoNascita,
		regioniInteressate,
		cittaComuniPerRegione,
		tipologieCalcio,
		figureProfessionali,
		categorieRicercate,
		presentazioneInformazioniAggiuntive,
		esperienze,
		disponibilitaSpostamento,
		immagineAnnuncio,
		linkAnnuncio,
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
						<FieldLabel htmlFor="staff-nome">Nome <OptionalLabel /></FieldLabel>
						<Input id="staff-nome" value={nome} onChange={(event) => setField("nome", event.target.value)} placeholder="Mario" />
					</Field>
					<Field>
						<FieldLabel htmlFor="staff-cognome">Cognome <OptionalLabel /></FieldLabel>
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

			<ContattiAnnuncioFields contatti={contatti} setContatti={(value) => setField("contatti", value)} />

			<RegioniInteresseField
				regioniInteressate={regioniInteressate}
				setRegioniInteressate={(value) => setField("regioniInteressate", value)}
				cittaComuniPerRegione={cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) => setField("cittaComuniPerRegione", value)}
			/>

			<FieldSet className="grid gap-x-4 gap-y-6">
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-1">Profilo professionale</FieldLegend>
					<FieldDescription
						className="text-red-800 font-medium"
						hidden={figureProfessionali.length > 0}
					>
						Seleziona almeno una figura professionale.
					</FieldDescription>
				</div>

				<div className="grid gap-x-4 gap-y-6">
					<FiguraProfessionaleMultiselectField
						required
						value={figureProfessionali}
						onValueChange={(value) => setField("figureProfessionali", value)}
					/>

					<CategorieCalcioMultiselectField
						label="Categorie ricercate"
						items={CATEGORIE_CALCIO_GROUPS}
						value={categorieRicercate}
						onValueChange={(value) => setField("categorieRicercate", value)}
					/>

					<div className="grid gap-x-4 sm:grid-cols-2">
						<DisponibilitaSpostamentoSelect
							id="staff-disponibilita-spostamento"
							value={disponibilitaSpostamento}
							setValue={(value) => setField("disponibilitaSpostamento", value)}
						/>

						<TipologiaCalcioMultiselectField
							value={tipologieCalcio}
							onValueChange={(value) => setField("tipologieCalcio", value)}
						/>
					</div>
				</div>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="staff-presentazione-informazioni-aggiuntive">Breve presentazione / informazioni aggiuntive <OptionalLabel /></FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazioneInformazioniAggiuntive.length}/2000</span>
					</div>
					<Textarea
						id="staff-presentazione-informazioni-aggiuntive"
						value={presentazioneInformazioniAggiuntive}
						onChange={(event) => setField("presentazioneInformazioniAggiuntive", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Esperienze, competenze, disponibilità, metodo di lavoro..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>

			<EsperienzeAnnuncioFields idPrefix="staff" esperienze={esperienze} setEsperienze={(value) => setField("esperienze", value)} />
			<ImmagineAnnuncioPremiumField
				idPrefix="staff"
				tipologia="staff-sportivo"
				value={immagineAnnuncio}
				onValueChange={(value) => setField("immagineAnnuncio", value)}
			/>
			<LinkAnnuncioPremiumField
				idPrefix="staff"
				tipologia="staff-sportivo"
				value={linkAnnuncio}
				onValueChange={(value) => setField("linkAnnuncio", value)}
			/>
		</FieldGroup>
	);
}
