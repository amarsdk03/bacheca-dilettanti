import type {ComponentProps, Dispatch, SetStateAction} from "react";
import {PlusIcon, Trash2Icon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from "@/components/ui/input-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import ProfileLocationsField from "@/features/profilo/ProfileLocationsField";
import CategorieCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/CategorieCalcioMultiselectField";
import type {
	ProfileLocationDraft,
	ProfileDrafts,
	ProfileDraftUpdater,
	ProfileLocations,
	ProfileType,
} from "@/features/profilo/profile-model";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import DisponibilitaProfiloSelect from "@/features/pubblica-annuncio/components/InputFields/DisponibilitaProfiloSelect";
import EsperienzeAnnuncioFields, {
	createEsperienzaAnnuncio,
	type EsperienzaAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import FiguraProfessionaleMultiselectField from "@/features/pubblica-annuncio/components/InputFields/FiguraProfessionaleMultiselectField";
import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RuoloPrincipaleMultiselectField from "@/features/pubblica-annuncio/components/InputFields/RuoloPrincipaleMultiselectField";
import TipologiaCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";
import type {ProfileValidationErrors} from "@/features/pubblica-annuncio/publish-model";
import {
	DISPONIBILITA_PROFILO_OPTIONS,
	DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS,
	CATEGORIE_CALCIO_GROUPS,
	RUOLI_SPECIFICI_PER_RUOLO,
	type DisponibilitaProfilo,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import type {Json} from "@/server/supabase";

interface ProfileDetailsFormProps {
	type: ProfileType;
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onChange: ProfileDraftUpdater;
	onLocationsChange: (type: ProfileType, value: ProfileLocationDraft[]) => void;
	requiredFields?: boolean;
	errors?: ProfileValidationErrors;
}

function RequiredMark() {
	return <span aria-hidden="true" className="text-destructive">*</span>;
}

const MAIN_FOOT_OPTIONS = [
	{value: "Destro", label: "Destro"},
	{value: "Sinistro", label: "Sinistro"},
	{value: "Ambipiede", label: "Ambipiede"},
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const CAREER_YEAR_OPTIONS = Array.from(
	{length: CURRENT_YEAR - 1900 + 1},
	(_, index) => String(CURRENT_YEAR - index),
);

const WEEKDAY_OPTIONS = [
	{value: "lunedi", label: "Lunedì"},
	{value: "martedi", label: "Martedì"},
	{value: "mercoledi", label: "Mercoledì"},
	{value: "giovedi", label: "Giovedì"},
	{value: "venerdi", label: "Venerdì"},
	{value: "sabato", label: "Sabato"},
	{value: "domenica", label: "Domenica"},
] as const;

type Weekday = typeof WEEKDAY_OPTIONS[number]["value"];

interface OpeningHoursDraft {
	giorno: Weekday;
	attivo: boolean;
	dalle: string;
	alle: string;
}

interface ProfileTextFieldProps {
	id: string;
	label: string;
	value: string | null;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: ComponentProps<typeof Input>["type"];
	min?: ComponentProps<typeof Input>["min"];
	step?: ComponentProps<typeof Input>["step"];
	maxLength?: number;
	required?: boolean;
	error?: string;
}

function ProfileTextField({
	id,
	label,
	value,
	onChange,
	placeholder,
	type = "text",
	min,
	step,
	maxLength = 160,
	required = false,
	error,
}: ProfileTextFieldProps) {
	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={id}>{label} {required ? <RequiredMark /> : <OptionalLabel />}</FieldLabel>
			<Input
				id={id}
				type={type}
				value={value ?? ""}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				min={min}
				step={step}
				maxLength={maxLength}
				required={required}
				aria-required={required}
				aria-invalid={Boolean(error)}
			/>
			{error && <FieldError>{error}</FieldError>}
		</Field>
	);
}

interface ProfileStartingCostFieldProps {
	id: string;
	value: number | null;
	onChange: (value: number | null) => void;
}

function ProfileStartingCostField({id, value, onChange}: ProfileStartingCostFieldProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>Costo di partenza <OptionalLabel /></FieldLabel>
			<InputGroup>
				<InputGroupInput
					id={id}
					type="number"
					value={value ?? ""}
					onChange={(event) => {
						if (event.target.value === "") {
							onChange(null);
							return;
						}
						const nextValue = event.target.valueAsNumber;
						onChange(Number.isNaN(nextValue) ? null : nextValue);
					}}
					placeholder="50,00"
					min={0}
					step={0.01}
				/>
				<InputGroupAddon align="inline-start">
					<InputGroupText>&euro;</InputGroupText>
				</InputGroupAddon>
				<InputGroupAddon align="inline-end">
					<InputGroupText>/ 1h</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</Field>
	);
}

interface ProfileTextareaFieldProps {
	id: string;
	label: string;
	value: string | null;
	onChange: (value: string) => void;
	placeholder?: string;
	maxLength?: number;
}

function ProfileTextareaField({
	id,
	label,
	value,
	onChange,
	placeholder,
	maxLength = 5000,
}: ProfileTextareaFieldProps) {
	const resolvedValue = value ?? "";

	return (
		<Field>
			<div className="flex items-center justify-between gap-3">
				<FieldLabel htmlFor={id}>{label} <OptionalLabel /></FieldLabel>
				<span className="text-xs text-muted-foreground">{resolvedValue.length}/{maxLength}</span>
			</div>
			<Textarea
				id={id}
				value={resolvedValue}
				onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
				placeholder={placeholder}
				maxLength={maxLength}
				className="min-h-28 resize-y"
			/>
		</Field>
	);
}

type SelectOption = {value: string; label: string};

interface ProfileSelectFieldProps {
	id: string;
	label: string;
	value: string | null;
	onChange: (value: string) => void;
	options: readonly SelectOption[];
	placeholder?: string;
}

function ProfileSelectField({
	id,
	label,
	value,
	onChange,
	options,
	placeholder = "Non specificare",
}: ProfileSelectFieldProps) {
	const items = [{value: null, label: placeholder}, ...options];

	return (
		<Field>
			<FieldLabel htmlFor={id}>{label} <OptionalLabel /></FieldLabel>
			<Select items={items} value={value || null} onValueChange={(nextValue) => onChange(nextValue ?? "")}>
				<SelectTrigger id={id} className="w-full">
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
		</Field>
	);
}

function stateSetter(current: string, onChange: (value: string) => void): Dispatch<SetStateAction<string>> {
	return (nextValue) => onChange(typeof nextValue === "function" ? nextValue(current) : nextValue);
}

function toAvailability(value: string | null): DisponibilitaProfilo {
	return DISPONIBILITA_PROFILO_OPTIONS.some((option) => option.valore === value)
		? value as DisponibilitaProfilo
		: "non-specificare";
}

function toExperiences(value: Json | null): EsperienzaAnnuncio[] {
	return Array.isArray(value) ? value as unknown as EsperienzaAnnuncio[] : [];
}

function experienceSetter(
	current: Json | null,
	onChange: (value: Json) => void,
): Dispatch<SetStateAction<EsperienzaAnnuncio[]>> {
	const experiences = toExperiences(current);
	return (nextValue) => {
		const resolvedValue = typeof nextValue === "function" ? nextValue(experiences) : nextValue;
		onChange(resolvedValue as unknown as Json);
	};
}

interface CareerHistoryFieldsProps {
	idPrefix: string;
	esperienze: EsperienzaAnnuncio[];
	setEsperienze: Dispatch<SetStateAction<EsperienzaAnnuncio[]>>;
}

function CareerHistoryFields({idPrefix, esperienze, setEsperienze}: CareerHistoryFieldsProps) {
	const addEsperienza = () => {
		setEsperienze((previous) => [...previous, createEsperienzaAnnuncio()]);
	};

	const updateEsperienza = (
		id: string,
		values: Partial<Omit<EsperienzaAnnuncio, "id">>,
	) => {
		setEsperienze((previous) => previous.map((esperienza) => (
			esperienza.id === id ? {...esperienza, ...values} : esperienza
		)));
	};

	const removeEsperienza = (id: string) => {
		setEsperienze((previous) => previous.filter((esperienza) => esperienza.id !== id));
	};

	return (
		<FieldSet>
			<FieldLegend variant="label" className="field-legend-title mb-0">Storico carriera <OptionalLabel /></FieldLegend>
			<div className="flex items-start justify-between gap-3">
				<FieldDescription>Inserisci le stagioni, le squadre e le categorie più rilevanti.</FieldDescription>
				<Button type="button" variant="outline" size="sm" onClick={addEsperienza}>
					<PlusIcon data-icon="inline-start" />
					Aggiungi
				</Button>
			</div>

			<FieldGroup className="gap-4">
				{esperienze.map((esperienza, index) => {
					const endYearOptions = esperienza.periodoDa
						? CAREER_YEAR_OPTIONS.filter((year) => Number(year) >= Number(esperienza.periodoDa))
						: CAREER_YEAR_OPTIONS;

					return (
						<Field key={esperienza.id} className="rounded-lg border bg-background p-4">
							<div className="flex items-center justify-between gap-3">
								<p className="text-sm font-medium">Esperienza #{index + 1}</p>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => removeEsperienza(esperienza.id)}
									aria-label={`Rimuovi esperienza ${index + 1}`}
								>
									<Trash2Icon />
								</Button>
							</div>

							<FieldGroup className="grid gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel htmlFor={`${idPrefix}-dal-${esperienza.id}`}>Stagione: dal <OptionalLabel /></FieldLabel>
									<Select
										value={esperienza.periodoDa || null}
										onValueChange={(value) => {
											const periodoDa = value ?? "";
											const periodoA = periodoDa && esperienza.periodoA && Number(esperienza.periodoA) < Number(periodoDa)
												? ""
												: esperienza.periodoA;
											updateEsperienza(esperienza.id, {periodoDa, periodoA});
										}}
									>
										<SelectTrigger id={`${idPrefix}-dal-${esperienza.id}`} className="w-full">
											<SelectValue placeholder="Dal" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={null}>Non specificare</SelectItem>
												{CAREER_YEAR_OPTIONS.map((year) => (
													<SelectItem key={year} value={year}>{year}</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>

								<Field data-disabled={!esperienza.periodoDa}>
									<FieldLabel htmlFor={`${idPrefix}-al-${esperienza.id}`}>Stagione: al <OptionalLabel /></FieldLabel>
									<Select
										value={esperienza.periodoA || null}
										onValueChange={(value) => updateEsperienza(esperienza.id, {periodoA: value ?? ""})}
										disabled={!esperienza.periodoDa}
									>
										<SelectTrigger id={`${idPrefix}-al-${esperienza.id}`} className="w-full" disabled={!esperienza.periodoDa}>
											<SelectValue placeholder="Al" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={null}>Non specificare</SelectItem>
												{endYearOptions.map((year) => (
													<SelectItem key={year} value={year}>{year}</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>

								<ProfileTextField
									id={`${idPrefix}-squadra-${esperienza.id}`}
									label="Squadra"
									value={esperienza.titolo}
									onChange={(value) => updateEsperienza(esperienza.id, {titolo: value})}
									placeholder="Nome squadra"
									maxLength={120}
								/>
								<ProfileTextField
									id={`${idPrefix}-categoria-${esperienza.id}`}
									label="Categoria"
									value={esperienza.ente}
									onChange={(value) => updateEsperienza(esperienza.id, {ente: value})}
									placeholder="Es: Under 19"
									maxLength={120}
								/>
							</FieldGroup>
						</Field>
					);
				})}
			</FieldGroup>
		</FieldSet>
	);
}

function toOpeningHours(value: Json | null): OpeningHoursDraft[] {
	return WEEKDAY_OPTIONS.map(({value: giorno}) => {
		const storedValue = Array.isArray(value)
			? value.find((item) => (
				item !== null
				&& !Array.isArray(item)
				&& typeof item === "object"
				&& item.giorno === giorno
			))
			: undefined;

		if (!storedValue || Array.isArray(storedValue) || typeof storedValue !== "object") {
			return {giorno, attivo: false, dalle: "", alle: ""};
		}

		return {
			giorno,
			attivo: storedValue.attivo === true,
			dalle: typeof storedValue.dalle === "string" ? storedValue.dalle : "",
			alle: typeof storedValue.alle === "string" ? storedValue.alle : "",
		};
	});
}

interface OpeningHoursFieldProps {
	idPrefix: string;
	value: Json | null;
	onChange: (value: Json) => void;
}

function OpeningHoursField({idPrefix, value, onChange}: OpeningHoursFieldProps) {
	const openingHours = toOpeningHours(value);

	const updateDay = (giorno: Weekday, values: Partial<Omit<OpeningHoursDraft, "giorno">>) => {
		onChange(openingHours.map((entry) => (
			entry.giorno === giorno ? {...entry, ...values} : entry
		)) as unknown as Json);
	};

	return (
		<FieldSet>
			<FieldLegend variant="label">Orari <OptionalLabel /></FieldLegend>
			<FieldDescription>Seleziona i giorni di apertura e indica l’orario di disponibilità.</FieldDescription>
			<FieldGroup className="gap-3">
				{openingHours.map((entry) => {
					const day = WEEKDAY_OPTIONS.find((option) => option.value === entry.giorno);
					if (!day) return null;

					return (
						<Field key={entry.giorno} className="rounded-lg border bg-background p-3">
							<FieldGroup className="grid items-end gap-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
								<Field orientation="horizontal" className="min-h-8">
									<Checkbox
										id={`${idPrefix}-${entry.giorno}-attivo`}
										checked={entry.attivo}
										onCheckedChange={(checked) => updateDay(entry.giorno, {attivo: Boolean(checked)})}
									/>
									<FieldLabel htmlFor={`${idPrefix}-${entry.giorno}-attivo`} className="font-normal">
										{day.label}
									</FieldLabel>
								</Field>
								<Field data-disabled={!entry.attivo}>
									<FieldLabel htmlFor={`${idPrefix}-${entry.giorno}-dalle`}>Dalle <OptionalLabel /></FieldLabel>
									<Input
										id={`${idPrefix}-${entry.giorno}-dalle`}
										type="time"
										value={entry.dalle}
										onChange={(event) => updateDay(entry.giorno, {dalle: event.target.value})}
										disabled={!entry.attivo}
									/>
								</Field>
								<Field data-disabled={!entry.attivo}>
									<FieldLabel htmlFor={`${idPrefix}-${entry.giorno}-alle`}>Alle <OptionalLabel /></FieldLabel>
									<Input
										id={`${idPrefix}-${entry.giorno}-alle`}
										type="time"
										value={entry.alle}
										onChange={(event) => updateDay(entry.giorno, {alle: event.target.value})}
										disabled={!entry.attivo}
									/>
								</Field>
							</FieldGroup>
						</Field>
					);
				})}
			</FieldGroup>
		</FieldSet>
	);
}

type SportsRoles = {principali: string[]; specifici: string[]};

function toSportsRoles(value: Json | null): SportsRoles {
	if (!value || Array.isArray(value) || typeof value !== "object") {
		return {principali: [], specifici: []};
	}

	const principali = Array.isArray(value.principali)
		? value.principali.filter((role): role is string => typeof role === "string")
		: [];
	const specifici = Array.isArray(value.specifici)
		? value.specifici.filter((role): role is string => typeof role === "string")
		: [];
	return {principali, specifici};
}

interface PersonalDataFieldsProps {
	prefix: string;
	nome: string | null;
	cognome: string | null;
	giornoNascita: string | null;
	meseNascita: string | null;
	annoNascita: string | null;
	onNomeChange: (value: string) => void;
	onCognomeChange: (value: string) => void;
	onGiornoNascitaChange: (value: string) => void;
	onMeseNascitaChange: (value: string) => void;
	onAnnoNascitaChange: (value: string) => void;
	nameRequired?: boolean;
	nameError?: string;
}

function PersonalDataFields({
	prefix,
	nome,
	cognome,
	giornoNascita,
	meseNascita,
	annoNascita,
	onNomeChange,
	onCognomeChange,
	onGiornoNascitaChange,
	onMeseNascitaChange,
	onAnnoNascitaChange,
	nameRequired = false,
	nameError,
}: PersonalDataFieldsProps) {
	return (
		<>
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				<ProfileTextField
					id={`${prefix}-nome`}
					label="Nome"
					value={nome}
					onChange={onNomeChange}
					placeholder="Mario"
					required={nameRequired}
					error={nameError}
				/>
				<ProfileTextField id={`${prefix}-cognome`} label="Cognome" value={cognome} onChange={onCognomeChange} placeholder="Rossi" />
			</FieldGroup>
			<DataNascitaFields
				idPrefix={prefix}
				giornoNascita={giornoNascita ?? ""}
				setGiornoNascita={stateSetter(giornoNascita ?? "", onGiornoNascitaChange)}
				meseNascita={meseNascita ?? ""}
				setMeseNascita={stateSetter(meseNascita ?? "", onMeseNascitaChange)}
				annoNascita={annoNascita ?? ""}
				setAnnoNascita={stateSetter(annoNascita ?? "", onAnnoNascitaChange)}
			/>
		</>
	);
}

interface LocationsFieldProps {
	type: ProfileType;
	prefix: string;
	locations: ProfileLocations;
	onLocationsChange: (type: ProfileType, value: ProfileLocationDraft[]) => void;
	required?: boolean;
	error?: string | null;
}

function LocationsField({type, prefix, locations, onLocationsChange, required = false, error}: LocationsFieldProps) {
	return (
		<ProfileLocationsField
			idPrefix={`${prefix}-regions`}
			value={locations[type]}
			onValueChange={(value) => onLocationsChange(type, value)}
			required={required}
			error={error}
		/>
	);
}

function GiocatoreFields({
	draft,
	prefix,
	onChange,
	requiredFields,
	errors,
}: {
	draft: ProfileDrafts["giocatore"];
	prefix: string;
	onChange: ProfileDraftUpdater;
	requiredFields: boolean;
	errors: ProfileValidationErrors;
}) {
	const roles = toSportsRoles(draft.ruoli_sport);
	const specificRoleOptions = [...new Set(
		roles.principali.flatMap((role) => RUOLI_SPECIFICI_PER_RUOLO[role] ?? []),
	)];

	return (
		<>
			<PersonalDataFields
				prefix={prefix}
				nome={draft.nome}
				cognome={draft.cognome}
				giornoNascita={draft.giorno_nascita}
				meseNascita={draft.mese_nascita}
				annoNascita={draft.anno_nascita}
				onNomeChange={(value) => onChange("giocatore", "nome", value)}
				onCognomeChange={(value) => onChange("giocatore", "cognome", value)}
				onGiornoNascitaChange={(value) => onChange("giocatore", "giorno_nascita", value)}
				onMeseNascitaChange={(value) => onChange("giocatore", "mese_nascita", value)}
				onAnnoNascitaChange={(value) => onChange("giocatore", "anno_nascita", value)}
				nameRequired={requiredFields}
				nameError={errors.name}
			/>
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				<TipologiaCalcioMultiselectField
					value={draft.tipologie_sport ?? []}
					onValueChange={(value) => onChange("giocatore", "tipologie_sport", value)}
					required={requiredFields}
					error={errors.sports}
				/>
				<DisponibilitaProfiloSelect id={`${prefix}-disponibilita`} value={toAvailability(draft.disponibilita)} onValueChange={(value) => onChange("giocatore", "disponibilita", value)} />
			</FieldGroup>
			<RuoloPrincipaleMultiselectField
				value={roles.principali}
				onValueChange={(principali) => onChange("giocatore", "ruoli_sport", {
					principali,
					specifici: roles.specifici.filter((role) => principali.some((mainRole) => (RUOLI_SPECIFICI_PER_RUOLO[mainRole] ?? []).includes(role))),
				})}
				required={requiredFields}
				error={errors.mainRole}
			/>
			<MultiselectField
				label="Ruolo specifico"
				options={specificRoleOptions}
				value={roles.specifici}
				onValueChange={(specifici) => onChange("giocatore", "ruoli_sport", {...roles, specifici})}
				placeholder={roles.principali.length > 0 ? "Seleziona i ruoli specifici..." : "Seleziona prima un ruolo principale"}
			/>
			<CategorieCalcioMultiselectField
				label="Categorie ricercate"
				items={CATEGORIE_CALCIO_GROUPS}
				value={draft.categorie_ricercate ?? []}
				onValueChange={(value) => onChange("giocatore", "categorie_ricercate", value)}
			/>
			<FieldGroup className="grid gap-4 sm:grid-cols-3">
				<ProfileTextField id={`${prefix}-altezza`} label="Altezza (in cm)" value={draft.altezza} onChange={(value) => onChange("giocatore", "altezza", value)} placeholder="Es. 180" />
				<ProfileTextField id={`${prefix}-peso`} label="Peso (in kg)" value={draft.peso} onChange={(value) => onChange("giocatore", "peso", value)} placeholder="Es. 75" />
				<ProfileSelectField id={`${prefix}-piede`} label="Piede principale" value={draft.piede_principale} onChange={(value) => onChange("giocatore", "piede_principale", value)} options={MAIN_FOOT_OPTIONS} />
			</FieldGroup>
			<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange("giocatore", "presentazione", value)} placeholder="Esperienze, caratteristiche tecniche, disponibilità e obiettivi..." />
			<CareerHistoryFields
				idPrefix={`${prefix}-storico-carriera`}
				esperienze={toExperiences(draft.storico_carriera)}
				setEsperienze={experienceSetter(draft.storico_carriera, (value) => onChange("giocatore", "storico_carriera", value))}
			/>
		</>
	);
}

function ProfileFields({
	type,
	drafts,
	prefix,
	onChange,
	requiredFields,
	errors,
}: {
	type: ProfileType;
	drafts: ProfileDrafts;
	prefix: string;
	onChange: ProfileDraftUpdater;
	requiredFields: boolean;
	errors: ProfileValidationErrors;
}) {
	if (type === "giocatore") {
		return (
			<GiocatoreFields
				draft={drafts.giocatore}
				prefix={prefix}
				onChange={onChange}
				requiredFields={requiredFields}
				errors={errors}
			/>
		);
	}

	if (type === "squadra") {
		const draft = drafts.squadra;
		return (
			<>
				<ProfileTextField id={`${prefix}-nome-societa`} label="Nome società" value={draft.nome_societa} onChange={(value) => onChange(type, "nome_societa", value)} placeholder="A.S.D. Esempio Calcio" required={requiredFields} error={errors.name} />
				<TipologiaCalcioMultiselectField value={draft.tipologie_sport ?? []} onValueChange={(value) => onChange(type, "tipologie_sport", value)} required={requiredFields} error={errors.sports} />
				<ProfileTextField id={`${prefix}-sede-principale`} label="Sede principale" value={draft.sede_principale} onChange={(value) => onChange(type, "sede_principale", value)} placeholder="Città o indirizzo della sede" />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Storia, categorie, obiettivi e valori della società..." />
			</>
		);
	}

	if (type === "staff-sportivo") {
		const draft = drafts["staff-sportivo"];
		return (
			<>
				<PersonalDataFields
					prefix={prefix}
					nome={draft.nome}
					cognome={draft.cognome}
					giornoNascita={draft.giorno_nascita}
					meseNascita={draft.mese_nascita}
					annoNascita={draft.anno_nascita}
					onNomeChange={(value) => onChange(type, "nome", value)}
					onCognomeChange={(value) => onChange(type, "cognome", value)}
					onGiornoNascitaChange={(value) => onChange(type, "giorno_nascita", value)}
					onMeseNascitaChange={(value) => onChange(type, "mese_nascita", value)}
					onAnnoNascitaChange={(value) => onChange(type, "anno_nascita", value)}
					nameRequired={requiredFields}
					nameError={errors.name}
				/>
				<FieldGroup className="grid gap-4 sm:grid-cols-2">
					<FiguraProfessionaleMultiselectField value={draft.figure_professionali ?? []} onValueChange={(value) => onChange(type, "figure_professionali", value)} required={requiredFields} error={errors.professionalRole} />
					<DisponibilitaProfiloSelect id={`${prefix}-disponibilita`} value={toAvailability(draft.disponibilita)} onValueChange={(value) => onChange(type, "disponibilita", value)} />
				</FieldGroup>
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Esperienze, competenze, disponibilità e metodo di lavoro..." />
				<EsperienzeAnnuncioFields idPrefix={`${prefix}-storico-esperienze`} titolo="Storico esperienze" esperienze={toExperiences(draft.storico_esperienze)} setEsperienze={experienceSetter(draft.storico_esperienze, (value) => onChange(type, "storico_esperienze", value))} />
			</>
		);
	}

	if (type === "professionisti-studi") {
		const draft = drafts["professionisti-studi"];
		return (
			<>
				<PersonalDataFields
					prefix={prefix}
					nome={draft.nome}
					cognome={draft.cognome}
					giornoNascita={draft.giorno_nascita}
					meseNascita={draft.mese_nascita}
					annoNascita={draft.anno_nascita}
					onNomeChange={(value) => onChange(type, "nome", value)}
					onCognomeChange={(value) => onChange(type, "cognome", value)}
					onGiornoNascitaChange={(value) => onChange(type, "giorno_nascita", value)}
					onMeseNascitaChange={(value) => onChange(type, "mese_nascita", value)}
					onAnnoNascitaChange={(value) => onChange(type, "anno_nascita", value)}
					nameRequired={requiredFields}
					nameError={errors.name}
				/>
				<FieldGroup className="grid gap-4 sm:grid-cols-2">
					<FiguraProfessionaleMultiselectField value={draft.figure_professionali ?? []} onValueChange={(value) => onChange(type, "figure_professionali", value)} />
					<TipologiaCalcioMultiselectField value={draft.tipologie_sport ?? []} onValueChange={(value) => onChange(type, "tipologie_sport", value)} />
					<DisponibilitaProfiloSelect id={`${prefix}-disponibilita`} value={toAvailability(draft.disponibilita)} onValueChange={(value) => onChange(type, "disponibilita", value)} />
					<ProfileSelectField id={`${prefix}-automunito`} label="Automunito" value={draft.automunito} onChange={(value) => onChange(type, "automunito", value)} options={DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS.map((option) => ({value: option.valore, label: option.etichetta}))} />
				</FieldGroup>
				<ProfileTextField id={`${prefix}-specializzazioni`} label="Specializzazioni" value={draft.specializzazioni} onChange={(value) => onChange(type, "specializzazioni", value)} placeholder="Ambiti, discipline e competenze" />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Racconta il tuo percorso professionale..." />
				<ProfileTextareaField id={`${prefix}-presentazione-servizi`} label="Presentazione servizi" value={draft.presentazione_servizi} onChange={(value) => onChange(type, "presentazione_servizi", value)} placeholder="Descrivi consulenze, percorsi e prestazioni..." />
				<EsperienzeAnnuncioFields idPrefix={`${prefix}-storico-esperienze`} titolo="Storico esperienze" esperienze={toExperiences(draft.storico_esperienze)} setEsperienze={experienceSetter(draft.storico_esperienze, (value) => onChange(type, "storico_esperienze", value))} />
			</>
		);
	}

	if (type === "arbitro") {
		const draft = drafts.arbitro;
		return (
			<>
				<PersonalDataFields
					prefix={prefix}
					nome={draft.nome}
					cognome={draft.cognome}
					giornoNascita={draft.giorno_nascita}
					meseNascita={draft.mese_nascita}
					annoNascita={draft.anno_nascita}
					onNomeChange={(value) => onChange(type, "nome", value)}
					onCognomeChange={(value) => onChange(type, "cognome", value)}
					onGiornoNascitaChange={(value) => onChange(type, "giorno_nascita", value)}
					onMeseNascitaChange={(value) => onChange(type, "mese_nascita", value)}
					onAnnoNascitaChange={(value) => onChange(type, "anno_nascita", value)}
					nameRequired={requiredFields}
					nameError={errors.name}
				/>
				<DisponibilitaProfiloSelect id={`${prefix}-disponibilita`} value={toAvailability(draft.disponibilita)} onValueChange={(value) => onChange(type, "disponibilita", value)} />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Esperienza arbitrale, categorie seguite e disponibilità..." />
				<EsperienzeAnnuncioFields idPrefix={`${prefix}-storico-esperienze`} titolo="Storico esperienze" esperienze={toExperiences(draft.storico_esperienze)} setEsperienze={experienceSetter(draft.storico_esperienze, (value) => onChange(type, "storico_esperienze", value))} />
			</>
		);
	}

	if (type === "creators") {
		const draft = drafts.creators;
		return (
			<>
				<ProfileTextField id={`${prefix}-nome-creator`} label="Nome creator" value={draft.nome_creator} onChange={(value) => onChange(type, "nome_creator", value)} placeholder="Nome del creator o del progetto" />
				<ProfileTextField id={`${prefix}-tipologia-contenuti`} label="Tipologia contenuti" value={draft.tipologia_contenuti} onChange={(value) => onChange(type, "tipologia_contenuti", value)} placeholder="Video, podcast, analisi, interviste..." />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Racconta chi sei e quali contenuti sportivi condividi..." />
			</>
		);
	}

	if (type === "torneo-evento") {
		const draft = drafts["torneo-evento"];
		return (
			<>
				<ProfileTextField id={`${prefix}-nome-organizzazione`} label="Nome organizzazione" value={draft.nome_organizzazione} onChange={(value) => onChange(type, "nome_organizzazione", value)} placeholder="A.S.D. o ente organizzatore" required={requiredFields} error={errors.name} />
				<TipologiaCalcioMultiselectField value={draft.tipologie_sport ?? []} onValueChange={(value) => onChange(type, "tipologie_sport", value)} required={requiredFields} error={errors.sports} />
				<ProfileTextField id={`${prefix}-sede-principale`} label="Sede principale" value={draft.sede_principale} onChange={(value) => onChange(type, "sede_principale", value)} placeholder="Città o indirizzo dell'organizzazione" />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Descrivi l'organizzazione e le sue attività..." />
			</>
		);
	}

	const draft = drafts["campi-impianti-sportivi"];
	return (
		<>
			<ProfileTextField id={`${prefix}-nome-organizzazione`} label="Nome organizzazione" value={draft.nome_organizzazione} onChange={(value) => onChange("campi-impianti-sportivi", "nome_organizzazione", value)} placeholder="Centro Sportivo Esempio" required={requiredFields} error={errors.name} />
			<TipologiaCalcioMultiselectField value={draft.tipologie_sport ?? []} onValueChange={(value) => onChange("campi-impianti-sportivi", "tipologie_sport", value)} required={requiredFields} error={errors.sports} />
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				<ProfileTextField id={`${prefix}-sede-principale`} label="Sede principale" value={draft.sede_principale} onChange={(value) => onChange("campi-impianti-sportivi", "sede_principale", value)} placeholder="Via Roma 1, Milano" required={requiredFields} error={errors.headquarters} />
				<ProfileStartingCostField id={`${prefix}-costo-partenza`} value={draft.costo_partenza} onChange={(value) => onChange("campi-impianti-sportivi", "costo_partenza", value)} />
			</FieldGroup>
			<OpeningHoursField idPrefix={`${prefix}-orari`} value={draft.orari} onChange={(value) => onChange("campi-impianti-sportivi", "orari", value)} />
			<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange("campi-impianti-sportivi", "presentazione", value)} placeholder="Descrivi gli spazi e le caratteristiche dell'impianto..." />
			<ProfileTextareaField id={`${prefix}-servizi-inclusi`} label="Servizi inclusi" value={draft.servizi_inclusi} onChange={(value) => onChange("campi-impianti-sportivi", "servizi_inclusi", value)} placeholder="Spogliatoi, illuminazione, parcheggio, bar..." />
			<ProfileTextareaField id={`${prefix}-info-aggiuntive`} label="Informazioni aggiuntive" value={draft.info_aggiuntive} onChange={(value) => onChange("campi-impianti-sportivi", "info_aggiuntive", value)} placeholder="Regole, accessibilità o altri dettagli utili..." />
		</>
	);
}

export default function ProfileDetailsForm({
	type,
	drafts,
	locations,
	onChange,
	onLocationsChange,
	requiredFields = false,
	errors = {},
}: ProfileDetailsFormProps) {
	const prefix = `registration-profile-${type}`;

	return (
		<FieldSet>
			<FieldLegend variant="label" className="field-legend-title mb-2">Inserisci i dati del tuo profilo:</FieldLegend>
			<FieldGroup className="mt-2 grid gap-4">
				<ProfileFields type={type} drafts={drafts} prefix={prefix} onChange={onChange} requiredFields={requiredFields} errors={errors} />
				<LocationsField
					type={type}
					prefix={prefix}
					locations={locations}
					onLocationsChange={onLocationsChange}
					required={requiredFields}
					error={errors.locations ?? null}
				/>
			</FieldGroup>
		</FieldSet>
	);
}
