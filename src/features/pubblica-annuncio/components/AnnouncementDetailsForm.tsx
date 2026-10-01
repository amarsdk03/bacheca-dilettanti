"use client";

import {type Dispatch, type SetStateAction, useMemo} from "react";
import {MailIcon, PhoneIcon} from "lucide-react";

import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {TIPOLOGIA_CALCIO_OPTIONS} from "@/features/pubblica-annuncio/types/tipologie-calcio";
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from "@/components/ui/input-group";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import ProfileLocationsField from "@/features/profilo/ProfileLocationsField";
import type {ProfileLocationDraft} from "@/features/profilo/profile-model";
import {OpeningHoursField} from "@/features/profilo/ProfileDetailsForm";
import CategorieCalcioMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/CategorieCalcioMultiselectField";
import FiguraProfessionaleMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/FiguraProfessionaleMultiselectField";
import FieldRequirementIndicator, {
	RequiredMark
} from "@/features/pubblica-annuncio/components/InputFields/FieldRequirementIndicator";
import ImmagineAnnuncioField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioField";
import LinkAnnuncioField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioField";
import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import PremiTrofeiFields from "@/features/pubblica-annuncio/components/InputFields/PremiTrofeiFields";
import RuoloPrincipaleMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/RuoloPrincipaleMultiselectField";
import TipologiaCalcioMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";
import type {
	AnnouncementContacts,
	AnnouncementDetailsDrafts,
	AnnouncementExtras,
	AnnouncementValidationErrors,
	PublishableProfileType,
	TeamAnnouncementSubtype,
	TournamentPrize,
} from "@/features/pubblica-annuncio/publish-model";
import {
	ANNATE_OPTIONS,
	CATEGORIE_CALCIO_GROUPS,
	MODALITA_ISCRIZIONE_OPTIONS,
	RUOLI_SPECIFICI_PER_RUOLO,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {STAFF_CATEGORY_GROUPS, staffCategoryLabel} from "@/features/pubblica-annuncio/types/staff-category-catalog";
import type {Json} from "@/server/supabase";
import {getPlayerSpecificRoleGroups} from "@/features/profilo/player-roles";

interface AnnouncementDetailsFormProps {
	profileType: PublishableProfileType;
	teamSubtype: TeamAnnouncementSubtype | null;
	announcementTitle: string;
	onAnnouncementTitleChange: (value: string) => void;
	drafts: AnnouncementDetailsDrafts;
	onDraftsChange: Dispatch<SetStateAction<AnnouncementDetailsDrafts>>;
	locations: ProfileLocationDraft[];
	onLocationsChange: (value: ProfileLocationDraft[]) => void;
	contacts: AnnouncementContacts;
	onContactsChange: Dispatch<SetStateAction<AnnouncementContacts>>;
	extras: AnnouncementExtras;
	onExtrasChange: Dispatch<SetStateAction<AnnouncementExtras>>;
	image: File | null;
	onImageChange: (value: File | null) => void;
	errors?: AnnouncementValidationErrors;
}

function DescriptionField({
	id,
	label,
	value,
	onChange,
	required = false,
	recommended = false,
	placeholder,
	error,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	recommended?: boolean;
	placeholder: string;
	error?: string;
}) {
	return (
		<Field data-invalid={Boolean(error)}>
			<div className="flex items-center justify-between gap-3">
				<FieldLabel htmlFor={id}>
					{label} {recommended && !required
						? <OptionalLabel value="consigliato" />
						: <FieldRequirementIndicator required={required} />}
				</FieldLabel>
				<span className="text-xs text-muted-foreground">{value.length}/5000</span>
			</div>
			<Textarea
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value.slice(0, 5000))}
				placeholder={placeholder}
				maxLength={5000}
				required={required}
				aria-required={required}
				aria-invalid={Boolean(error)}
				className="min-h-32 resize-y"
			/>
			{error && <FieldError>{error}</FieldError>}
		</Field>
	);
}

function TextField({
	id,
	label,
	value,
	onChange,
	required = false,
	placeholder,
	type = "text",
	min,
	max,
	step,
	maxLength = 160,
	error,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	placeholder?: string;
	type?: "text" | "number" | "date" | "time";
	min?: number;
	max?: number;
	step?: number;
	maxLength?: number;
	error?: string;
}) {
	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={id}>{label} <FieldRequirementIndicator required={required} /></FieldLabel>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				min={min}
				max={max}
				step={step}
				maxLength={type === "text" ? maxLength : undefined}
				required={required}
				aria-required={required}
				aria-invalid={Boolean(error)}
			/>
			{error && <FieldError>{error}</FieldError>}
		</Field>
	);
}

