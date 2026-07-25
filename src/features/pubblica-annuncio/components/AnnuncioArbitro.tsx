import {type Dispatch, type SetStateAction} from "react";

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import DisponibilitaSpostamentoSelect from "@/features/pubblica-annuncio/components/InputFields/DisponibilitaSpostamentoSelect";
import EsperienzeAnnuncioFields, {
	type EsperienzaAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import RegioniInteresseField, {
	type CittaComuniPerRegione,
} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {TIPOLOGIA_CALCIO_OPTIONS} from "@/features/pubblica-annuncio/components/opzioniAnnuncio";

type AnnuncioArbitroProps = {
	nome: string;
	setNome: Dispatch<SetStateAction<string>>;
	cognome: string;
	setCognome: Dispatch<SetStateAction<string>>;
	giornoNascita: string;
	setGiornoNascita: Dispatch<SetStateAction<string>>;
	meseNascita: string;
	setMeseNascita: Dispatch<SetStateAction<string>>;
	annoNascita: string;
	setAnnoNascita: Dispatch<SetStateAction<string>>;
	regioniInteressate: string[];
	setRegioniInteressate: Dispatch<SetStateAction<string[]>>;
	cittaComuniPerRegione: CittaComuniPerRegione;
	setCittaComuniPerRegione: Dispatch<SetStateAction<CittaComuniPerRegione>>;
	tipologiaCalcio: string;
	setTipologiaCalcio: Dispatch<SetStateAction<string>>;
	presentazione: string;
	setPresentazione: Dispatch<SetStateAction<string>>;
	esperienze: EsperienzaAnnuncio[];
	setEsperienze: Dispatch<SetStateAction<EsperienzaAnnuncio[]>>;
	disponibilitaSpostamento: string;
	setDisponibilitaSpostamento: Dispatch<SetStateAction<string>>;
};

export default function AnnuncioArbitro({
	nome,
	setNome,
	cognome,
	setCognome,
	giornoNascita,
	setGiornoNascita,
	meseNascita,
	setMeseNascita,
	annoNascita,
	setAnnoNascita,
	regioniInteressate,
	setRegioniInteressate,
	cittaComuniPerRegione,
	setCittaComuniPerRegione,
	tipologiaCalcio,
	setTipologiaCalcio,
	presentazione,
	setPresentazione,
	esperienze,
	setEsperienze,
	disponibilitaSpostamento,
	setDisponibilitaSpostamento,
}: AnnuncioArbitroProps) {
	const datiAnagraficiValidi = nome.trim() !== "" && cognome.trim() !== "";

	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati arbitro
					</FieldLegend>
					<FieldDescription
						className="text-red-800 font-medium"
						hidden={datiAnagraficiValidi}
					>
						Nome e cognome sono obbligatori.
					</FieldDescription>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="arbitro-nome">Nome</FieldLabel>
						<Input
							id="arbitro-nome"
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							placeholder="Mario"
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="arbitro-cognome">Cognome</FieldLabel>
						<Input
							id="arbitro-cognome"
							value={cognome}
							onChange={(event) => setCognome(event.target.value)}
							placeholder="Rossi"
							required
						/>
					</Field>
				</div>

				<DataNascitaFields
					idPrefix="arbitro"
					giornoNascita={giornoNascita}
					setGiornoNascita={setGiornoNascita}
					meseNascita={meseNascita}
					setMeseNascita={setMeseNascita}
					annoNascita={annoNascita}
					setAnnoNascita={setAnnoNascita}
				/>
			</FieldSet>

			<RegioniInteresseField
				regioniInteressate={regioniInteressate}
				setRegioniInteressate={setRegioniInteressate}
				cittaComuniPerRegione={cittaComuniPerRegione}
				setCittaComuniPerRegione={setCittaComuniPerRegione}
			/>

			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Profilo arbitrale
					</FieldLegend>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel>Tipologia calcio</FieldLabel>
						<Select
							value={tipologiaCalcio || null}
							onValueChange={(value) => setTipologiaCalcio(value ?? "")}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Non specificare" />
							</SelectTrigger>
							<SelectContent>
								{TIPOLOGIA_CALCIO_OPTIONS.map((opzione) => (
									<SelectItem key={opzione.etichetta} value={opzione.valore}>
										{opzione.etichetta}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<DisponibilitaSpostamentoSelect
						id="arbitro-disponibilita-spostamento"
						value={disponibilitaSpostamento}
						setValue={setDisponibilitaSpostamento}
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
						onChange={(event) => setPresentazione(event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Esperienza arbitrale, disponibilità, categorie seguite, approccio..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>

			<EsperienzeAnnuncioFields
				idPrefix="arbitro"
				esperienze={esperienze}
				setEsperienze={setEsperienze}
			/>
		</FieldGroup>
	);
}
