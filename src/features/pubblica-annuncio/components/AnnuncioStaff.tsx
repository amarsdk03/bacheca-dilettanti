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
import {
	CATEGORIA_RICERCATA_OPTIONS,
	FIGURA_PROFESSIONALE_OPTIONS,
	TIPOLOGIA_CALCIO_OPTIONS,
} from "@/features/pubblica-annuncio/components/opzioniAnnuncio";

type AnnuncioStaffProps = {
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
	figuraProfessionale: string;
	setFiguraProfessionale: Dispatch<SetStateAction<string>>;
	presentazione: string;
	setPresentazione: Dispatch<SetStateAction<string>>;
	esperienze: EsperienzaAnnuncio[];
	setEsperienze: Dispatch<SetStateAction<EsperienzaAnnuncio[]>>;
	categoriaRicercata: string;
	setCategoriaRicercata: Dispatch<SetStateAction<string>>;
	disponibilitaSpostamento: string;
	setDisponibilitaSpostamento: Dispatch<SetStateAction<string>>;
};

export default function AnnuncioStaff({
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
	figuraProfessionale,
	setFiguraProfessionale,
	presentazione,
	setPresentazione,
	esperienze,
	setEsperienze,
	categoriaRicercata,
	setCategoriaRicercata,
	disponibilitaSpostamento,
	setDisponibilitaSpostamento,
}: AnnuncioStaffProps) {
	const datiAnagraficiValidi = nome.trim() !== "" && cognome.trim() !== "";

	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati staff
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
						<FieldLabel htmlFor="staff-nome">Nome</FieldLabel>
						<Input
							id="staff-nome"
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							placeholder="Mario"
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="staff-cognome">Cognome</FieldLabel>
						<Input
							id="staff-cognome"
							value={cognome}
							onChange={(event) => setCognome(event.target.value)}
							placeholder="Rossi"
							required
						/>
					</Field>
				</div>

				<DataNascitaFields
					idPrefix="staff"
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
						Profilo professionale
					</FieldLegend>
					<FieldDescription
						className="text-red-800 font-medium"
						hidden={figuraProfessionale !== ""}
					>
						La figura professionale è obbligatoria.
					</FieldDescription>
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

					<Field>
						<FieldLabel>Figura professionale</FieldLabel>
						<Select
							value={figuraProfessionale || null}
							onValueChange={(value) => setFiguraProfessionale(value ?? "")}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Seleziona" />
							</SelectTrigger>
							<SelectContent>
								{FIGURA_PROFESSIONALE_OPTIONS.map((opzione) => (
									<SelectItem key={opzione} value={opzione}>
										{opzione}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<Field>
						<FieldLabel>Categoria ricercata</FieldLabel>
						<Select
							value={categoriaRicercata || null}
							onValueChange={(value) => setCategoriaRicercata(value ?? "")}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Non specificare" />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIA_RICERCATA_OPTIONS.map((opzione) => (
									<SelectItem key={opzione.etichetta} value={opzione.valore}>
										{opzione.etichetta}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<DisponibilitaSpostamentoSelect
						id="staff-disponibilita-spostamento"
						value={disponibilitaSpostamento}
						setValue={setDisponibilitaSpostamento}
					/>
				</div>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="staff-presentazione">Presentazione personale</FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazione.length}/2000</span>
					</div>
					<Textarea
						id="staff-presentazione"
						value={presentazione}
						onChange={(event) => setPresentazione(event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Esperienze, competenze, disponibilità, metodo di lavoro..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>

			<EsperienzeAnnuncioFields
				idPrefix="staff"
				esperienze={esperienze}
				setEsperienze={setEsperienze}
			/>
		</FieldGroup>
	);
}