export default function AnnouncementDetailsForm({
	profileType,
	teamSubtype,
	announcementTitle,
	onAnnouncementTitleChange,
	drafts,
	onDraftsChange,
	locations,
	onLocationsChange,
	contacts,
	onContactsChange,
	extras,
	onExtrasChange,
	image,
	onImageChange,
	errors = {},
}: AnnouncementDetailsFormProps) {
	const updateDraft = <
		Key extends keyof AnnouncementDetailsDrafts,
		FieldName extends keyof AnnouncementDetailsDrafts[Key],
	>(key: Key, field: FieldName, value: AnnouncementDetailsDrafts[Key][FieldName]) => {
		onDraftsChange((previous) => ({
			...previous,
			[key]: {...previous[key], [field]: value},
		}));
	};

	const playerSpecificRoles = useMemo(() => Array.from(new Set(
		drafts.squadraCercaGiocatore.ruoli_principali.flatMap((role) => RUOLI_SPECIFICI_PER_RUOLO[role] ?? []),
	)), [drafts.squadraCercaGiocatore.ruoli_principali]);

	const setPrizes: Dispatch<SetStateAction<TournamentPrize[]>> = (nextValue) => {
		const current = drafts.torneoEvento.lista_premi_trofei;
		updateDraft(
			"torneoEvento",
			"lista_premi_trofei",
			typeof nextValue === "function" ? nextValue(current) : nextValue,
		);
	};

	return (
		<FieldGroup className="w-full gap-8">
			<FieldSet>
				<FieldLegend variant="label" className="field-legend-title mb-4">Inserisci i dati dell&apos;annuncio:</FieldLegend>
				{errors.type && (
					<Field data-invalid>
						<FieldError>{errors.type}</FieldError>
					</Field>
				)}
				<FieldGroup>
					<Field data-invalid={Boolean(errors.title)}>
						<div className="flex items-center justify-between gap-3">
							<FieldLabel htmlFor="announcement-title">Titolo annuncio <OptionalLabel /></FieldLabel>
							<span className="text-xs text-muted-foreground">{announcementTitle.length}/50</span>
						</div>
						<Input
							id="announcement-title"
							value={announcementTitle}
							onChange={(event) => onAnnouncementTitleChange(event.target.value.slice(0, 50))}
							maxLength={50}
							placeholder="Lascia vuoto per usare il titolo predefinito"
							aria-invalid={Boolean(errors.title)}
						/>
						{errors.title && <FieldError>{errors.title}</FieldError>}
					</Field>
				</FieldGroup>

				{profileType === "giocatore" && (
					<FieldGroup>
						<div>
							<CategorieCalcioMultiselectField
								label="Categorie ricercate"
								items={CATEGORIE_CALCIO_GROUPS}
								value={drafts.giocatore.categorie_ricercate}
								onValueChangeAction={(value) => updateDraft("giocatore", "categorie_ricercate", value)}
								includeAny
								className={"pb-2"}
							/>
							<FieldDescription>Se non trovi la tua categoria specifica, scrivila nella descrizione dell’annuncio.</FieldDescription>
						</div>
						<DescriptionField
							id="announcement-player-description"
							label="Descrizione"
							value={drafts.giocatore.descrizione_aggiuntiva}
							onChange={(value) => updateDraft("giocatore", "descrizione_aggiuntiva", value)}
							required
							error={errors.description}
							placeholder="Descrivi disponibilità, obiettivi e tipo di opportunità che stai cercando..."
						/>
					</FieldGroup>
				)}

				{profileType === "squadra" && teamSubtype === "cerca-giocatore" && (
					<FieldGroup>
						<RuoloPrincipaleMultiselectField
							label="Ruolo/i cercati"
							value={drafts.squadraCercaGiocatore.ruoli_principali}
							onValueChange={(value) => {
								const allowed = new Set(value.flatMap((role) => RUOLI_SPECIFICI_PER_RUOLO[role] ?? []));
								updateDraft("squadraCercaGiocatore", "ruoli_principali", value);
								updateDraft("squadraCercaGiocatore", "ruoli_secondari", drafts.squadraCercaGiocatore.ruoli_secondari.filter((role) => allowed.has(role)));
							}}
							required
							error={errors.mainRoles}
						/>
						<MultiselectField
							label="Ruoli specifici"
							options={playerSpecificRoles}
							groups={getPlayerSpecificRoleGroups(drafts.squadraCercaGiocatore.ruoli_principali)}
							value={drafts.squadraCercaGiocatore.ruoli_secondari}
							onValueChange={(value) => updateDraft("squadraCercaGiocatore", "ruoli_secondari", value)}
							placeholder={playerSpecificRoles.length > 0 ? "Seleziona i ruoli specifici..." : "Seleziona prima un ruolo principale"}
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field data-invalid={Boolean(errors.yearFrom)}>
								<FieldLabel htmlFor="team-player-year-from">Annate dal <OptionalLabel /></FieldLabel>
								<Select value={drafts.squadraCercaGiocatore.annata_da || null} onValueChange={(value) => onDraftsChange((previous) => {
									const from = value ?? "";
									const to = previous.squadraCercaGiocatore.annata_a;
									return {...previous, squadraCercaGiocatore: {...previous.squadraCercaGiocatore, annata_da: from, annata_a: from && to && Number(to) >= Number(from) ? to : ""}};
								})}>
									<SelectTrigger id="team-player-year-from" className="w-full" aria-invalid={Boolean(errors.yearFrom)}><SelectValue placeholder="Qualsiasi" /></SelectTrigger>
									<SelectContent><SelectItem value={null}>Qualsiasi</SelectItem>{ANNATE_OPTIONS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
								</Select>
								{errors.yearFrom && <FieldError>{errors.yearFrom}</FieldError>}
							</Field>
							<Field data-invalid={Boolean(errors.yearTo)} data-disabled={!drafts.squadraCercaGiocatore.annata_da}>
								<FieldLabel htmlFor="team-player-year-to">Annate al {drafts.squadraCercaGiocatore.annata_da ? <RequiredMark /> : <OptionalLabel />}</FieldLabel>
								<Select value={drafts.squadraCercaGiocatore.annata_a || null} onValueChange={(value) => updateDraft("squadraCercaGiocatore", "annata_a", value ?? "")}>
									<SelectTrigger id="team-player-year-to" className="w-full" disabled={!drafts.squadraCercaGiocatore.annata_da} aria-required={Boolean(drafts.squadraCercaGiocatore.annata_da)} aria-invalid={Boolean(errors.yearTo)}><SelectValue placeholder="Seleziona l'annata finale" /></SelectTrigger>
									<SelectContent><SelectItem value={null}>Seleziona</SelectItem>{ANNATE_OPTIONS.filter((year) => Number(year) >= Number(drafts.squadraCercaGiocatore.annata_da)).map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
								</Select>
								{errors.yearTo && <FieldError>{errors.yearTo}</FieldError>}
							</Field>
						</div>
						<TextField id="team-player-season" label="Stagione" value={drafts.squadraCercaGiocatore.stagione} onChange={(value) => updateDraft("squadraCercaGiocatore", "stagione", value)} maxLength={80} placeholder="Es. 2026/2027" />
						<DescriptionField id="team-player-description" label="Descrizione della ricerca" value={drafts.squadraCercaGiocatore.descrizione_aggiuntiva} onChange={(value) => updateDraft("squadraCercaGiocatore", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Indica requisiti, impegno richiesto e informazioni utili..." />
					</FieldGroup>
				)}

				{profileType === "squadra" && teamSubtype === "cerca-staff" && (
					<FieldGroup>
						<FiguraProfessionaleMultiselectField label="Figure ricercate" value={drafts.squadraCercaStaff.figure_ricercate} onValueChange={(value) => updateDraft("squadraCercaStaff", "figure_ricercate", value)} required error={errors.professionalRole} />
						<div className="grid gap-4 sm:grid-cols-2">
							<TextField id="team-staff-sector" label="Settore" value={drafts.squadraCercaStaff.settore} onChange={(value) => updateDraft("squadraCercaStaff", "settore", value)} placeholder="Es. Prima squadra" />
							<TextField id="team-staff-compensation" label="Compenso mensile" type="number" min={0} max={99_999_999.99} step={0.01} value={drafts.squadraCercaStaff.compenso_mensile} onChange={(value) => updateDraft("squadraCercaStaff", "compenso_mensile", value)} error={errors.monthlyCompensation} placeholder="EUR" />
						</div>
						<TextField id="team-staff-season" label="Stagione" value={drafts.squadraCercaStaff.stagione} onChange={(value) => updateDraft("squadraCercaStaff", "stagione", value)} maxLength={80} placeholder="Es. 2026/2027" />
						<DescriptionField id="team-staff-requirements" label="Requisiti" value={drafts.squadraCercaStaff.requisiti} onChange={(value) => updateDraft("squadraCercaStaff", "requisiti", value)} required error={errors.requirements} placeholder="Qualifiche, esperienza e disponibilità richieste..." />
						<DescriptionField id="team-staff-description" label="Informazioni aggiuntive" value={drafts.squadraCercaStaff.descrizione_aggiuntiva} onChange={(value) => updateDraft("squadraCercaStaff", "descrizione_aggiuntiva", value)} placeholder="Dettagli sull’incarico e sull’ambiente di lavoro..." />
					</FieldGroup>
				)}

				{profileType === "squadra" && teamSubtype === "cerca-partite-amichevoli" && (
					<FieldGroup>
						<CategorieCalcioMultiselectField label="Livello avversario cercato" items={CATEGORIE_CALCIO_GROUPS} value={drafts.squadraCercaPartita.categorie_avversario} onValueChangeAction={(value) => updateDraft("squadraCercaPartita", "categorie_avversario", value)} required error={errors.matchCategories} />
						<div className="grid gap-4 sm:grid-cols-2">
							<TextField id="team-match-from" label="Periodo dal" type="date" value={drafts.squadraCercaPartita.periodo_dal} onChange={(value) => updateDraft("squadraCercaPartita", "periodo_dal", value)} error={errors.periodFrom} />
							<TextField id="team-match-to" label="Periodo al" type="date" value={drafts.squadraCercaPartita.periodo_al} onChange={(value) => updateDraft("squadraCercaPartita", "periodo_al", value)} error={errors.periodTo} />
							<TextField id="team-match-time-from" label="Orario dalle" type="time" value={drafts.squadraCercaPartita.orario_dalle} onChange={(value) => updateDraft("squadraCercaPartita", "orario_dalle", value)} error={errors.matchTimeFrom} />
							<TextField id="team-match-time-to" label="Orario alle" type="time" value={drafts.squadraCercaPartita.orario_alle} onChange={(value) => updateDraft("squadraCercaPartita", "orario_alle", value)} error={errors.matchTimeTo ?? errors.matchTimes} />
						</div>
						<Field>
							<FieldLabel htmlFor="team-match-travel">Disponibilità alla trasferta <OptionalLabel /></FieldLabel>
							<Select value={drafts.squadraCercaPartita.disponibilita_trasferta || null} onValueChange={(value) => updateDraft("squadraCercaPartita", "disponibilita_trasferta", value ?? "")}>
								<SelectTrigger id="team-match-travel" className="w-full"><SelectValue placeholder="Non specificata" /></SelectTrigger>
								<SelectContent><SelectItem value={null}>Non specificare</SelectItem><SelectItem value="Si">Sì</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
							</Select>
						</Field>
						<DescriptionField id="team-match-description" label="Informazioni aggiuntive" value={drafts.squadraCercaPartita.descrizione_aggiuntiva} onChange={(value) => updateDraft("squadraCercaPartita", "descrizione_aggiuntiva", value)} placeholder="Formula, livello, disponibilità del campo e altre informazioni..." />
					</FieldGroup>
				)}

				{profileType === "squadra" && teamSubtype === "cerca-sponsor" && (
					<FieldGroup>
						<TextField id="team-sponsor-sector" label="Settore" value={drafts.squadraCercaSponsor.categoria_settore} onChange={(value) => updateDraft("squadraCercaSponsor", "categoria_settore", value)} required error={errors.sponsorSector} placeholder="Es. Tutta la società, Prima squadra, Settore Giovanile..." />
						<DescriptionField id="team-sponsor-offer" label="Visibilità offerta" value={drafts.squadraCercaSponsor.offerta_fornita} onChange={(value) => updateDraft("squadraCercaSponsor", "offerta_fornita", value)} required error={errors.sponsorOffer} placeholder="Iniziative, materiali, spazi e altre opportunità di visibilità..." />
						<DescriptionField id="team-sponsor-description" label="Informazioni aggiuntive" value={drafts.squadraCercaSponsor.descrizione_aggiuntiva} onChange={(value) => updateDraft("squadraCercaSponsor", "descrizione_aggiuntiva", value)} placeholder="Aggiungi eventuali dettagli utili..." />
					</FieldGroup>
				)}

				{profileType === "staff-sportivo" && (
					<FieldGroup>
						<TipologiaCalcioMultiselectField value={drafts.staffSportivo.tipologie_sport} onValueChange={(value) => updateDraft("staffSportivo", "tipologie_sport", value)} required error={errors.sports} />
						<CategorieCalcioMultiselectField label="Categorie ricercate" items={STAFF_CATEGORY_GROUPS} formatValueAction={staffCategoryLabel} value={drafts.staffSportivo.categorie_ricercate} onValueChangeAction={(value) => updateDraft("staffSportivo", "categorie_ricercate", value)} includeAny error={errors.staffCategories} />
						<Field data-invalid={Boolean(errors.staffTravel)}>
							<FieldLabel htmlFor="staff-travel">Disponibilità agli spostamenti <OptionalLabel /></FieldLabel>
							<Select value={drafts.staffSportivo.disponibilita_spostamento || null} onValueChange={(value) => updateDraft("staffSportivo", "disponibilita_spostamento", value ?? "")}>
								<SelectTrigger id="staff-travel" className="w-full" aria-invalid={Boolean(errors.staffTravel)}><SelectValue placeholder="Non specificata" /></SelectTrigger>
								<SelectContent><SelectItem value={null}>Non specificare</SelectItem><SelectItem value="Si">Sì</SelectItem><SelectItem value="No">No</SelectItem><SelectItem value="Da valutare">Da valutare</SelectItem></SelectContent>
							</Select>
							{errors.staffTravel && <FieldError>{errors.staffTravel}</FieldError>}
						</Field>
						<DescriptionField id="staff-description" label="Descrizione" value={drafts.staffSportivo.descrizione_aggiuntiva} onChange={(value) => updateDraft("staffSportivo", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Descrivi l’opportunità professionale che cerchi..." />
					</FieldGroup>
				)}

				{profileType === "arbitro" && (
					<FieldGroup>
						<TipologiaCalcioMultiselectField value={drafts.arbitro.tipologie_sport} onValueChange={(value) => updateDraft("arbitro", "tipologie_sport", value)} required error={errors.sports} />
						<div className="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="referee-car">Automunito <OptionalLabel /></FieldLabel>
								<Select value={drafts.arbitro.automunito || null} onValueChange={(value) => updateDraft("arbitro", "automunito", value ?? "")}>
									<SelectTrigger id="referee-car" className="w-full"><SelectValue placeholder="Non specificato" /></SelectTrigger>
									<SelectContent><SelectItem value={null}>Non specificare</SelectItem><SelectItem value="Si">Sì</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="referee-travel">Disponibilità agli spostamenti <OptionalLabel /></FieldLabel>
								<Select value={drafts.arbitro.disponibilita_spostamento || null} onValueChange={(value) => updateDraft("arbitro", "disponibilita_spostamento", value ?? "")}>
									<SelectTrigger id="referee-travel" className="w-full"><SelectValue placeholder="Non specificata" /></SelectTrigger>
									<SelectContent><SelectItem value={null}>Non specificare</SelectItem><SelectItem value="Si">Sì</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
								</Select>
							</Field>
						</div>
						<DescriptionField id="referee-description" label="Descrizione" value={drafts.arbitro.descrizione_aggiuntiva} onChange={(value) => updateDraft("arbitro", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Descrivi disponibilità e tipo di incarichi cercati..." />
					</FieldGroup>
				)}

				{profileType === "servizi-consulenze" && (
					<FieldGroup>
						<FiguraProfessionaleMultiselectField label="Figure professionali" value={drafts.serviziConsulenze.figura_professionale} onValueChange={(value) => updateDraft("serviziConsulenze", "figura_professionale", value)} required error={errors.professionalRole} />
						<TipologiaCalcioMultiselectField value={drafts.serviziConsulenze.tipologie_sport} onValueChange={(value) => updateDraft("serviziConsulenze", "tipologie_sport", value)} />
						<TextField id="service-specialization" label="Specializzazione" value={drafts.serviziConsulenze.specializzazione} onChange={(value) => updateDraft("serviziConsulenze", "specializzazione", value)} placeholder="Ambito o disciplina di specializzazione" />
						<DescriptionField id="service-presentation" label="Servizi offerti" value={drafts.serviziConsulenze.presentazione_servizi} onChange={(value) => updateDraft("serviziConsulenze", "presentazione_servizi", value)} required error={errors.servicePresentation} placeholder="Descrivi consulenze, percorsi e prestazioni..." />
						<DescriptionField id="service-description" label="Altre informazioni" value={drafts.serviziConsulenze.descrizione_aggiuntiva} onChange={(value) => updateDraft("serviziConsulenze", "descrizione_aggiuntiva", value)} placeholder="Aggiungi eventuali dettagli..." />
					</FieldGroup>
				)}

				{profileType === "creators" && (
					<FieldGroup>
						<DescriptionField
							id="creator-announcement-description"
							label="Descrizione dell’annuncio"
							value={drafts.creator.descrizione_post}
							onChange={(value) => updateDraft("creator", "descrizione_post", value)}
							recommended
							placeholder="Descrivi il contenuto, la collaborazione o l’opportunità proposta..."
						/>
					</FieldGroup>
				)}

				{profileType === "torneo-evento" && (
					<FieldGroup>
						<TextField id="tournament-name" label="Nome torneo / evento" value={drafts.torneoEvento.nome_evento} onChange={(value) => updateDraft("torneoEvento", "nome_evento", value)} required error={errors.tournamentName} placeholder="Torneo estivo 2026" />
						<Field data-invalid={Boolean(errors.sports)}>
							<FieldLabel htmlFor="tournament-sport-type">Tipologia calcio <RequiredMark /></FieldLabel>
							<Select value={drafts.torneoEvento.tipologie_sport[0] ?? null} onValueChange={(value) => updateDraft("torneoEvento", "tipologie_sport", value ? [value] : [])}>
								<SelectTrigger id="tournament-sport-type" className="w-full" aria-required="true" aria-invalid={Boolean(errors.sports)}><SelectValue placeholder="Seleziona una tipologia" /></SelectTrigger>
								<SelectContent><SelectItem value={null}>Seleziona una tipologia</SelectItem>{TIPOLOGIA_CALCIO_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
							</Select>
							{errors.sports && <FieldError>{errors.sports}</FieldError>}
						</Field>
						<Field>
							<FieldLabel htmlFor="tournament-registration">Modalità di iscrizione <OptionalLabel /></FieldLabel>
							<Select value={drafts.torneoEvento.modalita_iscrizione || null} onValueChange={(value) => updateDraft("torneoEvento", "modalita_iscrizione", value ?? "")}>
								<SelectTrigger id="tournament-registration" className="w-full"><SelectValue placeholder="Non specificata" /></SelectTrigger>
								<SelectContent><SelectItem value={null}>Non specificare</SelectItem>{MODALITA_ISCRIZIONE_OPTIONS.map((option) => <SelectItem key={option.valore} value={option.valore}>{option.etichetta}</SelectItem>)}</SelectContent>
							</Select>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="tournament-year-from">Annate ammesse da <OptionalLabel /></FieldLabel>
								<Select value={drafts.torneoEvento.annate_ammesse_da || null} onValueChange={(value) => updateDraft("torneoEvento", "annate_ammesse_da", value ?? "")}>
									<SelectTrigger id="tournament-year-from" className="w-full"><SelectValue placeholder="Non specificata" /></SelectTrigger>
									<SelectContent><SelectItem value={null}>Non specificare</SelectItem>{ANNATE_OPTIONS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
								</Select>
							</Field>
							<Field data-invalid={Boolean(errors.tournamentYears)}>
								<FieldLabel htmlFor="tournament-year-to">Annate ammesse a <OptionalLabel /></FieldLabel>
								<Select value={drafts.torneoEvento.annate_ammesse_a || null} onValueChange={(value) => updateDraft("torneoEvento", "annate_ammesse_a", value ?? "")}>
									<SelectTrigger id="tournament-year-to" className="w-full" aria-invalid={Boolean(errors.tournamentYears)}><SelectValue placeholder="Non specificata" /></SelectTrigger>
									<SelectContent><SelectItem value={null}>Non specificare</SelectItem>{ANNATE_OPTIONS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
								</Select>
								{errors.tournamentYears && <FieldError>{errors.tournamentYears}</FieldError>}
							</Field>
							<TextField id="tournament-teams" label="Numero squadre" type="number" min={1} max={100_000} step={1} value={drafts.torneoEvento.numero_squadre} onChange={(value) => updateDraft("torneoEvento", "numero_squadre", value)} error={errors.tournamentTeams} />
							<Field data-invalid={Boolean(errors.tournamentCost)}>
								<FieldLabel htmlFor="tournament-cost">Costo partecipazione <OptionalLabel /></FieldLabel>
								<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
									<Input id="tournament-cost" type="number" min={0} max={99_999_999.99} step={0.01} value={drafts.torneoEvento.costo_partecipazione} onChange={(event) => updateDraft("torneoEvento", "costo_partecipazione", event.target.value)} aria-invalid={Boolean(errors.tournamentCost)} />
									<Select value={drafts.torneoEvento.tipo_partecipazione} onValueChange={(value) => updateDraft("torneoEvento", "tipo_partecipazione", value ?? "squadra")}>
										<SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
										<SelectContent><SelectItem value="giocatore">Per giocatore</SelectItem><SelectItem value="squadra">Per squadra</SelectItem></SelectContent>
									</Select>
								</div>
								{errors.tournamentCost && <FieldError>{errors.tournamentCost}</FieldError>}
							</Field>
						</div>
						<PremiTrofeiFields premiTrofei={drafts.torneoEvento.lista_premi_trofei} setPremiTrofei={setPrizes} error={errors.tournamentPrizes ?? null} />
						<DescriptionField id="tournament-description" label="Descrizione" value={drafts.torneoEvento.descrizione_aggiuntiva} onChange={(value) => updateDraft("torneoEvento", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Programma, regolamento, date e altre informazioni utili..." />
					</FieldGroup>
				)}

				{profileType === "campi-impianti-sportivi" && (
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="facility-sport-type">
								Tipologia campo da pubblicizzare <RequiredMark />
							</FieldLabel>
							<Select value={drafts.campoImpianto.tipologie_sport[0] ?? null} onValueChange={(value) => updateDraft("campoImpianto", "tipologie_sport", value ? [value] : [])}>
								<SelectTrigger id="facility-sport-type" className="w-full" aria-required="true" aria-invalid={Boolean(errors.sports)}><SelectValue placeholder="Seleziona una tipologia di campo" /></SelectTrigger>
								<SelectContent>{TIPOLOGIA_CALCIO_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
							</Select>
							{errors.sports && <FieldError>{errors.sports}</FieldError>}
						</Field>
						<FieldSet data-invalid={Boolean(errors.locations || errors.facilityAddress)}>
							<FieldLegend variant="label" className="field-legend-title">Indirizzo del campo</FieldLegend>
							<FieldGroup className="grid gap-4 sm:grid-cols-2">
								<Field data-invalid={Boolean(errors.locations)}>
									<FieldLabel htmlFor="facility-announcement-region">Regione <RequiredMark /></FieldLabel>
									<Select value={locations[0]?.regione ?? null} onValueChange={(region) => onLocationsChange(region ? [{regione: region, citta: null}] : [])}>
										<SelectTrigger id="facility-announcement-region" className="w-full" aria-required="true" aria-invalid={Boolean(errors.locations)}><SelectValue placeholder="Seleziona una regione" /></SelectTrigger>
										<SelectContent>{REGIONI_ITALIANE.map(({nome}) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}</SelectContent>
									</Select>
								</Field>
								<Field data-invalid={Boolean(errors.locations && locations[0]?.regione)}>
									<FieldLabel htmlFor="facility-announcement-city">Città/comune <RequiredMark /></FieldLabel>
									<Input id="facility-announcement-city" value={locations[0]?.citta ?? ""} onChange={(event) => onLocationsChange([{regione: locations[0]?.regione ?? "", citta: event.target.value || null}])} disabled={!locations[0]?.regione} maxLength={120} required aria-required="true" aria-invalid={Boolean(errors.locations && locations[0]?.regione)} placeholder="Es. Roma" />
								</Field>
								<Field data-invalid={Boolean(errors.facilityAddress)} className="sm:col-span-2">
									<FieldLabel htmlFor="facility-announcement-address">Indirizzo <RequiredMark /></FieldLabel>
									<Input id="facility-announcement-address" value={drafts.campoImpianto.indirizzo} onChange={(event) => updateDraft("campoImpianto", "indirizzo", event.target.value)} maxLength={160} required aria-required="true" aria-invalid={Boolean(errors.facilityAddress)} placeholder="Via, numero civico e altri dettagli" />
									{errors.facilityAddress && <FieldError>{errors.facilityAddress}</FieldError>}
								</Field>
							</FieldGroup>
							{errors.locations && <FieldError>{errors.locations}</FieldError>}
						</FieldSet>
						<OpeningHoursField idPrefix="facility-announcement-hours" value={drafts.campoImpianto.orari as unknown as Json} onChange={(value) => updateDraft("campoImpianto", "orari", value as unknown as AnnouncementDetailsDrafts["campoImpianto"]["orari"])} error={errors.facilityHours} />
						<Field data-invalid={Boolean(errors.facilityCost)}>
							<FieldLabel htmlFor="facility-cost">Prezzo orario <OptionalLabel /></FieldLabel>
							<InputGroup>
								<InputGroupAddon><InputGroupText>€</InputGroupText></InputGroupAddon>
								<InputGroupInput id="facility-cost" type="number" min={0} max={999_999.99} step={5} value={drafts.campoImpianto.costo_partenza} onChange={(event) => updateDraft("campoImpianto", "costo_partenza", event.target.value)} placeholder="A partire da..." aria-invalid={Boolean(errors.facilityCost)} />
								<InputGroupAddon align="inline-end"><InputGroupText>/ 1h</InputGroupText></InputGroupAddon>
							</InputGroup>
							{errors.facilityCost && <FieldError>{errors.facilityCost}</FieldError>}
						</Field>
						<DescriptionField id="facility-services" label="Servizi inclusi" value={drafts.campoImpianto.servizi_inclusi} onChange={(value) => updateDraft("campoImpianto", "servizi_inclusi", value)} placeholder="Spogliatoi, illuminazione, parcheggio, bar..." />
						<DescriptionField id="facility-description" label="Descrizione" value={drafts.campoImpianto.descrizione_aggiuntiva} onChange={(value) => updateDraft("campoImpianto", "descrizione_aggiuntiva", value)} placeholder="Descrivi tipologia del terreno, dimensioni, presenza porte/attrezzatura..." />
					</FieldGroup>
				)}
			</FieldSet>

			<FieldSet>
				<FieldLegend variant="label" className="field-legend-title mb-1.5">Contenuti aggiuntivi</FieldLegend>
				<FieldDescription>Tutti questi campi sono facoltativi e vengono pubblicati insieme all’annuncio.</FieldDescription>
				<FieldGroup>
					<LinkAnnuncioField
						idPrefix="announcement"
						value={extras.genericLink}
						onValueChange={(genericLink) => onExtrasChange((previous) => ({...previous, genericLink}))}
						error={errors.genericLink}
					/>
					<ImmagineAnnuncioField idPrefix="announcement" value={image} onValueChangeAction={onImageChange} />
				</FieldGroup>
			</FieldSet>

			<FieldSet>
				<FieldLegend variant="label" className="field-legend-title mb-1.5">Contatti pubblici per questo annuncio <RequiredMark /></FieldLegend>
				<FieldDescription>Inserisci almeno un indirizzo email o un recapito telefonico.</FieldDescription>
				<Field data-invalid={Boolean(errors.contacts)}>
					<FieldGroup className="grid gap-4 sm:grid-cols-2">
					<Field data-invalid={Boolean(errors.contacts || errors.email)}>
						<FieldLabel htmlFor="announcement-contact-email" className="flex items-center gap-2"><MailIcon className="size-4" /> Email <OptionalLabel value={"consigliato"} /></FieldLabel>
						<Input id="announcement-contact-email" type="email" maxLength={254} value={contacts.email} onChange={(event) => onContactsChange((previous) => ({...previous, email: event.target.value}))} placeholder="nome@email.it" aria-invalid={Boolean(errors.contacts || errors.email)} />
						{errors.email && <FieldError>{errors.email}</FieldError>}
					</Field>
					<Field data-invalid={Boolean(errors.contacts || errors.phone)}>
						<FieldLabel htmlFor="announcement-contact-phone" className="flex items-center gap-2"><PhoneIcon className="size-4" /> Telefono <OptionalLabel /></FieldLabel>
						<Input id="announcement-contact-phone" type="tel" maxLength={40} value={contacts.phone} onChange={(event) => onContactsChange((previous) => ({...previous, phone: event.target.value}))} placeholder="+39 333 123 4567" aria-invalid={Boolean(errors.contacts || errors.phone)} />
						{errors.phone && <FieldError>{errors.phone}</FieldError>}
					</Field>
					</FieldGroup>
					{errors.contacts && <FieldError>{errors.contacts}</FieldError>}
				</Field>
			</FieldSet>

			{!(profileType === "squadra" && teamSubtype === "cerca-sponsor") && (
				<ProfileLocationsField idPrefix="announcement-locations" value={locations} onValueChange={onLocationsChange} label={profileType === "creators" ? "Di che zona/e ti occupi" : "Zone di ricerca"} required error={errors.locations ?? null} />
			)}
		</FieldGroup>
	);
}
