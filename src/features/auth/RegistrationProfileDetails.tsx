import type {ComponentProps} from "react";

import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import RegistrationRegionsField from "@/features/auth/RegistrationRegionsField";
import type {RegistrationProfileDraft, RegistrationProfileType} from "@/features/auth/registration-profile";
import {
	FIGURA_PROFESSIONALE_OPTIONS,
	MODALITA_ISCRIZIONE_OPTIONS,
	MODALITA_SERVIZIO_OPTIONS,
	RUOLI_SPECIFICI_PER_RUOLO,
	RUOLO_PRINCIPALE_OPTIONS,
	TIPOLOGIA_CALCIO_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type SelectOption = {value: string; label: string};

interface RegistrationProfileDetailsProps {
	type: RegistrationProfileType;
	draft: RegistrationProfileDraft;
	regions: string[];
	showErrors: boolean;
	onChange: (field: string, value: string) => void;
	onRegionsChange: (regions: string[]) => void;
}

interface ProfileTextFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	placeholder?: string;
	type?: ComponentProps<typeof Input>["type"];
	min?: ComponentProps<typeof Input>["min"];
	step?: ComponentProps<typeof Input>["step"];
	maxLength?: number;
	showErrors: boolean;
}

function RequiredMarker() {
	return <span aria-hidden="true" className="text-destructive">*</span>;
}

function ProfileTextField({
	id,
	label,
	value,
	onChange,
	required = false,
	placeholder,
	type = "text",
	min,
	step,
	maxLength = 160,
	showErrors,
}: ProfileTextFieldProps) {
	const invalid = showErrors && required && !value.trim();

	return (
		<Field data-invalid={invalid}>
			<FieldLabel htmlFor={id}>{label} {required && <RequiredMarker />}</FieldLabel>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				min={min}
				step={step}
				maxLength={maxLength}
				aria-invalid={invalid}
				aria-required={required}
			/>
			{invalid && <FieldError>Campo obbligatorio.</FieldError>}
		</Field>
	);
}

interface ProfileTextareaFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	placeholder?: string;
	maxLength?: number;
	showErrors: boolean;
}

function ProfileTextareaField({
	id,
	label,
	value,
	onChange,
	required = false,
	placeholder,
	maxLength = 2000,
	showErrors,
}: ProfileTextareaFieldProps) {
	const invalid = showErrors && required && !value.trim();

	return (
		<Field data-invalid={invalid}>
			<div className="flex items-center justify-between gap-3">
				<FieldLabel htmlFor={id}>{label} {required && <RequiredMarker />}</FieldLabel>
				<span className="text-xs text-muted-foreground">{value.length}/{maxLength}</span>
			</div>
			<Textarea
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
				placeholder={placeholder}
				maxLength={maxLength}
				aria-invalid={invalid}
				aria-required={required}
				className="min-h-28 resize-y"
			/>
			{invalid && <FieldError>Campo obbligatorio.</FieldError>}
		</Field>
	);
}

interface ProfileSelectFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly SelectOption[];
	required?: boolean;
	disabled?: boolean;
	placeholder?: string;
	showErrors: boolean;
}

