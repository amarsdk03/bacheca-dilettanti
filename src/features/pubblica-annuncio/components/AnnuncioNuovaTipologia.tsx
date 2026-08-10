"use client";

import type {ReactNode} from "react";

import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import {
	type TipologiaAnnuncioNuova,
	useAnnuncioAziendeEntiStore,
	useAnnuncioProfessionistiStudiStore,
	useAnnuncioTorneoEventoStore,
} from "@/features/pubblica-annuncio/state/AnnuncioNuoveTipologie.store";

const MODALITA_SERVIZIO_OPTIONS = [
	{valore: "in-presenza", etichetta: "In presenza"},
	{valore: "online", etichetta: "Online"},
	{valore: "entrambe", etichetta: "Entrambe"},
] as const;

const DISPONIBILITA_SPOSTAMENTI_OPTIONS = [
	{valore: "si", etichetta: "Sì"},
	{valore: "no", etichetta: "No"},
] as const;

const MODALITA_ISCRIZIONE_OPTIONS = [
	{valore: "libera", etichetta: "Libera"},
	{valore: "posti-limitati", etichetta: "Posti limitati"},
] as const;

const ANNATE_TORNEO_OPTIONS = Array.from({length: 40}, (_, index) =>
	String(new Date().getFullYear() - index)
);

type TextFieldProps = {
	id: string;
	label: ReactNode;
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	required?: boolean;
	type?: "text" | "number";
	min?: number;
	step?: number;
};

function TextField({
	id,
	label,
	value,
	onValueChange,
	placeholder,
	required = false,
	type = "text",
	min,
	step,
}: TextFieldProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>
				{label} {!required && <OptionalLabel />}
			</FieldLabel>
			<Input
				id={id}
				type={type}
				min={min}
				step={step}
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				placeholder={placeholder}
				required={required}
			/>
		</Field>
	);
}

type TextareaFieldProps = {
	id: string;
	label: ReactNode;
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	maxLength?: number;
};

function TextareaField({
	id,
	label,
	value,
	onValueChange,
	placeholder,
	maxLength = 2000,
}: TextareaFieldProps) {
	return (
		<Field>
			<div className="flex items-center justify-between gap-3">
				<FieldLabel htmlFor={id}>
					{label} <OptionalLabel />
				</FieldLabel>
				<span className="text-xs text-muted-foreground">{value.length}/{maxLength}</span>
			</div>
			<Textarea
				id={id}
				value={value}
				onChange={(event) => onValueChange(event.target.value.slice(0, maxLength))}
				maxLength={maxLength}
				placeholder={placeholder}
				className="min-h-28 resize-y"
			/>
		</Field>
	);
}

function FormHeader({titolo, descrizione}: {titolo: string; descrizione?: string}) {
	return (
		<div className="mt-4">
			<FieldLegend variant="label" className="field-legend-title mb-0">{titolo}</FieldLegend>
			{descrizione && <FieldDescription>{descrizione}</FieldDescription>}
		</div>
	);
}

