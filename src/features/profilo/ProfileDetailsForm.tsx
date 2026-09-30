import type {ComponentProps, Dispatch, SetStateAction} from "react";
import {CircleHelpIcon, PlusIcon, Trash2Icon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import ProfileLocationsField from "@/features/profilo/ProfileLocationsField";
import PlayerNationalityField from "@/features/profilo/PlayerNationalityField";
import TeamProfileComboboxField from "@/features/profilo/TeamProfileComboboxField";
import type {
	ProfileDrafts,
	ProfileDraftUpdater,
	ProfileLocationDraft,
	ProfileLocations,
	ProfileType,
} from "@/features/profilo/profile-model";
import {
	PROFILE_SOCIAL_LINK_OPTIONS,
	type ProfileSocialLinks,
	type ProfileSocialPlatform,
} from "@/features/profilo/profile-social-links";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import DisponibilitaProfiloSelect from "@/features/pubblica-annuncio/components/InputFields/DisponibilitaProfiloSelect";
import EsperienzeAnnuncioFields, {
	createEsperienzaAnnuncio,
	type EsperienzaAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import FiguraProfessionaleMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/FiguraProfessionaleMultiselectField";
import LinkAnnuncioField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioField";
import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RuoloPrincipaleMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/RuoloPrincipaleMultiselectField";
import TipologiaCalcioMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";
import type {ProfileValidationErrors} from "@/features/profilo/profile-required-fields";
import {
	CATEGORIE_CALCIO_GROUPS,
	DISPONIBILITA_SPOSTAMENTI_OPTIONS,
	type DisponibilitaProfilo,
	RUOLI_SPECIFICI_PER_RUOLO,
	TIPOLOGIA_CALCIO_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import type {Json} from "@/server/supabase";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import Link from "next/link";
import {
	getPlayerSpecificRoleGroups,
	getPlayerSpecificRoleOptions,
	normalizePlayerRoleSelection,
} from "@/features/profilo/player-roles";
import {categoryKey} from "@/features/pubblica-annuncio/types/category-catalog";

interface ProfileDetailsFormProps {
	type: ProfileType;
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onChange: ProfileDraftUpdater;
	onLocationsChange: (type: ProfileType, value: ProfileLocationDraft[]) => void;
	socialLinks: ProfileSocialLinks;
	onSocialLinksChange: (platform: ProfileSocialPlatform, value: string) => void;
	errors?: ProfileValidationErrors;
}

function RequiredMark() {
	return <span aria-hidden="true" className="text-destructive">*</span>;
}

const MAIN_FOOT_OPTIONS = [
	{value: "Destro", label: "Destro"},
	{value: "Sinistro", label: "Sinistro"},
	{value: "Ambidestro", label: "Ambidestro"},
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
type SelectOptionGroup = {label: string; options: readonly SelectOption[]};

interface ProfileSelectFieldProps {
	id: string;
	label: string;
	value: string | null;
	onChange: (value: string) => void;
	options?: readonly SelectOption[];
	groups?: readonly SelectOptionGroup[];
	placeholder?: string;
	required?: boolean;
	error?: string;
	disabled?: boolean;
}

function ProfileSelectField({
	id,
	label,
	value,
	onChange,
	options,
	groups,
	placeholder = "Non specificare",
	required = false,
	error,
	disabled = false,
}: ProfileSelectFieldProps) {
	const availableOptions = groups?.flatMap(group => group.options) ?? options ?? [];
	const items = required ? availableOptions : [{value: null, label: placeholder}, ...availableOptions];

	return (
		<Field data-invalid={Boolean(error)} data-disabled={disabled}>
			<FieldLabel htmlFor={id}>{label} {required ? <RequiredMark /> : <OptionalLabel />}</FieldLabel>
			<Select items={items} value={value || null} onValueChange={(nextValue) => onChange(nextValue ?? "")}>
				<SelectTrigger id={id} className="w-full" disabled={disabled} aria-required={required} aria-invalid={Boolean(error)}>
					{ required ? <SelectValue placeholder={placeholder} /> : <SelectValue />}
				</SelectTrigger>
				<SelectContent>
					{!required && <SelectGroup><SelectItem value={null}>{placeholder}</SelectItem></SelectGroup>}
					{groups ? groups.map(group => <SelectGroup key={group.label}>
						<SelectLabel>{group.label}</SelectLabel>
						{group.options.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
					</SelectGroup>) : <SelectGroup>{availableOptions.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup>}
				</SelectContent>
			</Select>
			{error && <FieldError>{error}</FieldError>}
		</Field>
	);
}

function stateSetter(current: string, onChange: (value: string) => void): Dispatch<SetStateAction<string>> {
	return (nextValue) => onChange(typeof nextValue === "function" ? nextValue(current) : nextValue);
}

function toAvailability(value: string | null): DisponibilitaProfilo {
	return ["non-specificare", "disponibile-subito", "svincolato", "sotto-contratto"].includes(value ?? "")
		? value as DisponibilitaProfilo
		: "non-specificare";
}

function toExperiences(value: Json | null): EsperienzaAnnuncio[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item): EsperienzaAnnuncio[] => {
		if (!item || Array.isArray(item) || typeof item !== "object") return [];
		const experience = item as Record<string, Json | undefined>;
		return [{
			...(experience as unknown as Omit<EsperienzaAnnuncio, "squadraProfiloId">),
			squadraProfiloId: typeof experience.squadraProfiloId === "string" ? experience.squadraProfiloId : null,
		}];
	});
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
	staff?: boolean;
}

function legacyQualificationText(value: Json): string {
	if (typeof value === "string") return value;
	if (value === null || typeof value !== "object" || Array.isArray(value)) return JSON.stringify(value);
	const labels: Record<string, string> = {titolo: "Qualifica / patentino / licenza", ente: "Ente / società / organizzazione", periodoDa: "Dal", periodoA: "Al", descrizione: "Descrizione", stato: "Stato"};
	return Object.entries(value)
		.filter(([key, item]) => key !== "id" && key !== "squadraProfiloId" && !(key === "stato" && item === "non-specificare") && item !== null && item !== "")
		.map(([key, item]) => `${labels[key] ?? key}: ${key === "stato" && item === "conseguito" ? "Conseguito" : key === "stato" && item === "in-corso" ? "In corso" : typeof item === "string" ? item : JSON.stringify(item)}`)
		.join("\n");
}

function CareerHistoryFields({idPrefix, esperienze, setEsperienze, staff = false}: CareerHistoryFieldsProps) {
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
			<div className="flex items-center justify-between gap-3 mt-4">
				<div className="flex flex-col items-start">
					<FieldLegend variant="label" className="field-legend-title mb-0">{staff ? "Lista esperienze" : "Storico carriera"} <OptionalLabel /></FieldLegend>
					<FieldDescription>{staff ? "Inserisci le società e i ruoli svolti." : "Inserisci le stagioni, le squadre e le categorie più rilevanti."}</FieldDescription>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={addEsperienza}>
					<PlusIcon data-icon="inline-start" />
					Aggiungi
				</Button>
			</div>

			<FieldGroup className="gap-4">

				{esperienze.length === 0 ? (
					<div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
						{staff ? "Nessuna esperienza inserita." : "Nessun storico carriera inserito."}
					</div>
				) : (esperienze.map((esperienza, index) => {
					const endYearOptions = esperienza.periodoDa
						? CAREER_YEAR_OPTIONS.filter((year) => Number(year) >= Number(esperienza.periodoDa))
						: CAREER_YEAR_OPTIONS;

					return (
						<Field key={esperienza.id} className="rounded-lg border bg-background p-4">
							<div className="flex items-center justify-between gap-3">
								<p className="text-base font-medium">Esperienza #{index + 1}</p>
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
											const periodoA = !periodoDa
												? ""
												: esperienza.periodoA && esperienza.periodoA !== "oggi" && Number(esperienza.periodoA) < Number(periodoDa)
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
												<SelectItem value="oggi">Ad oggi</SelectItem>
												{endYearOptions.map((year) => (
													<SelectItem key={year} value={year}>{year}</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>

								<Field>
									<FieldLabel htmlFor={`${idPrefix}-squadra-${esperienza.id}`}>{staff ? "Società" : "Squadra"} <OptionalLabel /></FieldLabel>
									<TeamProfileComboboxField
										id={`${idPrefix}-squadra-${esperienza.id}`}
										value={esperienza.titolo}
										profileId={esperienza.squadraProfiloId}
										onValueChange={(value, profileId) => updateEsperienza(esperienza.id, {
											titolo: value,
											squadraProfiloId: profileId,
										})}
									/>
								</Field>
								<ProfileTextField
									id={`${idPrefix}-categoria-${esperienza.id}`}
									label={staff ? "Ruolo/i svolti" : "Categoria"}
									value={esperienza.ente}
									onChange={(value) => updateEsperienza(esperienza.id, {ente: value})}
									placeholder={staff ? "Dirigenza, medico sportivo, media manager..." : "Es: Under 19"}
									maxLength={120}
								/>
							</FieldGroup>
						</Field>
					);
				}))}
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
	error?: string;
}

export function OpeningHoursField({idPrefix, value, onChange, error}: OpeningHoursFieldProps) {
	const openingHours = toOpeningHours(value);

	const updateDay = (giorno: Weekday, values: Partial<Omit<OpeningHoursDraft, "giorno">>) => {
		onChange(openingHours.map((entry) => (
			entry.giorno === giorno ? {...entry, ...values} : entry
		)) as unknown as Json);
	};

	return (
		<FieldSet data-invalid={Boolean(error)}>
			<FieldLegend variant="label">Orari <OptionalLabel /></FieldLegend>
			<FieldDescription>Seleziona i giorni di apertura e indica l’orario di disponibilità.</FieldDescription>
			<FieldGroup className="gap-3">
				{openingHours.map((entry) => {
					const day = WEEKDAY_OPTIONS.find((option) => option.value === entry.giorno);
					if (!day) return null;

					return (
						<Field
							key={entry.giorno}
							className="cursor-pointer rounded-lg border bg-background p-3 transition-colors data-[active=true]:border-primary data-[active=true]:bg-primary/5"
							data-active={entry.attivo}
							onClick={(event) => {
								const target = event.target as HTMLElement;
								if (target.closest("input, button, [role='checkbox'], label")) return;
								updateDay(entry.giorno, {attivo: !entry.attivo});
							}}
						>
							<FieldGroup className="grid items-end gap-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
								<Field orientation="horizontal" className="min-h-8">
									<Checkbox
										id={`${idPrefix}-${entry.giorno}-attivo`}
										checked={entry.attivo}
										onCheckedChange={(checked) => updateDay(entry.giorno, {attivo: Boolean(checked)})}
										className="size-5 border-2"
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
			{error && <FieldError>{error}</FieldError>}
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
	const normalized = normalizePlayerRoleSelection(principali, specifici);
	return {principali: normalized.primary, specifici: normalized.specific};
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
	yearRequired?: boolean;
	yearError?: string;
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
	yearRequired = false,
	yearError,
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
				yearRequired={yearRequired}
				yearError={yearError}
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
	const single = type !== "torneo-evento" && type !== "campi-impianti-sportivi" && type !== "creators";
	const label = type === "torneo-evento"
		? "Zona di svolgimento manifestazione"
		: type === "squadra" ? "Dove ha sede la società?" : type === "creators" ? "Di che zona/e ti occupi" : single ? "In che zona vivi?" : "Regioni interessate";
	return (
		<ProfileLocationsField
			idPrefix={`${prefix}-regions`}
			mode={single ? "single" : "multiple"}
			label={label}
			value={locations[type]}
			onValueChange={(value) => onLocationsChange(type, value)}
			required={required}
			error={error}
		/>
	);
}

function FacilityLocationField({
	prefix,
	locations,
	onLocationsChange,
	address,
	onAddressChange,
	error,
}: {
	prefix: string;
	locations: ProfileLocationDraft[];
	onLocationsChange: (value: ProfileLocationDraft[]) => void;
	address: string | null;
	onAddressChange: (value: string) => void;
	error?: string;
}) {
	const selected = locations[0];
	const region = selected?.regione ?? "";
	return (
		<FieldSet data-invalid={Boolean(error)}>
			<FieldLegend variant="label" className="field-legend-title">Sede dell’impianto/struttura</FieldLegend>
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				<Field data-invalid={Boolean(error && !region)}>
					<FieldLabel htmlFor={`${prefix}-facility-region`}>Regione <RequiredMark /></FieldLabel>
					<Select value={region || null} onValueChange={(value) => onLocationsChange(value ? [{regione: value, citta: null}] : [])}>
						<SelectTrigger id={`${prefix}-facility-region`} className="w-full" aria-required="true" aria-invalid={Boolean(error && !region)}><SelectValue placeholder="Seleziona una regione" /></SelectTrigger>
						<SelectContent><SelectItem value={null}>Seleziona una regione</SelectItem>{REGIONI_ITALIANE.map(({nome}) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}</SelectContent>
					</Select>
				</Field>
				<Field data-invalid={Boolean(error && region && !selected?.citta)}>
					<FieldLabel htmlFor={`${prefix}-facility-city`}>Città/comune <RequiredMark /></FieldLabel>
					<Input id={`${prefix}-facility-city`} value={selected?.citta ?? ""} onChange={(event) => onLocationsChange([{regione: region, citta: event.target.value || null}])} disabled={!region} maxLength={120} required aria-required="true" aria-invalid={Boolean(error && region && !selected?.citta)} placeholder="Es. Roma" />
				</Field>
				<Field className="sm:col-span-2">
					<FieldLabel htmlFor={`${prefix}-facility-address`}>Indirizzo <OptionalLabel /></FieldLabel>
					<Input id={`${prefix}-facility-address`} value={address ?? ""} onChange={(event) => onAddressChange(event.target.value)} maxLength={160} placeholder="Via Roma 1" />
				</Field>
			</FieldGroup>
			{error && <FieldError>{error}</FieldError>}
			{locations.length > 1 && <FieldDescription>Seleziona nuovamente la sede per sostituire le località storiche con una sola Regione e Città/comune.</FieldDescription>}
		</FieldSet>
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
	const specificRoleOptions = getPlayerSpecificRoleOptions(roles.principali);
	const specificRoleGroups = getPlayerSpecificRoleGroups(roles.principali);

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
				yearRequired={requiredFields}
				yearError={errors.birthYear}
			/>
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				<ProfileSelectField id={`${prefix}-genere`} label="Genere" value={draft.genere} onChange={(value) => onChange("giocatore", "genere", value)} options={[{value: "Uomo", label: "Uomo"}, {value: "Donna", label: "Donna"}]} placeholder="Seleziona il genere" required={requiredFields} error={errors.gender} />
				<PlayerNationalityField id={`${prefix}-nazionalita`} value={draft.nazionalita} onChangeAction={(value) => onChange("giocatore", "nazionalita", value)} error={errors.nationality} />
			</FieldGroup>
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				<TipologiaCalcioMultiselectField
					value={draft.tipologie_sport ?? []}
					onValueChange={(value) => onChange("giocatore", "tipologie_sport", value)}
					required={requiredFields}
					error={errors.sports}
				/>
				<DisponibilitaProfiloSelect id={`${prefix}-disponibilita`} value={toAvailability(draft.disponibilita)} onValueChange={(value) => {
					onChange("giocatore", "disponibilita", value);
					if (value === "svincolato") onChange("giocatore", "categoria_attuale", "");
				}} player required={requiredFields} error={errors.availability} />
			</FieldGroup>
			<ProfileSelectField
				id={`${prefix}-categoria-attuale`}
				label="Categoria attuale"
				value={draft.categoria_attuale}
				onChange={(value) => onChange("giocatore", "categoria_attuale", value)}
				groups={CATEGORIE_CALCIO_GROUPS.map(({gruppo, opzioni}) => ({label: gruppo, options: opzioni.map(categoria => ({value: categoryKey(gruppo, categoria), label: categoria}))}))}
				placeholder={draft.disponibilita === "svincolato" ? "Non applicabile per giocatore svincolato" : "Non specificare"}
				disabled={draft.disponibilita === "svincolato"}
			/>
			<RuoloPrincipaleMultiselectField
				label="Ruoli principali"
				value={roles.principali}
				onValueChange={(principali) => onChange("giocatore", "ruoli_sport", {
					principali,
					specifici: roles.specifici.filter((role) => principali.some((mainRole) => (RUOLI_SPECIFICI_PER_RUOLO[mainRole] ?? []).includes(role))),
				})}
				required={requiredFields}
				error={errors.mainRole}
			/>
			<MultiselectField
				label="Ruoli specifici"
				options={specificRoleOptions}
				groups={specificRoleGroups}
				value={roles.specifici}
				onValueChange={(specifici) => onChange("giocatore", "ruoli_sport", {...roles, specifici})}
				placeholder={roles.principali.length > 0 ? "Seleziona i ruoli specifici..." : "Seleziona prima uno o più ruoli principali"}
			/>
			<FieldGroup className="grid gap-4 sm:grid-cols-3">
				<ProfileTextField id={`${prefix}-altezza`} label="Altezza (in cm)" value={draft.altezza} onChange={(value) => onChange("giocatore", "altezza", value)} placeholder="Es. 180" />
				<ProfileTextField id={`${prefix}-peso`} label="Peso (in kg)" value={draft.peso} onChange={(value) => onChange("giocatore", "peso", value)} placeholder="Es. 75" />
				<ProfileSelectField id={`${prefix}-piede`} label="Piede principale" value={draft.piede_principale} onChange={(value) => onChange("giocatore", "piede_principale", value)} options={MAIN_FOOT_OPTIONS} />
			</FieldGroup>
			<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange("giocatore", "presentazione", value)} placeholder="Esperienze, caratteristiche tecniche, disponibilità e obiettivi..." />
			<LinkAnnuncioField
				idPrefix={`${prefix}-video-highlights`}
				label="Link video highlights"
				placeholder="https://youtu.be/dQEemdsoLDM"
				description="Inserisci il link pubblico a un video con le tue azioni migliori"
				value={draft.video_highlights}
				onValueChange={(value) => onChange("giocatore", "video_highlights", value)}
				disabled={draft.richiede_caricamento_highlights}
				labelAddon={(
					<Tooltip>
						<TooltipTrigger render={<button type="button" className="inline-flex size-5 items-center justify-center rounded-full text-brand-indigo outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40" aria-label="Informazioni sul link video highlights" />}>
							<CircleHelpIcon className="size-4" />
						</TooltipTrigger>
						<TooltipContent className={"block"}>
							Possiedi il video nella tua galleria ma non hai modo di caricare un link?
							<Link href="/contatti" className="text-fuchsia-200 font-medium"> Contattaci e lo caricheremo noi su YouTube per te!</Link>
						</TooltipContent>
					</Tooltip>
				)}
			/>
			<Field orientation="horizontal">
				<Checkbox
					id={`${prefix}-richiede-caricamento-highlights`}
					checked={draft.richiede_caricamento_highlights}
					onCheckedChange={(checked) => {
						const requested = Boolean(checked);
						onChange("giocatore", "richiede_caricamento_highlights", requested);
						if (requested) onChange("giocatore", "video_highlights", "");
					}}
				/>
				<FieldContent>
					<FieldLabel htmlFor={`${prefix}-richiede-caricamento-highlights`} className="font-normal">
						Possiedo dei video ma non ho possibilità di caricarli online (ti contatteremo noi!)
					</FieldLabel>
				</FieldContent>
			</Field>
			<CareerHistoryFields
				idPrefix={`${prefix}-storico-carriera`}
				esperienze={toExperiences(draft.storico_carriera)}
				setEsperienze={experienceSetter(draft.storico_carriera, (value) => onChange("giocatore", "storico_carriera", value))}
			/>
		</>
	);
}

function ProfileSocialLinksFields({
	socialLinks,
	onSocialLinksChange,
}: {
	socialLinks: ProfileSocialLinks;
	onSocialLinksChange: (platform: ProfileSocialPlatform, value: string) => void;
}) {
	return (
		<FieldSet>
			<FieldLegend variant="label" className="field-legend-title mb-1">Social</FieldLegend>
			<FieldDescription>Mostra i profili che vuoi rendere pubblici sul tuo sottoprofilo.</FieldDescription>
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				{PROFILE_SOCIAL_LINK_OPTIONS.map(({platform, label, placeholder}) => (
					<div key={platform} className={platform === "website" ? "sm:col-span-2" : undefined}>
					<LinkAnnuncioField
						idPrefix={`profile-social-${platform}`}
						label={label}
						placeholder={placeholder}
						description={`Inserisci il link completo del tuo profilo ${label}.`}
						value={socialLinks[platform]}
						onValueChange={(value) => onSocialLinksChange(platform, value)}
					/>
					</div>
				))}
			</FieldGroup>
		</FieldSet>
	);
}

function ProfileFields({
	type,
	drafts,
	prefix,
	onChange,
	locations,
	onLocationsChange,
	requiredFields,
	errors,
}: {
	type: ProfileType;
	drafts: ProfileDrafts;
	prefix: string;
	onChange: ProfileDraftUpdater;
	locations: ProfileLocations;
	onLocationsChange: (type: ProfileType, value: ProfileLocationDraft[]) => void;
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
                <ProfileSelectField id={`${prefix}-tipologia`} label="Tipologia calcio" value={draft.tipologie_sport?.length === 1 ? draft.tipologie_sport[0] : ""} onChange={(value) => onChange(type, "tipologie_sport", value ? [value] : [])} options={TIPOLOGIA_CALCIO_OPTIONS.map((value) => ({value, label: value}))} placeholder="Seleziona una tipologia" required={requiredFields} error={errors.sports} />
                <ProfileSelectField id={`${prefix}-categoria-attuale`} label="Categoria attuale" value={draft.categoria_attuale} onChange={(value) => onChange(type, "categoria_attuale", value)} groups={CATEGORIE_CALCIO_GROUPS.map(({gruppo, opzioni}) => ({label: gruppo, options: opzioni.map(item => ({value: categoryKey(gruppo, item), label: item}))}))} placeholder="Non specificare" />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Storia, categorie, obiettivi e valori della società..." />
			</>
		);
	}

	if (type === "staff-sportivo") {
		const draft = drafts["staff-sportivo"];
		const historicalQualifications = Array.isArray(draft.storico_esperienze) ? draft.storico_esperienze : [];
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
				<Field orientation="horizontal">
					<Checkbox id={`${prefix}-disponibile-remoto`} checked={draft.disponibile_remoto} onCheckedChange={(checked) => onChange(type, "disponibile_remoto", checked === true)} />
					<FieldLabel htmlFor={`${prefix}-disponibile-remoto`}>Disponibile anche da remoto</FieldLabel>
				</Field>
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Esperienze, competenze, disponibilità e metodo di lavoro..." />
				<CareerHistoryFields idPrefix={`${prefix}-lista-esperienze`} staff esperienze={toExperiences(draft.lista_esperienze)} setEsperienze={experienceSetter(draft.lista_esperienze, (value) => onChange(type, "lista_esperienze", value))} />
				<EsperienzeAnnuncioFields idPrefix={`${prefix}-qualifiche`} titolo="Qualifiche / Licenze" requireState freeTextOrganization error={errors.qualificationState} esperienze={toExperiences(draft.qualifiche_licenze)} setEsperienze={experienceSetter(draft.qualifiche_licenze, (value) => onChange(type, "qualifiche_licenze", value))} />
				{historicalQualifications.length > 0 && <FieldSet>
					<FieldLegend variant="label">Qualifiche / Licenze precedenti</FieldLegend>
					<FieldDescription>Voci storiche conservate senza attribuire uno stato mancante.</FieldDescription>
					<div className="grid gap-3">{historicalQualifications.map((entry, index) => <p key={index} className="rounded-lg border bg-background p-4 text-sm whitespace-pre-wrap wrap-anywhere">{legacyQualificationText(entry)}</p>)}</div>
				</FieldSet>}
			</>
		);
	}

	if (type === "servizi-consulenze") {
		const draft = drafts["servizi-consulenze"];
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
				/>
				<FieldGroup className="grid gap-4 sm:grid-cols-2">
					<FiguraProfessionaleMultiselectField value={draft.figure_professionali ?? []} onValueChange={(value) => onChange(type, "figure_professionali", value)} />
					<TipologiaCalcioMultiselectField value={draft.tipologie_sport ?? []} onValueChange={(value) => onChange(type, "tipologie_sport", value)} />
					<DisponibilitaProfiloSelect id={`${prefix}-disponibilita`} value={toAvailability(draft.disponibilita)} onValueChange={(value) => onChange(type, "disponibilita", value)} />
					<ProfileSelectField id={`${prefix}-automunito`} label="Automunito" value={draft.automunito} onChange={(value) => onChange(type, "automunito", value)} options={DISPONIBILITA_SPOSTAMENTI_OPTIONS.map((option) => ({value: option.valore, label: option.etichetta}))} />
				</FieldGroup>
				<ProfileTextField id={`${prefix}-specializzazioni`} label="Specializzazioni" value={draft.specializzazioni} onChange={(value) => onChange(type, "specializzazioni", value)} placeholder="Ambiti, discipline e competenze" />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Racconta il tuo percorso professionale..." />
				<ProfileTextareaField id={`${prefix}-presentazione-servizi`} label="Presentazione servizi" value={draft.presentazione_servizi} onChange={(value) => onChange(type, "presentazione_servizi", value)} placeholder="Descrivi consulenze, percorsi e prestazioni..." />
				<CareerHistoryFields idPrefix={`${prefix}-lista-esperienze`} staff esperienze={toExperiences(draft.lista_esperienze)} setEsperienze={experienceSetter(draft.lista_esperienze, (value) => onChange(type, "lista_esperienze", value))} />
				<EsperienzeAnnuncioFields idPrefix={`${prefix}-qualifiche`} titolo="Qualifiche / Licenze" requireState freeTextOrganization error={errors.qualificationState} esperienze={toExperiences(draft.qualifiche_licenze)} setEsperienze={experienceSetter(draft.qualifiche_licenze, (value) => onChange(type, "qualifiche_licenze", value))} />
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
				<DisponibilitaProfiloSelect id={`${prefix}-disponibilita`} value={toAvailability(draft.disponibilita)} onValueChange={(value) => onChange(type, "disponibilita", value)} hideContract />
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Esperienza arbitrale, categorie seguite e disponibilità..." />
				<CareerHistoryFields idPrefix={`${prefix}-lista-esperienze`} staff esperienze={toExperiences(draft.lista_esperienze)} setEsperienze={experienceSetter(draft.lista_esperienze, (value) => onChange(type, "lista_esperienze", value))} />
				<EsperienzeAnnuncioFields idPrefix={`${prefix}-qualifiche`} titolo="Qualifiche / Licenze" requireState freeTextOrganization error={errors.qualificationState} esperienze={toExperiences(draft.qualifiche_licenze)} setEsperienze={experienceSetter(draft.qualifiche_licenze, (value) => onChange(type, "qualifiche_licenze", value))} />
			</>
		);
	}

	if (type === "creators") {
		const draft = drafts.creators;
		return (
			<>
				<ProfileTextField id={`${prefix}-nome-creator`} label="Nome creator" value={draft.nome_creator} onChange={(value) => onChange(type, "nome_creator", value)} placeholder="Nome del creator o del progetto" required={requiredFields} error={errors.name} />
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
				<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione torneo" value={draft.presentazione} onChange={(value) => onChange(type, "presentazione", value)} placeholder="Descrivi l'organizzazione e le sue attività..." />
			</>
		);
	}

	const draft = drafts["campi-impianti-sportivi"];
	return (
		<>
			<ProfileTextField id={`${prefix}-nome-organizzazione`} label="Nome campo/struttura" value={draft.nome_organizzazione} onChange={(value) => onChange("campi-impianti-sportivi", "nome_organizzazione", value)} placeholder="Centro Sportivo Esempio" required={requiredFields} error={errors.name} />
			<TipologiaCalcioMultiselectField label="Tipologia campi disponibili" value={draft.tipologie_sport ?? []} onValueChange={(value) => onChange("campi-impianti-sportivi", "tipologie_sport", value)} required={requiredFields} error={errors.sports} />
			<FacilityLocationField prefix={prefix} locations={locations["campi-impianti-sportivi"]} onLocationsChange={(value) => onLocationsChange("campi-impianti-sportivi", value)} address={draft.indirizzo} onAddressChange={(value) => onChange("campi-impianti-sportivi", "indirizzo", value)} error={errors.locations} />
			<ProfileTextareaField id={`${prefix}-presentazione`} label="Presentazione" value={draft.presentazione} onChange={(value) => onChange("campi-impianti-sportivi", "presentazione", value)} placeholder="Descrivi la tua organizzazione, gli obiettivi, le modalità operative..." />
			<ProfileTextareaField id={`${prefix}-info-aggiuntive`} label="Informazioni aggiuntive" value={draft.info_aggiuntive} onChange={(value) => onChange("campi-impianti-sportivi", "info_aggiuntive", value)} placeholder="Modalità di prenotazione, regolamenti..." />
		</>
	);
}

export default function ProfileDetailsForm({
	type,
	drafts,
	locations,
	onChange,
	onLocationsChange,
	socialLinks,
	onSocialLinksChange,
	errors = {},
}: ProfileDetailsFormProps) {
	const prefix = `registration-profile-${type}`;

	return (
		<FieldSet className="[&_input::placeholder]:text-sm [&_textarea::placeholder]:text-sm">
			<FieldLegend variant="label" className="field-legend-title mb-2">Inserisci i dati del tuo profilo:</FieldLegend>
			<FieldGroup className="mt-2 grid gap-4">
				<ProfileFields type={type} drafts={drafts} prefix={prefix} onChange={onChange} locations={locations} onLocationsChange={onLocationsChange} requiredFields={true} errors={errors} />
				<ProfileSocialLinksFields socialLinks={socialLinks} onSocialLinksChange={onSocialLinksChange} />
				{type !== "campi-impianti-sportivi" && <LocationsField
					type={type}
					prefix={prefix}
					locations={locations}
					onLocationsChange={onLocationsChange}
					required={true}
					error={errors.locations ?? null}
				/>}
			</FieldGroup>
		</FieldSet>
	);
}