function ProfileSelectField({
	id,
	label,
	value,
	onChange,
	options,
	required = false,
	disabled = false,
	placeholder = "Seleziona",
	showErrors,
}: ProfileSelectFieldProps) {
	const invalid = showErrors && required && !value.trim();
	const items = [{value: null, label: placeholder}, ...options];

	return (
		<Field data-invalid={invalid} data-disabled={disabled}>
			<FieldLabel htmlFor={id}>{label} {required && <RequiredMarker />}</FieldLabel>
			<Select
				items={items}
				value={value || null}
				onValueChange={(nextValue) => onChange(nextValue ?? "")}
				disabled={disabled}
			>
				<SelectTrigger id={id} className="w-full" aria-invalid={invalid} aria-required={required}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{items.map((item) => (
							<SelectItem key={item.value ?? "empty"} value={item.value}>{item.label}</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{invalid && <FieldError>Campo obbligatorio.</FieldError>}
		</Field>
	);
}

const footballTypeOptions = TIPOLOGIA_CALCIO_OPTIONS.map((value) => ({value, label: value}));
const primaryRoleOptions = RUOLO_PRINCIPALE_OPTIONS.map((value) => ({value, label: value}));
const professionalRoleOptions = FIGURA_PROFESSIONALE_OPTIONS.map((value) => ({value, label: value}));
const yesNoOptions = [
	{value: "si", label: "Sì"},
	{value: "no", label: "No"},
];
const serviceModeOptions = MODALITA_SERVIZIO_OPTIONS.map((option) => ({value: option.valore, label: option.etichetta}));
const registrationModeOptions = MODALITA_ISCRIZIONE_OPTIONS.map((option) => ({value: option.valore, label: option.etichetta}));

export default function RegistrationProfileDetails({
	type,
	draft,
	regions,
	showErrors,
	onChange,
	onRegionsChange,
}: RegistrationProfileDetailsProps) {
	const prefix = `registration-profile-${type}`;
	const commonProps = {showErrors};

	return (
		<FieldSet>
			<FieldLegend>Completa il tuo profilo</FieldLegend>
			<FieldDescription>
				I campi contrassegnati con * sono obbligatori. Queste informazioni servono soltanto a simulare il flusso e non saranno ancora salvate.
			</FieldDescription>
			<FieldGroup className="grid gap-4 mt-4">
				{type === "giocatore" && (
					<>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
							<ProfileSelectField id={`${prefix}-football-type`} label="Tipologia calcio" value={draft.footballType} onChange={(value) => onChange("footballType", value)} options={footballTypeOptions} required {...commonProps} />
							<ProfileSelectField
								id={`${prefix}-primary-role`}
								label="Ruolo principale"
								value={draft.primaryRole}
								onChange={(value) => {
									onChange("primaryRole", value);
									if (!(RUOLI_SPECIFICI_PER_RUOLO[value] ?? []).includes(draft.specificRole)) onChange("specificRole", "");
								}}
								options={primaryRoleOptions}
								required
								{...commonProps}
							/>
							<ProfileSelectField id={`${prefix}-specific-role`} label="Ruolo specifico" value={draft.specificRole} onChange={(value) => onChange("specificRole", value)} options={(RUOLI_SPECIFICI_PER_RUOLO[draft.primaryRole] ?? []).map((value) => ({value, label: value}))} disabled={!draft.primaryRole || (RUOLI_SPECIFICI_PER_RUOLO[draft.primaryRole] ?? []).length === 0} {...commonProps} />
							<ProfileTextField id={`${prefix}-zone`} label="Zona" value={draft.zone} onChange={(value) => onChange("zone", value)} placeholder="Città o provincia" required {...commonProps} />
							<ProfileTextField id={`${prefix}-birth-date`} label="Data di nascita" value={draft.birthDate} onChange={(value) => onChange("birthDate", value)} type="date" {...commonProps} />
						</FieldGroup>
						<ProfileTextareaField id={`${prefix}-presentation`} label="Breve presentazione" value={draft.presentation} onChange={(value) => onChange("presentation", value)} placeholder="Esperienze, caratteristiche tecniche, disponibilità e obiettivi..." {...commonProps} />
					</>
				)}

				{type === "squadra" && (
					<>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
							<ProfileTextField id={`${prefix}-club-name`} label="Nome società" value={draft.clubName} onChange={(value) => onChange("clubName", value)} placeholder="A.S.D. Esempio Calcio" required {...commonProps} />
							<ProfileSelectField id={`${prefix}-football-type`} label="Tipologia principale" value={draft.footballType} onChange={(value) => onChange("footballType", value)} options={footballTypeOptions} required {...commonProps} />
							<ProfileTextField id={`${prefix}-headquarters`} label="Sede" value={draft.headquarters} onChange={(value) => onChange("headquarters", value)} placeholder="Città o indirizzo della sede" required {...commonProps} />
						</FieldGroup>
						<ProfileTextareaField id={`${prefix}-presentation`} label="Breve presentazione" value={draft.presentation} onChange={(value) => onChange("presentation", value)} placeholder="Storia, categorie, obiettivi e valori della società..." maxLength={5000} {...commonProps} />
					</>
				)}

				{type === "arbitro" && (
					<>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
							<ProfileSelectField id={`${prefix}-football-type`} label="Tipologia calcio" value={draft.footballType} onChange={(value) => onChange("footballType", value)} options={footballTypeOptions} required {...commonProps} />
							<ProfileTextField id={`${prefix}-zone`} label="Zona" value={draft.zone} onChange={(value) => onChange("zone", value)} placeholder="Città o provincia" required {...commonProps} />
							<ProfileTextField id={`${prefix}-birth-date`} label="Data di nascita" value={draft.birthDate} onChange={(value) => onChange("birthDate", value)} type="date" {...commonProps} />
							<ProfileSelectField id={`${prefix}-has-car`} label="Automunito" value={draft.hasCar} onChange={(value) => onChange("hasCar", value)} options={yesNoOptions} {...commonProps} />
						</FieldGroup>
						<ProfileTextareaField id={`${prefix}-presentation`} label="Esperienza e presentazione" value={draft.presentation} onChange={(value) => onChange("presentation", value)} placeholder="Esperienza arbitrale, categorie seguite e disponibilità..." {...commonProps} />
					</>
				)}

				{type === "creators" && (
					<>
						<ProfileTextField id={`${prefix}-creator-name`} label="Nome creator" value={draft.creatorName} onChange={(value) => onChange("creatorName", value)} placeholder="Nome del creator o del progetto" required {...commonProps} />
						<RegistrationRegionsField idPrefix={`${prefix}-regions`} value={regions} onValueChange={onRegionsChange} showErrors={showErrors} />
						<ProfileTextField id={`${prefix}-content-type`} label="Tipologia di contenuti" value={draft.contentType} onChange={(value) => onChange("contentType", value)} placeholder="Video, podcast, analisi, interviste..." {...commonProps} />
						<ProfileTextareaField id={`${prefix}-presentation`} label="Breve presentazione" value={draft.presentation} onChange={(value) => onChange("presentation", value)} placeholder="Racconta chi sei e quali contenuti sportivi condividi..." {...commonProps} />
					</>
				)}

				{type === "staff-sportivo" && (
					<>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
							<ProfileSelectField id={`${prefix}-professional-role`} label="Figura professionale" value={draft.professionalRole} onChange={(value) => onChange("professionalRole", value)} options={professionalRoleOptions} required {...commonProps} />
							<ProfileSelectField id={`${prefix}-football-type`} label="Tipologia calcio" value={draft.footballType} onChange={(value) => onChange("footballType", value)} options={footballTypeOptions} required {...commonProps} />
							<ProfileTextField id={`${prefix}-zone`} label="Zona" value={draft.zone} onChange={(value) => onChange("zone", value)} placeholder="Città o provincia" required {...commonProps} />
							<ProfileTextField id={`${prefix}-birth-date`} label="Data di nascita" value={draft.birthDate} onChange={(value) => onChange("birthDate", value)} type="date" {...commonProps} />
							<ProfileTextField id={`${prefix}-categories`} label="Categorie di interesse" value={draft.categories} onChange={(value) => onChange("categories", value)} placeholder="Settore giovanile, prime squadre..." {...commonProps} />
							<ProfileSelectField id={`${prefix}-travel`} label="Disponibilità agli spostamenti" value={draft.travelAvailability} onChange={(value) => onChange("travelAvailability", value)} options={yesNoOptions} {...commonProps} />
						</FieldGroup>
						<ProfileTextareaField id={`${prefix}-presentation`} label="Breve presentazione" value={draft.presentation} onChange={(value) => onChange("presentation", value)} placeholder="Esperienze, competenze, disponibilità e metodo di lavoro..." {...commonProps} />
					</>
				)}

				{type === "professionisti-studi" && (
					<>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
							<ProfileTextField id={`${prefix}-first-name`} label="Nome" value={draft.firstName} onChange={(value) => onChange("firstName", value)} placeholder="Mario" required {...commonProps} />
							<ProfileTextField id={`${prefix}-last-name`} label="Cognome" value={draft.lastName} onChange={(value) => onChange("lastName", value)} placeholder="Rossi" required {...commonProps} />
							<ProfileTextField id={`${prefix}-professional-role`} label="Figura professionale" value={draft.professionalRole} onChange={(value) => onChange("professionalRole", value)} placeholder="Nutrizionista, psicologo, consulente..." required {...commonProps} />
							<ProfileTextField id={`${prefix}-specialization`} label="Specializzazione" value={draft.specialization} onChange={(value) => onChange("specialization", value)} placeholder="Ambito o disciplina" required {...commonProps} />
							<ProfileSelectField id={`${prefix}-service-mode`} label="Modalità del servizio" value={draft.serviceMode} onChange={(value) => onChange("serviceMode", value)} options={serviceModeOptions} {...commonProps} />
							<ProfileTextField id={`${prefix}-zone`} label="Sede / zona servita" value={draft.zone} onChange={(value) => onChange("zone", value)} placeholder="Città, provincia o territorio" {...commonProps} />
						</FieldGroup>
						<ProfileTextareaField id={`${prefix}-services`} label="Servizi offerti" value={draft.services} onChange={(value) => onChange("services", value)} placeholder="Descrivi consulenze, percorsi e prestazioni..." required {...commonProps} />
						<ProfileTextareaField id={`${prefix}-qualifications`} label="Qualifiche / titoli / abilitazioni" value={draft.qualifications} onChange={(value) => onChange("qualifications", value)} placeholder="Titoli di studio, albo e certificazioni..." {...commonProps} />
						<ProfileTextareaField id={`${prefix}-experience`} label="Esperienza" value={draft.experience} onChange={(value) => onChange("experience", value)} placeholder="Esperienze professionali e collaborazioni rilevanti..." {...commonProps} />
					</>
				)}

				{type === "torneo-evento" && (
					<>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
							<ProfileTextField id={`${prefix}-event-name`} label="Nome torneo / evento" value={draft.eventName} onChange={(value) => onChange("eventName", value)} placeholder="Torneo estivo" required {...commonProps} />
							<ProfileTextField id={`${prefix}-location`} label="Sede / zona" value={draft.location} onChange={(value) => onChange("location", value)} placeholder="Città o impianto" required {...commonProps} />
							<ProfileSelectField id={`${prefix}-registration-mode`} label="Modalità di iscrizione" value={draft.registrationMode} onChange={(value) => onChange("registrationMode", value)} options={registrationModeOptions} {...commonProps} />
							<ProfileTextField id={`${prefix}-age-range`} label="Annate ammesse" value={draft.ageRange} onChange={(value) => onChange("ageRange", value)} placeholder="Es. 2010–2012" {...commonProps} />
							<ProfileTextField id={`${prefix}-teams`} label="Numero squadre" value={draft.teams} onChange={(value) => onChange("teams", value)} placeholder="16" type="number" min={1} {...commonProps} />
							<ProfileTextField id={`${prefix}-cost`} label="Costo partecipazione" value={draft.cost} onChange={(value) => onChange("cost", value)} placeholder="0,00 EUR" type="number" min={0} step={0.01} {...commonProps} />
						</FieldGroup>
						<ProfileTextareaField id={`${prefix}-additional-info`} label="Informazioni aggiuntive" value={draft.additionalInfo} onChange={(value) => onChange("additionalInfo", value)} placeholder="Programma, regolamento, date e altre informazioni..." {...commonProps} />
					</>
				)}

				{type === "campi-impianti-sportivi" && (
					<>
						<FieldGroup className="grid gap-4 sm:grid-cols-2">
							<ProfileTextField id={`${prefix}-venue-name`} label="Nome campo / impianto" value={draft.venueName} onChange={(value) => onChange("venueName", value)} placeholder="Centro Sportivo Esempio" required {...commonProps} />
							<ProfileTextField id={`${prefix}-address`} label="Indirizzo" value={draft.address} onChange={(value) => onChange("address", value)} placeholder="Via Roma 1, Milano" required {...commonProps} />
							<ProfileTextField id={`${prefix}-hours`} label="Orari" value={draft.hours} onChange={(value) => onChange("hours", value)} placeholder="Lun–Ven 18:00–23:00" {...commonProps} />
							<ProfileTextField id={`${prefix}-hourly-cost`} label="Costo orario" value={draft.hourlyCost} onChange={(value) => onChange("hourlyCost", value)} placeholder="50 EUR" type="number" min={0} step={0.01} {...commonProps} />
						</FieldGroup>
						<ProfileTextareaField id={`${prefix}-presentation`} label="Breve presentazione" value={draft.presentation} onChange={(value) => onChange("presentation", value)} placeholder="Descrivi gli spazi e le caratteristiche dell'impianto..." maxLength={5000} {...commonProps} />
						<ProfileTextareaField id={`${prefix}-services`} label="Servizi inclusi" value={draft.services} onChange={(value) => onChange("services", value)} placeholder="Spogliatoi, illuminazione, parcheggio, bar..." {...commonProps} />
					</>
				)}

				{type !== "creators" && (
					<RegistrationRegionsField idPrefix={`${prefix}-regions`} value={regions} onValueChange={onRegionsChange} showErrors={showErrors} />
				)}
			</FieldGroup>
		</FieldSet>
	);
}
