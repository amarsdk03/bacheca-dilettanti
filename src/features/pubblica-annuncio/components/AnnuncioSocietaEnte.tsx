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
import AnnateMultiselectField from "@/features/pubblica-annuncio/components/InputFields/AnnateMultiselectField";
import ContattiAnnuncioFields, {
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import DateRangeFields from "@/features/pubblica-annuncio/components/InputFields/DateRangeFields";
import {
	PARTECIPAZIONE_EVENTO_OPTIONS,
	TIPOLOGIA_CALCIO_OPTIONS,
} from "@/features/pubblica-annuncio/components/opzioniAnnuncio";

export type EventoSocietaEnte = {
	periodoDa: string;
	periodoA: string;
	orario: string;
	tipologiaCalcio: string;
	descrizioneEvento: string;
	modalitaIscrizioneRequisiti: string;
	scadenzaIscrizioni: string;
	annateAmmesse: string[];
	livelloIndicativo: string;
	partecipazione: string;
	costoPartecipazione: string;
	postiDisponibili: string;
};

export type DisponibilitaStrutturaSocietaEnte = {
	periodoDa: string;
	periodoA: string;
	orario: string;
	costoOrario: string;
	serviziInclusi: string;
};

export const EVENTO_SOCIETA_ENTE_DEFAULT: EventoSocietaEnte = {
	periodoDa: "",
	periodoA: "",
	orario: "",
	tipologiaCalcio: "",
	descrizioneEvento: "",
	modalitaIscrizioneRequisiti: "",
	scadenzaIscrizioni: "",
	annateAmmesse: [],
	livelloIndicativo: "",
	partecipazione: "",
	costoPartecipazione: "",
	postiDisponibili: "",
};

export const DISPONIBILITA_STRUTTURA_SOCIETA_ENTE_DEFAULT: DisponibilitaStrutturaSocietaEnte = {
	periodoDa: "",
	periodoA: "",
	orario: "",
	costoOrario: "",
	serviziInclusi: "",
};

type AnnuncioSocietaEnteProps = {
	sottotipologia: string;
	nomeEnte: string;
	setNomeEnte: Dispatch<SetStateAction<string>>;
	indirizzo: string;
	setIndirizzo: Dispatch<SetStateAction<string>>;
	presentazione: string;
	setPresentazione: Dispatch<SetStateAction<string>>;
	contatti: ContattiAnnuncio;
	setContatti: Dispatch<SetStateAction<ContattiAnnuncio>>;
	evento: EventoSocietaEnte;
	setEvento: Dispatch<SetStateAction<EventoSocietaEnte>>;
	disponibilitaStruttura: DisponibilitaStrutturaSocietaEnte;
	setDisponibilitaStruttura: Dispatch<SetStateAction<DisponibilitaStrutturaSocietaEnte>>;
};

function EventoSocietaEnteFields({
	titolo,
	idPrefix,
	evento,
	setEvento,
}: {
	titolo: string;
	idPrefix: string;
	evento: EventoSocietaEnte;
	setEvento: Dispatch<SetStateAction<EventoSocietaEnte>>;
}) {
	return (
		<FieldSet>
			<div className="mt-4">
				<FieldLegend variant="label" className="field-legend-title mb-0">
					{titolo}
				</FieldLegend>
			</div>

			<DateRangeFields
				idPrefix={`${idPrefix}-periodo`}
				from={evento.periodoDa}
				setFrom={(value) => setEvento((prev) => ({...prev, periodoDa: value}))}
				to={evento.periodoA}
				setTo={(value) => setEvento((prev) => ({...prev, periodoA: value}))}
			/>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel htmlFor={`${idPrefix}-orario`}>Orario</FieldLabel>
					<Input
						id={`${idPrefix}-orario`}
						value={evento.orario}
						onChange={(event) =>
							setEvento((prev) => ({...prev, orario: event.target.value}))
						}
						placeholder="Es. 18:00-20:00"
					/>
				</Field>

				<Field>
					<FieldLabel>Tipologia calcio</FieldLabel>
					<Select
						value={evento.tipologiaCalcio || null}
						onValueChange={(value) =>
							setEvento((prev) => ({...prev, tipologiaCalcio: value ?? ""}))
						}
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
			</div>

			<Field>
				<div className="flex items-center justify-between gap-3">
					<FieldLabel htmlFor={`${idPrefix}-descrizione-evento`}>Descrizione evento</FieldLabel>
					<span className="text-xs text-muted-foreground">
						{evento.descrizioneEvento.length}/5000
					</span>
				</div>
				<Textarea
					id={`${idPrefix}-descrizione-evento`}
					value={evento.descrizioneEvento}
					onChange={(event) =>
						setEvento((prev) => ({
							...prev,
							descrizioneEvento: event.target.value.slice(0, 5000),
						}))
					}
					maxLength={5000}
					placeholder="Obiettivo dell'evento, programma, staff coinvolto, dettagli organizzativi..."
					className="min-h-32 resize-y"
				/>
			</Field>

			<Field>
				<div className="flex items-center justify-between gap-3">
					<FieldLabel htmlFor={`${idPrefix}-modalita-requisiti`}>
						Modalità iscrizione e requisiti
					</FieldLabel>
					<span className="text-xs text-muted-foreground">
						{evento.modalitaIscrizioneRequisiti.length}/2000
					</span>
				</div>
				<Textarea
					id={`${idPrefix}-modalita-requisiti`}
					value={evento.modalitaIscrizioneRequisiti}
					onChange={(event) =>
						setEvento((prev) => ({
							...prev,
							modalitaIscrizioneRequisiti: event.target.value.slice(0, 2000),
						}))
					}
					maxLength={2000}
					placeholder="Come iscriversi, documenti richiesti, certificati, autorizzazioni..."
					className="min-h-28 resize-y"
				/>
			</Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel htmlFor={`${idPrefix}-scadenza-iscrizioni`}>
						Scadenza iscrizioni
					</FieldLabel>
					<Input
						id={`${idPrefix}-scadenza-iscrizioni`}
						type="date"
						value={evento.scadenzaIscrizioni}
						onChange={(event) =>
							setEvento((prev) => ({...prev, scadenzaIscrizioni: event.target.value}))
						}
					/>
				</Field>

				<Field>
					<FieldLabel>Partecipazione</FieldLabel>
					<Select
						value={evento.partecipazione || null}
						onValueChange={(value) =>
							setEvento((prev) => ({...prev, partecipazione: value ?? ""}))
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Non specificata" />
						</SelectTrigger>
						<SelectContent>
							{PARTECIPAZIONE_EVENTO_OPTIONS.map((opzione) => (
								<SelectItem key={opzione.etichetta} value={opzione.valore}>
									{opzione.etichetta}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			</div>

			<AnnateMultiselectField
				label="Annate ammesse"
				value={evento.annateAmmesse}
				onValueChange={(value) =>
					setEvento((prev) => ({...prev, annateAmmesse: value}))
				}
				placeholder="Seleziona annate ammesse..."
			/>

			<Field>
				<div className="flex items-center justify-between gap-3">
					<FieldLabel htmlFor={`${idPrefix}-livello-indicativo`}>Livello indicativo</FieldLabel>
					<span className="text-xs text-muted-foreground">
						{evento.livelloIndicativo.length}/2000
					</span>
				</div>
				<Textarea
					id={`${idPrefix}-livello-indicativo`}
					value={evento.livelloIndicativo}
					onChange={(event) =>
						setEvento((prev) => ({
							...prev,
							livelloIndicativo: event.target.value.slice(0, 2000),
						}))
					}
					maxLength={2000}
					placeholder="Livello tecnico, categoria, esperienza consigliata..."
					className="min-h-24 resize-y"
				/>
			</Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel htmlFor={`${idPrefix}-costo-partecipazione`}>
						Costo partecipazione
					</FieldLabel>
					<Input
						id={`${idPrefix}-costo-partecipazione`}
						type="number"
						min={0}
						value={evento.costoPartecipazione}
						onChange={(event) =>
							setEvento((prev) => ({
								...prev,
								costoPartecipazione: event.target.value,
							}))
						}
						placeholder="0"
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor={`${idPrefix}-posti-disponibili`}>
						Posti disponibili
					</FieldLabel>
					<Input
						id={`${idPrefix}-posti-disponibili`}
						type="number"
						min={0}
						value={evento.postiDisponibili}
						onChange={(event) =>
							setEvento((prev) => ({...prev, postiDisponibili: event.target.value}))
						}
						placeholder="30"
					/>
				</Field>
			</div>
		</FieldSet>
	);
}

function DisponibilitaStrutturaFields({
	disponibilitaStruttura,
	setDisponibilitaStruttura,
}: {
	disponibilitaStruttura: DisponibilitaStrutturaSocietaEnte;
	setDisponibilitaStruttura: Dispatch<SetStateAction<DisponibilitaStrutturaSocietaEnte>>;
}) {
	return (
		<FieldSet>
			<div className="mt-4">
				<FieldLegend variant="label" className="field-legend-title mb-0">
					Disponibilità campo / struttura
				</FieldLegend>
			</div>

			<DateRangeFields
				idPrefix="societa-ente-struttura-periodo"
				from={disponibilitaStruttura.periodoDa}
				setFrom={(value) =>
					setDisponibilitaStruttura((prev) => ({...prev, periodoDa: value}))
				}
				to={disponibilitaStruttura.periodoA}
				setTo={(value) =>
					setDisponibilitaStruttura((prev) => ({...prev, periodoA: value}))
				}
			/>

			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="societa-ente-struttura-orario">Orario</FieldLabel>
					<Input
						id="societa-ente-struttura-orario"
						value={disponibilitaStruttura.orario}
						onChange={(event) =>
							setDisponibilitaStruttura((prev) => ({...prev, orario: event.target.value}))
						}
						placeholder="Es. Lun-Ven 18:00-23:00"
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="societa-ente-struttura-costo-orario">
						Costo orario
					</FieldLabel>
					<Input
						id="societa-ente-struttura-costo-orario"
						type="number"
						min={0}
						value={disponibilitaStruttura.costoOrario}
						onChange={(event) =>
							setDisponibilitaStruttura((prev) => ({
								...prev,
								costoOrario: event.target.value,
							}))
						}
						placeholder="45"
					/>
				</Field>
			</div>

			<Field>
				<div className="flex items-center justify-between gap-3">
					<FieldLabel htmlFor="societa-ente-struttura-servizi">
						Servizi inclusi
					</FieldLabel>
					<span className="text-xs text-muted-foreground">
						{disponibilitaStruttura.serviziInclusi.length}/2000
					</span>
				</div>
				<Textarea
					id="societa-ente-struttura-servizi"
					value={disponibilitaStruttura.serviziInclusi}
					onChange={(event) =>
						setDisponibilitaStruttura((prev) => ({
							...prev,
							serviziInclusi: event.target.value.slice(0, 2000),
						}))
					}
					maxLength={2000}
					placeholder="Spogliatoi, illuminazione, materiale tecnico, parcheggio, bar..."
					className="min-h-28 resize-y"
				/>
			</Field>
		</FieldSet>
	);
}

export default function AnnuncioSocietaEnte({
	sottotipologia,
	nomeEnte,
	setNomeEnte,
	indirizzo,
	setIndirizzo,
	presentazione,
	setPresentazione,
	contatti,
	setContatti,
	evento,
	setEvento,
	disponibilitaStruttura,
	setDisponibilitaStruttura,
}: AnnuncioSocietaEnteProps) {
	const isEvento =
		sottotipologia === "openday-allenamento-libero" ||
		sottotipologia === "evento-torneo-sportivo";
	const titoloEvento =
		sottotipologia === "openday-allenamento-libero"
			? "OpenDay / Allenamento libero"
			: "Evento";

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati ente
					</FieldLegend>
					<FieldDescription
						className="text-red-800 font-medium"
						hidden={nomeEnte.trim() !== ""}
					>
						Il nome ente è obbligatorio.
					</FieldDescription>
				</div>

				<Field>
					<FieldLabel htmlFor="societa-ente-nome">Nome ente</FieldLabel>
					<Input
						id="societa-ente-nome"
						value={nomeEnte}
						onChange={(event) => setNomeEnte(event.target.value)}
						placeholder="A.S.D. Centro Sportivo Esempio"
						required
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="societa-ente-indirizzo">
						Indirizzo evento / struttura
					</FieldLabel>
					<Input
						id="societa-ente-indirizzo"
						value={indirizzo}
						onChange={(event) => setIndirizzo(event.target.value)}
						placeholder="Via Roma 1, Milano"
					/>
				</Field>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="societa-ente-presentazione">Presentazione</FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazione.length}/5000</span>
					</div>
					<Textarea
						id="societa-ente-presentazione"
						value={presentazione}
						onChange={(event) => setPresentazione(event.target.value.slice(0, 5000))}
						maxLength={5000}
						placeholder="Descrivi ente, struttura, obiettivi, staff e attività principali..."
						className="min-h-40 resize-y"
					/>
				</Field>
			</FieldSet>

			<ContattiAnnuncioFields contatti={contatti} setContatti={setContatti} />

			{isEvento && (
				<EventoSocietaEnteFields
					titolo={titoloEvento}
					idPrefix="societa-ente-evento"
					evento={evento}
					setEvento={setEvento}
				/>
			)}

			{sottotipologia === "struttura-campo" && (
				<DisponibilitaStrutturaFields
					disponibilitaStruttura={disponibilitaStruttura}
					setDisponibilitaStruttura={setDisponibilitaStruttura}
				/>
			)}
		</FieldGroup>
	);
}
