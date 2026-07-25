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
import ContattiAnnuncioFields, {
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import {TIPOLOGIA_CALCIO_OPTIONS} from "@/features/pubblica-annuncio/components/opzioniAnnuncio";

type AnnuncioScoutingProps = {
	nome: string;
	setNome: Dispatch<SetStateAction<string>>;
	linkLogo: string;
	setLinkLogo: Dispatch<SetStateAction<string>>;
	contatti: ContattiAnnuncio;
	setContatti: Dispatch<SetStateAction<ContattiAnnuncio>>;
	presentazione: string;
	setPresentazione: Dispatch<SetStateAction<string>>;
	tipologiaCalcio: string;
	setTipologiaCalcio: Dispatch<SetStateAction<string>>;
};

export default function AnnuncioScouting({
	nome,
	setNome,
	linkLogo,
	setLinkLogo,
	contatti,
	setContatti,
	presentazione,
	setPresentazione,
	tipologiaCalcio,
	setTipologiaCalcio,
}: AnnuncioScoutingProps) {
	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati scouting
					</FieldLegend>
					<FieldDescription
						className="text-red-800 font-medium"
						hidden={nome.trim() !== ""}
					>
						Il nome è obbligatorio.
					</FieldDescription>
				</div>

				<Field>
					<FieldLabel htmlFor="scouting-nome">Nome</FieldLabel>
					<Input
						id="scouting-nome"
						value={nome}
						onChange={(event) => setNome(event.target.value)}
						placeholder="Osservatori Esempio"
						required
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="scouting-link-logo">Link logo</FieldLabel>
					<Input
						id="scouting-link-logo"
						type="url"
						value={linkLogo}
						onChange={(event) => setLinkLogo(event.target.value)}
						placeholder="https://..."
					/>
				</Field>
			</FieldSet>

			<ContattiAnnuncioFields contatti={contatti} setContatti={setContatti} />

			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Profilo scouting
					</FieldLegend>
				</div>

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
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="scouting-presentazione">Presentazione personale</FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazione.length}/2000</span>
					</div>
					<Textarea
						id="scouting-presentazione"
						value={presentazione}
						onChange={(event) => setPresentazione(event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Competenze di osservazione, aree coperte, metodo e obiettivi..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>
		</FieldGroup>
	);
}