function AnnuncioAziendeEnti() {
	const data = useAnnuncioAziendeEntiStore();

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<FormHeader
					titolo="Dati azienda / ente"
					descrizione="Presenta l'attività, i servizi e le realtà sportive a cui ti rivolgi."
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="aziende-enti-nome-ragione-sociale"
						label="Nome / ragione sociale"
						value={data.nomeRagioneSociale}
						onValueChange={(value) => data.setField("nomeRagioneSociale", value)}
						placeholder="Azienda o ente"
					/>
					<TextField
						id="aziende-enti-tipologia-attivita"
						label="Tipologia di attività"
						value={data.tipologiaAttivita}
						onValueChange={(value) => data.setField("tipologiaAttivita", value)}
						placeholder="Formazione, consulenza, servizi..."
					/>
					<TextField
						id="aziende-enti-contatto"
						label="Contatto"
						value={data.contatto}
						onValueChange={(value) => data.setField("contatto", value)}
						placeholder="Email, telefono o referente"
					/>
					<TextField
						id="aziende-enti-sede"
						label="Sede"
						value={data.sede}
						onValueChange={(value) => data.setField("sede", value)}
						placeholder="Città o indirizzo della sede"
					/>
				</div>

				<TextareaField
					id="aziende-enti-servizi-offerti"
					label="Servizi offerti"
					value={data.serviziOfferti}
					onValueChange={(value) => data.setField("serviziOfferti", value)}
					placeholder="Descrivi i servizi disponibili..."
				/>
			</FieldSet>

			<RegioniInteresseField
				idPrefix="aziende-enti-zona-operativa"
				titolo="Zona operativa"
				required={false}
				regioniInteressate={data.regioniInteressate}
				setRegioniInteressate={(value) => data.setField("regioniInteressate", value)}
				cittaComuniPerRegione={data.cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) => data.setField("cittaComuniPerRegione", value)}
			/>

			<FieldSet>
				<FormHeader titolo="Presentazione e destinatari" />
				<TextareaField
					id="aziende-enti-categorie-destinatarie"
					label="Categorie / realtà a cui si rivolge"
					value={data.categorieDestinatarie}
					onValueChange={(value) => data.setField("categorieDestinatarie", value)}
					placeholder="Settori giovanili, prime squadre, società, atleti..."
				/>
				<TextareaField
					id="aziende-enti-esperienza-presentazione"
					label="Esperienza / presentazione"
					value={data.esperienzaPresentazione}
					onValueChange={(value) => data.setField("esperienzaPresentazione", value)}
					placeholder="Racconta l'esperienza e presenta la realtà..."
				/>
				<TextareaField
					id="aziende-enti-qualifiche-certificazioni"
					label="Qualifiche / certificazioni"
					value={data.qualificheCertificazioni}
					onValueChange={(value) => data.setField("qualificheCertificazioni", value)}
					placeholder="Certificazioni, accreditamenti, qualifiche..."
				/>
				<TextareaField
					id="aziende-enti-info-aggiuntive"
					label="Descrizione / info aggiuntive"
					value={data.infoAggiuntive}
					onValueChange={(value) => data.setField("infoAggiuntive", value)}
					placeholder="Aggiungi eventuali altre informazioni..."
				/>
				<LinkAnnuncioPremiumField
					idPrefix="aziende-enti"
					tipologia="aziende-enti"
					value={data.linkAnnuncio}
					onValueChange={(value) => data.setField("linkAnnuncio", value)}
				/>
			</FieldSet>
		</FieldGroup>
	);
}

