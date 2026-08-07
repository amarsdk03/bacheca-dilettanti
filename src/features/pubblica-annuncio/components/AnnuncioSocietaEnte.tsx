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
import {
	type EventoSocietaEnte,
	useAnnuncioSocietaEnteStore,
} from "@/features/pubblica-annuncio/state/AnnuncioSocietaEnte.store";
import AnnateMultiselectField from "@/features/pubblica-annuncio/components/InputFields/AnnateMultiselectField";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import DateRangeFields from "@/features/pubblica-annuncio/components/InputFields/DateRangeFields";
import TipologiaCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from "@/components/ui/input-group";

export const PARTECIPAZIONE_EVENTO_OPTIONS = ["Libera", "Su prenotazione", "Privata"] as const;

export default function AnnuncioSocietaEnte() {
	const {nomeEnte, indirizzo, presentazione, contatti, evento, setField} = useAnnuncioSocietaEnteStore();

	const updateEvento = <K extends keyof EventoSocietaEnte>(field: K, value: EventoSocietaEnte[K]) => {
		setField("evento", (previous) => ({...previous, [field]: value}));
	};

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Dati ente</FieldLegend>
					{nomeEnte.trim() === "" && <FieldDescription className="font-medium text-red-800">Il nome dell&apos;ente è obbligatorio.</FieldDescription>}
				</div>

				<Field>
					<FieldLabel htmlFor="societa-ente-nome">Nome ente</FieldLabel>
					<Input id="societa-ente-nome" value={nomeEnte} onChange={(event) => setField("nomeEnte", event.target.value)} placeholder="A.S.D. Centro Sportivo Esempio" required />
				</Field>

				<Field>
					<FieldLabel htmlFor="societa-ente-indirizzo">Indirizzo evento</FieldLabel>
					<Input id="societa-ente-indirizzo" value={indirizzo} onChange={(event) => setField("indirizzo", event.target.value)} placeholder="Via Roma 1, Milano" />
				</Field>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="societa-ente-presentazione">Breve presentazione</FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazione.length}/5000</span>
					</div>
					<Textarea
						id="societa-ente-presentazione"
						value={presentazione}
						onChange={(event) => setField("presentazione", event.target.value.slice(0, 5000))}
						maxLength={5000}
						placeholder="Descrivi l'ente, gli obiettivi, lo staff e le attività principali..."
						className="min-h-40 resize-y"
					/>
				</Field>
			</FieldSet>

			<ContattiAnnuncioFields contatti={contatti} setContatti={(value) => setField("contatti", value)} />

			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Evento / Open day / allenamento</FieldLegend>
					<FieldDescription>Inserisci i dettagli dell&apos;iniziativa che vuoi promuovere.</FieldDescription>
				</div>

				<DateRangeFields
					idPrefix="societa-ente-evento-periodo"
					from={evento.periodoDa}
					setFrom={(value) => updateEvento("periodoDa", value)}
					to={evento.periodoA}
					setTo={(value) => updateEvento("periodoA", value)}
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="societa-ente-evento-orario">Orario</FieldLabel>
						<Input id="societa-ente-evento-orario" value={evento.orario} onChange={(event) => updateEvento("orario", event.target.value)} placeholder="Es. 18:00-20:00" />
					</Field>

					<TipologiaCalcioMultiselectField value={evento.tipologieCalcio} onValueChange={(value) => updateEvento("tipologieCalcio", value)} />
				</div>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="societa-ente-evento-descrizione">Descrizione evento</FieldLabel>
						<span className="text-xs text-muted-foreground">{evento.descrizioneEvento.length}/5000</span>
					</div>
					<Textarea
						id="societa-ente-evento-descrizione"
						value={evento.descrizioneEvento}
						onChange={(event) => updateEvento("descrizioneEvento", event.target.value.slice(0, 5000))}
						maxLength={5000}
						placeholder="Obiettivo dell'evento, programma, staff coinvolto, dettagli organizzativi..."
						className="min-h-32 resize-y"
					/>
				</Field>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="societa-ente-evento-requisiti">Modalità iscrizione e requisiti</FieldLabel>
						<span className="text-xs text-muted-foreground">{evento.modalitaIscrizioneRequisiti.length}/2000</span>
					</div>
					<Textarea
						id="societa-ente-evento-requisiti"
						value={evento.modalitaIscrizioneRequisiti}
						onChange={(event) => updateEvento("modalitaIscrizioneRequisiti", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Come iscriversi, documenti richiesti, certificati, autorizzazioni..."
						className="min-h-28 resize-y"
					/>
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="societa-ente-evento-scadenza">Scadenza iscrizioni</FieldLabel>
						<Input id="societa-ente-evento-scadenza" type="date" value={evento.scadenzaIscrizioni} onChange={(event) => updateEvento("scadenzaIscrizioni", event.target.value)} />
					</Field>

					<Field>
						<FieldLabel>Partecipazione</FieldLabel>
						<Select value={evento.partecipazione || null} onValueChange={(value) => updateEvento("partecipazione", value ?? "")}>
							<SelectTrigger className="w-full"><SelectValue placeholder="Non specificata" /></SelectTrigger>
							<SelectContent>
								<SelectItem value={null}>Non specificata</SelectItem>
								{PARTECIPAZIONE_EVENTO_OPTIONS.map((opzione) => <SelectItem key={opzione} value={opzione}>{opzione}</SelectItem>)}
							</SelectContent>
						</Select>
					</Field>
				</div>

				<AnnateMultiselectField label="Annate ammesse" value={evento.annateAmmesse} onValueChange={(value) => updateEvento("annateAmmesse", value)} placeholder="Seleziona annate ammesse..." />

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="societa-ente-evento-livello">Livello indicativo</FieldLabel>
						<span className="text-xs text-muted-foreground">{evento.livelloIndicativo.length}/2000</span>
					</div>
					<Textarea
						id="societa-ente-evento-livello"
						value={evento.livelloIndicativo}
						onChange={(event) => updateEvento("livelloIndicativo", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Livello tecnico, categoria, esperienza consigliata..."
						className="min-h-24 resize-y"
					/>
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="societa-ente-evento-costo">Costo partecipazione</FieldLabel>
						<InputGroup>
							<InputGroupAddon>
								<InputGroupText>&euro;</InputGroupText>
							</InputGroupAddon>
							<InputGroupInput
								id="societa-ente-evento-costo"
								type="number"
								min={0}
								value={evento.costoPartecipazione}
								onChange={(event) =>
									updateEvento("costoPartecipazione", event.target.value)
								}
								placeholder="0"
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>EUR</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</Field>
					<Field>
						<FieldLabel htmlFor="societa-ente-evento-posti">Posti disponibili</FieldLabel>
						<Input id="societa-ente-evento-posti" type="number" min={0} value={evento.postiDisponibili} onChange={(event) => updateEvento("postiDisponibili", event.target.value)} placeholder="30" />
					</Field>
				</div>
			</FieldSet>
		</FieldGroup>
	);
}
