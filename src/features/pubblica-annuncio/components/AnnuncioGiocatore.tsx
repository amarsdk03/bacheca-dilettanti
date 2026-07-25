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
	SOCIAL_CONTACT_OPTIONS,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import RegioniInteresseField, {
	type CittaComuniPerRegione,
} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {
	RUOLO_PRINCIPALE_OPTIONS,
	TIPOLOGIA_CALCIO_OPTIONS,
} from "@/features/pubblica-annuncio/components/opzioniAnnuncio";

export type ContattiGiocatore = ContattiAnnuncio;

export {RUOLO_PRINCIPALE_OPTIONS, SOCIAL_CONTACT_OPTIONS, TIPOLOGIA_CALCIO_OPTIONS};
export type {CittaComuniPerRegione};

type AnnuncioGiocatoreProps = {
	emailCollegamento: string;
	setEmailCollegamento: Dispatch<SetStateAction<string>>;
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
	linkFoto: string;
	setLinkFoto: Dispatch<SetStateAction<string>>;
	contatti: ContattiGiocatore;
	setContatti: Dispatch<SetStateAction<ContattiGiocatore>>;
	biografia: string;
	setBiografia: Dispatch<SetStateAction<string>>;
	tipologiaCalcio: string;
	setTipologiaCalcio: Dispatch<SetStateAction<string>>;
	ruoloPrincipale: string;
	setRuoloPrincipale: Dispatch<SetStateAction<string>>;
};

export default function AnnuncioGiocatore({
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
	contatti,
	setContatti,
	biografia,
	setBiografia,
	tipologiaCalcio,
	setTipologiaCalcio,
	ruoloPrincipale,
	setRuoloPrincipale,
}: AnnuncioGiocatoreProps) {
	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati giocatore
					</FieldLegend>
					<FieldDescription>
						Inserisci le informazioni principali del profilo.
					</FieldDescription>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="giocatore-nome">Nome</FieldLabel>
						<Input
							id="giocatore-nome"
							value={nome}
							onChange={(event) => setNome(event.target.value)}
							placeholder="Mario"
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="giocatore-cognome">Cognome</FieldLabel>
						<Input
							id="giocatore-cognome"
							value={cognome}
							onChange={(event) => setCognome(event.target.value)}
							placeholder="Rossi"
							required
						/>
					</Field>
				</div>

				<DataNascitaFields
					idPrefix="giocatore"
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
						Profilo calcistico
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

					<Field>
						<FieldLabel>Ruolo principale</FieldLabel>
						<Select
							value={ruoloPrincipale || null}
							onValueChange={(value) => setRuoloPrincipale(value ?? "")}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Non specificare" />
							</SelectTrigger>
							<SelectContent>
								{RUOLO_PRINCIPALE_OPTIONS.map((opzione) => (
									<SelectItem key={opzione.etichetta} value={opzione.valore}>
										{opzione.etichetta}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</div>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="giocatore-biografia">Biografia</FieldLabel>
						<span className="text-xs text-muted-foreground">{biografia.length}/2000</span>
					</div>
					<Textarea
						id="giocatore-biografia"
						value={biografia}
						onChange={(event) => setBiografia(event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Racconta esperienze, caratteristiche tecniche, disponibilità, obiettivi..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>

			<div className={"mt-2"}>
				<ContattiAnnuncioFields
					contatti={contatti}
					setContatti={setContatti}
				/>
			</div>

		</FieldGroup>
	);
}