function AnnuncioProfessionistiStudi() {
	const data = useAnnuncioProfessionistiStudiStore();

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<FormHeader
					titolo="Dati professionista / studio"
					descrizione="Descrivi la tua figura professionale e i servizi offerti al mondo sportivo."
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="professionisti-studi-nome-cognome"
						label="Nome e cognome"
						value={data.nomeCognome}
						onValueChange={(value) => data.setField("nomeCognome", value)}
						placeholder="Mario Rossi"
					/>
					<TextField
						id="professionisti-studi-figura-professionale"
						label="Figura professionale"
						value={data.figuraProfessionale}
						onValueChange={(value) => data.setField("figuraProfessionale", value)}
						placeholder="Nutrizionista, psicologo, consulente..."
					/>
					<TextField
						id="professionisti-studi-specializzazione"
						label="Specializzazione"
						value={data.specializzazione}
						onValueChange={(value) => data.setField("specializzazione", value)}
						placeholder="Ambito o disciplina di specializzazione"
					/>
				</div>
			</FieldSet>

			<ContattiAnnuncioFields
				contatti={data.contatti}
				setContatti={(value) => data.setField("contatti", value)}
				required={false}
			/>

			<FieldSet>
				<FormHeader titolo="Servizio" />
				<TextareaField
					id="professionisti-studi-servizi-offerti"
					label="Servizi offerti"
					value={data.serviziOfferti}
					onValueChange={(value) => data.setField("serviziOfferti", value)}
					placeholder="Descrivi consulenze, percorsi e prestazioni..."
				/>

				<Field>
					<FieldLabel>Modalità del servizio <OptionalLabel /></FieldLabel>
					<Select
						value={data.modalitaServizio || null}
						onValueChange={(value) => data.setField("modalitaServizio", value ?? "")}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Non specificato" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={null}>Non specificare</SelectItem>
							{MODALITA_SERVIZIO_OPTIONS.map((opzione) => (
								<SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			</FieldSet>

			<RegioniInteresseField
				idPrefix="professionisti-studi-zona-operativa"
				titolo="Zona operativa"
				required={false}
				regioniInteressate={data.regioniInteressate}
				setRegioniInteressate={(value) => data.setField("regioniInteressate", value)}
				cittaComuniPerRegione={data.cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) => data.setField("cittaComuniPerRegione", value)}
			/>

			<FieldSet>
				<FormHeader titolo="Esperienza e disponibilità" />
				<TextareaField
					id="professionisti-studi-categorie-destinatarie"
					label="Categorie / realtà a cui si rivolge"
					value={data.categorieDestinatarie}
					onValueChange={(value) => data.setField("categorieDestinatarie", value)}
					placeholder="Settore giovanile, prime squadre, singoli calciatori, società..."
				/>
				<TextareaField
					id="professionisti-studi-qualifiche"
					label="Qualifiche / titoli / abilitazioni"
					value={data.qualificheTitoliAbilitazioni}
					onValueChange={(value) => data.setField("qualificheTitoliAbilitazioni", value)}
					placeholder="Titoli di studio, albo, abilitazioni e certificazioni..."
				/>
				<TextareaField
					id="professionisti-studi-esperienza"
					label="Esperienza"
					value={data.esperienza}
					onValueChange={(value) => data.setField("esperienza", value)}
					placeholder="Esperienze professionali e collaborazioni rilevanti..."
				/>

				<Field>
					<FieldLabel>Disponibilità agli spostamenti <OptionalLabel /></FieldLabel>
					<Select
						value={data.disponibilitaSpostamenti || null}
						onValueChange={(value) => data.setField("disponibilitaSpostamenti", value ?? "")}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Non specificato" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={null}>Non specificare</SelectItem>
							{DISPONIBILITA_SPOSTAMENTI_OPTIONS.map((opzione) => (
								<SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<TextareaField
					id="professionisti-studi-info-aggiuntive"
					label="Info aggiuntive"
					value={data.infoAggiuntive}
					onValueChange={(value) => data.setField("infoAggiuntive", value)}
					placeholder="Aggiungi eventuali altre informazioni..."
				/>
				<LinkAnnuncioPremiumField
					idPrefix="professionisti-studi"
					tipologia="professionisti-studi"
					value={data.linkAnnuncio}
					onValueChange={(value) => data.setField("linkAnnuncio", value)}
				/>
			</FieldSet>
		</FieldGroup>
	);
}

function AnnuncioTorneoEvento() {
	const data = useAnnuncioTorneoEventoStore();
	const intervalloAnnateValido =
		data.annataDa === "" ||
		data.annataA === "" ||
		Number(data.annataDa) <= Number(data.annataA);

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<FormHeader titolo="Dati torneo / evento" descrizione="Inserisci le informazioni utili per squadre e partecipanti." />
				{data.nome.trim() === "" && (
					<FieldDescription className="font-medium text-red-800">
						Il nome del torneo o evento è obbligatorio.
					</FieldDescription>
				)}
				<TextField
					id="torneo-evento-nome"
					label="Nome torneo / evento"
					value={data.nome}
					onValueChange={(value) => data.setField("nome", value)}
					placeholder="Torneo estivo 2026"
					required
				/>
			</FieldSet>

			<RegioniInteresseField
				idPrefix="torneo-evento-luogo"
				titolo="Luogo"
				required={false}
				regioniInteressate={data.regioniInteressate}
				setRegioniInteressate={(value) => data.setField("regioniInteressate", value)}
				cittaComuniPerRegione={data.cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) => data.setField("cittaComuniPerRegione", value)}
			/>

			<FieldSet>
				<FormHeader titolo="Iscrizioni e partecipazione" />
				<Field>
					<FieldLabel>Modalità di iscrizione <OptionalLabel /></FieldLabel>
					<Select
						value={data.modalitaIscrizione || null}
						onValueChange={(value) => data.setField("modalitaIscrizione", value ?? "")}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Non specificata" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={null}>Non specificare</SelectItem>
							{MODALITA_ISCRIZIONE_OPTIONS.map((opzione) => (
								<SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel>Annate ammesse: da <OptionalLabel /></FieldLabel>
						<Select value={data.annataDa || null} onValueChange={(value) => data.setField("annataDa", value ?? "")}>
							<SelectTrigger className="w-full"><SelectValue placeholder="Da" /></SelectTrigger>
							<SelectContent>
								<SelectItem value={null}>Non specificare</SelectItem>
								{ANNATE_TORNEO_OPTIONS.map((annata) => <SelectItem key={annata} value={annata}>{annata}</SelectItem>)}
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel>Annate ammesse: a <OptionalLabel /></FieldLabel>
						<Select value={data.annataA || null} onValueChange={(value) => data.setField("annataA", value ?? "")}>
							<SelectTrigger className="w-full"><SelectValue placeholder="A" /></SelectTrigger>
							<SelectContent>
								<SelectItem value={null}>Non specificare</SelectItem>
								{ANNATE_TORNEO_OPTIONS.map((annata) => <SelectItem key={annata} value={annata}>{annata}</SelectItem>)}
							</SelectContent>
						</Select>
					</Field>
				</div>
				{!intervalloAnnateValido && (
					<FieldDescription className="font-medium text-red-800">
						L&apos;annata iniziale deve essere precedente o uguale a quella finale.
					</FieldDescription>
				)}

				<div className="grid gap-4 sm:grid-cols-2">
					<TextField
						id="torneo-evento-numero-posti"
						label="Numero di posti per squadre"
						value={data.numeroPostiSquadre}
						onValueChange={(value) => data.setField("numeroPostiSquadre", value)}
						placeholder="16"
						type="number"
						min={1}
						step={1}
					/>
					<Field>
						<FieldLabel htmlFor="torneo-evento-costo">Costo partecipazione <OptionalLabel /></FieldLabel>
						<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
							<Input
								id="torneo-evento-costo"
								type="number"
								min={0}
								step={0.01}
								value={data.costoPartecipazione}
								onChange={(event) => data.setField("costoPartecipazione", event.target.value)}
								placeholder="0,00 EUR"
							/>
							<Select value={data.costoPer} onValueChange={(value) => data.setField("costoPer", value ?? "squadra")}>
								<SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="giocatore">Per giocatore</SelectItem>
									<SelectItem value="squadra">Per squadra</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</Field>
				</div>

				<TextareaField
					id="torneo-evento-info-aggiuntive"
					label="Informazioni aggiuntive"
					value={data.infoAggiuntive}
					onValueChange={(value) => data.setField("infoAggiuntive", value)}
					placeholder="Programma, regolamento, date e altre informazioni utili..."
				/>
				<LinkAnnuncioPremiumField
					idPrefix="torneo-evento"
					tipologia="torneo-evento"
					value={data.linkAnnuncio}
					onValueChange={(value) => data.setField("linkAnnuncio", value)}
				/>
			</FieldSet>
		</FieldGroup>
	);
}

export default function AnnuncioNuovaTipologia({tipologia}: {tipologia: TipologiaAnnuncioNuova}) {
	switch (tipologia) {
		case "aziende-enti":
			return <AnnuncioAziendeEnti />;
		case "professionisti-studi":
			return <AnnuncioProfessionistiStudi />;
		case "torneo-evento":
			return <AnnuncioTorneoEvento />;
	}
}
