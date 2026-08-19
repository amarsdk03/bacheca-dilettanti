"use client";

import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {
	type DisponibilitaCampoImpianto,
	useAnnuncioCampoImpiantoStore,
} from "@/features/pubblica-annuncio/state/AnnuncioCampoImpianto.store";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from "@/components/ui/input-group";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import ImmagineAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioPremiumField";

export default function AnnuncioCampoImpianto() {
	const {
		nomeImpianto,
		indirizzo,
		presentazione,
		contatti,
		regioniInteressate,
		cittaComuniPerRegione,
		disponibilita,
		immagineAnnuncio,
		linkAnnuncio,
		setField,
	} = useAnnuncioCampoImpiantoStore();

	const updateDisponibilita = <K extends keyof DisponibilitaCampoImpianto>(field: K, value: DisponibilitaCampoImpianto[K]) => {
		setField("disponibilita", (previous) => ({...previous, [field]: value}));
	};

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Dati campo / impianto</FieldLegend>
				</div>

				<Field>
					<FieldLabel htmlFor="campo-impianto-nome">Nome campo / impianto <OptionalLabel /></FieldLabel>
					<Input id="campo-impianto-nome" value={nomeImpianto} onChange={(event) => setField("nomeImpianto", event.target.value)} placeholder="Centro Sportivo Esempio" />
				</Field>
				<Field>
					<FieldLabel htmlFor="campo-impianto-indirizzo">Indirizzo <OptionalLabel /></FieldLabel>
					<Input id="campo-impianto-indirizzo" value={indirizzo} onChange={(event) => setField("indirizzo", event.target.value)} placeholder="Via Roma 1, Milano" />
				</Field>
				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="campo-impianto-presentazione">Breve presentazione <OptionalLabel /></FieldLabel>
						<span className="text-xs text-muted-foreground">{presentazione.length}/5000</span>
					</div>
					<Textarea
						id="campo-impianto-presentazione"
						value={presentazione}
						onChange={(event) => setField("presentazione", event.target.value.slice(0, 5000))}
						maxLength={5000}
						placeholder="Descrivi gli spazi, le attività ospitate e le caratteristiche dell'impianto..."
						className="min-h-36 resize-y"
					/>
				</Field>
			</FieldSet>

			<ContattiAnnuncioFields contatti={contatti} setContatti={(value) => setField("contatti", value)} />

			<RegioniInteresseField
				idPrefix="campo-impianto"
				regioniInteressate={regioniInteressate}
				setRegioniInteressate={(value) => setField("regioniInteressate", value)}
				cittaComuniPerRegione={cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) => setField("cittaComuniPerRegione", value)}
			/>

			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">Disponibilità campo / struttura</FieldLegend>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="campo-impianto-orario">Orario <OptionalLabel /></FieldLabel>
						<Input id="campo-impianto-orario" value={disponibilita.orario} onChange={(event) => updateDisponibilita("orario", event.target.value)} placeholder="Es. Lun-Ven 18:00-23:00" />
					</Field>
					<Field>

						<FieldLabel htmlFor="campo-impianto-costo">Costo orario <OptionalLabel /></FieldLabel>
						<InputGroup>
							<InputGroupAddon>
								<InputGroupText>&euro;</InputGroupText>
							</InputGroupAddon>
							<InputGroupInput
								id="campo-impianto-costo"
								type="number"
								min={0}
								value={disponibilita.costoOrario}
								onChange={(event) =>
									updateDisponibilita("costoOrario", event.target.value)
							}
								placeholder="50"
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>/ 1h</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</Field>
				</div>
				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="campo-impianto-servizi">Servizi inclusi <OptionalLabel /></FieldLabel>
						<span className="text-xs text-muted-foreground">{disponibilita.serviziInclusi.length}/2000</span>
					</div>
					<Textarea
						id="campo-impianto-servizi"
						value={disponibilita.serviziInclusi}
						onChange={(event) => updateDisponibilita("serviziInclusi", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Spogliatoi, illuminazione, materiale tecnico, parcheggio, bar..."
						className="min-h-28 resize-y"
					/>
				</Field>
			</FieldSet>
			<ImmagineAnnuncioPremiumField
				idPrefix="campo-impianto"
				tipologia="campi-impianti-sportivi"
				value={immagineAnnuncio}
				onValueChange={(value) => setField("immagineAnnuncio", value)}
			/>
			<LinkAnnuncioPremiumField
				idPrefix="campo-impianto"
				tipologia="campi-impianti-sportivi"
				value={linkAnnuncio}
				onValueChange={(value) => setField("linkAnnuncio", value)}
			/>
		</FieldGroup>
	);
}
