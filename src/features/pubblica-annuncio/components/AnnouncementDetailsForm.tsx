"use client";

import {useMemo, type Dispatch, type SetStateAction} from "react";
import {CircleHelpIcon, MailIcon, PhoneIcon} from "lucide-react";

import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from "@/components/ui/input-group";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import ProfileLocationsField from "@/features/profilo/ProfileLocationsField";
import type {ProfileLocationDraft} from "@/features/profilo/profile-model";
import AnnateMultiselectField from "@/features/pubblica-annuncio/components/InputFields/AnnateMultiselectField";
import CategorieCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/CategorieCalcioMultiselectField";
import FieldRequirementIndicator, {RequiredMark} from "@/features/pubblica-annuncio/components/InputFields/FieldRequirementIndicator";
import ImmagineAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioPremiumField";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import PremiTrofeiFields from "@/features/pubblica-annuncio/components/InputFields/PremiTrofeiFields";
import RuoloPrincipaleMultiselectField from "@/features/pubblica-annuncio/components/InputFields/RuoloPrincipaleMultiselectField";
import TipologiaCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";
import type {
	AnnouncementContacts,
	AnnouncementDetailsDrafts,
	AnnouncementValidationErrors,
	PremiumAnnouncementExtras,
	PublishableProfileType,
	TeamAnnouncementSubtype,
	TournamentPrize,
} from "@/features/pubblica-annuncio/publish-model";
import {
	CATEGORIE_CALCIO_GROUPS,
	ANNATE_OPTIONS,
	MODALITA_ISCRIZIONE_OPTIONS,
	RUOLI_SPECIFICI_PER_RUOLO,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

interface AnnouncementDetailsFormProps {
	profileType: PublishableProfileType;
	teamSubtype: TeamAnnouncementSubtype | null;
	drafts: AnnouncementDetailsDrafts;
	onDraftsChange: Dispatch<SetStateAction<AnnouncementDetailsDrafts>>;
	locations: ProfileLocationDraft[];
	onLocationsChange: (value: ProfileLocationDraft[]) => void;
	contacts: AnnouncementContacts;
	onContactsChange: Dispatch<SetStateAction<AnnouncementContacts>>;
	extras: PremiumAnnouncementExtras;
	onExtrasChange: Dispatch<SetStateAction<PremiumAnnouncementExtras>>;
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
	placeholder,
	error,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	placeholder: string;
	error?: string;
}) {
	return (
		<Field data-invalid={Boolean(error)}>
			<div className="flex items-center justify-between gap-3">
				<FieldLabel htmlFor={id}>{label} <FieldRequirementIndicator required={required} /></FieldLabel>
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
	step,
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
	step?: number;
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
				step={step}
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

				{profileType === "giocatore" && (
					<FieldGroup>
						<CategorieCalcioMultiselectField
							label="Categorie ricercate"
							items={CATEGORIE_CALCIO_GROUPS}
							value={drafts.giocatore.categorie_ricercate}
							onValueChange={(value) => updateDraft("giocatore", "categorie_ricercate", value)}
						/>
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
							value={drafts.squadraCercaGiocatore.ruoli_secondari}
							onValueChange={(value) => updateDraft("squadraCercaGiocatore", "ruoli_secondari", value)}
							placeholder={playerSpecificRoles.length > 0 ? "Seleziona i ruoli specifici..." : "Seleziona prima un ruolo principale"}
						/>
						<AnnateMultiselectField
							label="Annate ricercate"
							value={drafts.squadraCercaGiocatore.annate_ricercate}
							onValueChange={(value) => updateDraft("squadraCercaGiocatore", "annate_ricercate", value)}
						/>
						<TextField id="team-player-season" label="Stagione" value={drafts.squadraCercaGiocatore.stagione} onChange={(value) => updateDraft("squadraCercaGiocatore", "stagione", value)} placeholder="Es. 2026/2027" />
						<DescriptionField id="team-player-description" label="Descrizione della ricerca" value={drafts.squadraCercaGiocatore.descrizione_aggiuntiva} onChange={(value) => updateDraft("squadraCercaGiocatore", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Indica requisiti, impegno richiesto e informazioni utili..." />
					</FieldGroup>
				)}

				{profileType === "squadra" && teamSubtype === "cerca-staff" && (
					<FieldGroup>
						<div className="grid gap-4 sm:grid-cols-2">
							<TextField id="team-staff-role" label="Figura ricercata" value={drafts.squadraCercaStaff.figura_ricercata} onChange={(value) => updateDraft("squadraCercaStaff", "figura_ricercata", value)} required error={errors.professionalRole} placeholder="Es. Preparatore atletico" />
							<TextField id="team-staff-sector" label="Settore" value={drafts.squadraCercaStaff.settore} onChange={(value) => updateDraft("squadraCercaStaff", "settore", value)} placeholder="Es. Prima squadra" />
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							<TextField id="team-staff-compensation" label="Compenso mensile" type="number" min={0} step={0.01} value={drafts.squadraCercaStaff.compenso_mensile} onChange={(value) => updateDraft("squadraCercaStaff", "compenso_mensile", value)} placeholder="EUR" />
							<TextField id="team-staff-from" label="Periodo dal" type="date" value={drafts.squadraCercaStaff.periodo_dal} onChange={(value) => updateDraft("squadraCercaStaff", "periodo_dal", value)} />
							<TextField id="team-staff-to" label="Periodo al" type="date" value={drafts.squadraCercaStaff.periodo_al} onChange={(value) => updateDraft("squadraCercaStaff", "periodo_al", value)} />
						</div>
						<DescriptionField id="team-staff-requirements" label="Requisiti" value={drafts.squadraCercaStaff.requisiti} onChange={(value) => updateDraft("squadraCercaStaff", "requisiti", value)} required error={errors.requirements} placeholder="Qualifiche, esperienza e disponibilità richieste..." />
						<DescriptionField id="team-staff-description" label="Informazioni aggiuntive" value={drafts.squadraCercaStaff.descrizione_aggiuntiva} onChange={(value) => updateDraft("squadraCercaStaff", "descrizione_aggiuntiva", value)} placeholder="Dettagli sull’incarico e sull’ambiente di lavoro..." />
					</FieldGroup>
				)}

				{profileType === "squadra" && teamSubtype === "cerca-partite-amichevoli" && (
					<FieldGroup>
						<CategorieCalcioMultiselectField label="Categorie avversarie" items={CATEGORIE_CALCIO_GROUPS} value={drafts.squadraCercaPartita.categorie_avversario} onValueChange={(value) => updateDraft("squadraCercaPartita", "categorie_avversario", value)} required error={errors.matchCategories} />
						<div className="grid gap-4 sm:grid-cols-2">
							<TextField id="team-match-from" label="Periodo dal" type="date" value={drafts.squadraCercaPartita.periodo_dal} onChange={(value) => updateDraft("squadraCercaPartita", "periodo_dal", value)} />
							<TextField id="team-match-to" label="Periodo al" type="date" value={drafts.squadraCercaPartita.periodo_al} onChange={(value) => updateDraft("squadraCercaPartita", "periodo_al", value)} />
							<TextField id="team-match-time-from" label="Orario dalle" type="time" value={drafts.squadraCercaPartita.orario_dalle} onChange={(value) => updateDraft("squadraCercaPartita", "orario_dalle", value)} />
							<TextField id="team-match-time-to" label="Orario alle" type="time" value={drafts.squadraCercaPartita.orario_alle} onChange={(value) => updateDraft("squadraCercaPartita", "orario_alle", value)} error={errors.matchTimes} />
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
						<TextField id="team-sponsor-sector" label="Categoria / settore" value={drafts.squadraCercaSponsor.categoria_settore} onChange={(value) => updateDraft("squadraCercaSponsor", "categoria_settore", value)} required error={errors.sponsorSector} placeholder="Es. Ristorazione locale" />
						<DescriptionField id="team-sponsor-support" label="Supporto cercato" value={drafts.squadraCercaSponsor.supporto_cercato} onChange={(value) => updateDraft("squadraCercaSponsor", "supporto_cercato", value)} required error={errors.sponsorSupport} placeholder="Descrivi il contributo o la collaborazione cercata..." />
						<DescriptionField id="team-sponsor-offer" label="Cosa offre la società" value={drafts.squadraCercaSponsor.offerta_fornita} onChange={(value) => updateDraft("squadraCercaSponsor", "offerta_fornita", value)} required error={errors.sponsorOffer} placeholder="Visibilità, iniziative, materiali e altre contropartite..." />
						<DescriptionField id="team-sponsor-description" label="Informazioni aggiuntive" value={drafts.squadraCercaSponsor.descrizione_aggiuntiva} onChange={(value) => updateDraft("squadraCercaSponsor", "descrizione_aggiuntiva", value)} placeholder="Aggiungi eventuali dettagli utili..." />
					</FieldGroup>
				)}

				{profileType === "staff-sportivo" && (
					<FieldGroup>
						<TipologiaCalcioMultiselectField value={drafts.staffSportivo.tipologie_sport} onValueChange={(value) => updateDraft("staffSportivo", "tipologie_sport", value)} required error={errors.sports} />
						<CategorieCalcioMultiselectField label="Categorie ricercate" items={CATEGORIE_CALCIO_GROUPS} value={drafts.staffSportivo.categorie_ricercate} onValueChange={(value) => updateDraft("staffSportivo", "categorie_ricercate", value)} />
						<Field>
							<FieldLabel htmlFor="staff-travel">Disponibilità agli spostamenti <OptionalLabel /></FieldLabel>
							<Select value={drafts.staffSportivo.disponibilita_spostamento || null} onValueChange={(value) => updateDraft("staffSportivo", "disponibilita_spostamento", value ?? "")}>
								<SelectTrigger id="staff-travel" className="w-full"><SelectValue placeholder="Non specificata" /></SelectTrigger>
								<SelectContent><SelectItem value={null}>Non specificare</SelectItem><SelectItem value="Si">Sì</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
							</Select>
						</Field>
						<DescriptionField id="staff-description" label="Descrizione" value={drafts.staffSportivo.descrizione_aggiuntiva} onChange={(value) => updateDraft("staffSportivo", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Descrivi l’opportunità professionale che cerchi..." />
					</FieldGroup>
				)}

				{profileType === "arbitro" && (
					<FieldGroup>
						<TipologiaCalcioMultiselectField value={drafts.arbitro.tipologie_sport} onValueChange={(value) => updateDraft("arbitro", "tipologie_sport", value)} required error={errors.sports} />
						<CategorieCalcioMultiselectField label="Categorie di interesse" items={CATEGORIE_CALCIO_GROUPS} value={drafts.arbitro.categorie_ricercate} onValueChange={(value) => updateDraft("arbitro", "categorie_ricercate", value)} />
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
						<DescriptionField id="referee-description" label="Descrizione" value={drafts.arbitro.descrizione_aggiuntiva} onChange={(value) => updateDraft("arbitro", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Descrivi disponibilità, categorie e tipo di incarichi cercati..." />
					</FieldGroup>
				)}

				{profileType === "torneo-evento" && (
					<FieldGroup>
						<TextField id="tournament-name" label="Nome torneo / evento" value={drafts.torneoEvento.nome_evento} onChange={(value) => updateDraft("torneoEvento", "nome_evento", value)} required error={errors.tournamentName} placeholder="Torneo estivo 2026" />
						<TipologiaCalcioMultiselectField value={drafts.torneoEvento.tipologie_sport} onValueChange={(value) => updateDraft("torneoEvento", "tipologie_sport", value)} required error={errors.sports} />
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
							<TextField id="tournament-teams" label="Numero squadre" type="number" min={1} step={1} value={drafts.torneoEvento.numero_squadre} onChange={(value) => updateDraft("torneoEvento", "numero_squadre", value)} />
							<Field>
								<FieldLabel htmlFor="tournament-cost">Costo partecipazione <OptionalLabel /></FieldLabel>
								<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
									<Input id="tournament-cost" type="number" min={0} step={0.01} value={drafts.torneoEvento.costo_partecipazione} onChange={(event) => updateDraft("torneoEvento", "costo_partecipazione", event.target.value)} />
									<Select value={drafts.torneoEvento.tipo_partecipazione} onValueChange={(value) => updateDraft("torneoEvento", "tipo_partecipazione", value ?? "squadra")}>
										<SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
										<SelectContent><SelectItem value="giocatore">Per giocatore</SelectItem><SelectItem value="squadra">Per squadra</SelectItem></SelectContent>
									</Select>
								</div>
							</Field>
						</div>
						<PremiTrofeiFields premiTrofei={drafts.torneoEvento.lista_premi_trofei} setPremiTrofei={setPrizes} error={errors.tournamentPrizes ?? null} />
						<DescriptionField id="tournament-description" label="Descrizione" value={drafts.torneoEvento.descrizione_aggiuntiva} onChange={(value) => updateDraft("torneoEvento", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Programma, regolamento, date e altre informazioni utili..." />
					</FieldGroup>
				)}

				{profileType === "campi-impianti-sportivi" && (
					<FieldGroup>
						<TipologiaCalcioMultiselectField value={drafts.campoImpianto.tipologie_sport} onValueChange={(value) => updateDraft("campoImpianto", "tipologie_sport", value)} required error={errors.sports} />
						<TextField id="facility-hours" label="Disponibilità / orari" value={drafts.campoImpianto.orari} onChange={(value) => updateDraft("campoImpianto", "orari", value)} placeholder="Es. Lun–Ven 18:00–23:00" />
						<Field>
							<FieldLabel htmlFor="facility-cost">Costo di partenza <OptionalLabel /></FieldLabel>
							<InputGroup>
								<InputGroupAddon><InputGroupText>€</InputGroupText></InputGroupAddon>
								<InputGroupInput id="facility-cost" type="number" min={0} step={0.01} value={drafts.campoImpianto.costo_partenza} onChange={(event) => updateDraft("campoImpianto", "costo_partenza", event.target.value)} />
								<InputGroupAddon align="inline-end"><InputGroupText>/ 1h</InputGroupText></InputGroupAddon>
							</InputGroup>
						</Field>
						<DescriptionField id="facility-services" label="Servizi inclusi" value={drafts.campoImpianto.servizi_inclusi} onChange={(value) => updateDraft("campoImpianto", "servizi_inclusi", value)} placeholder="Spogliatoi, illuminazione, parcheggio, bar..." />
						<DescriptionField id="facility-description" label="Descrizione" value={drafts.campoImpianto.descrizione_aggiuntiva} onChange={(value) => updateDraft("campoImpianto", "descrizione_aggiuntiva", value)} required error={errors.description} placeholder="Descrivi spazi, caratteristiche e modalità di utilizzo..." />
					</FieldGroup>
				)}
			</FieldSet>

			<FieldSet>
				<FieldLegend>Contenuti Premium</FieldLegend>
				<FieldDescription className="text-brand-indigo">Questi dati vengono salvati con l’annuncio e saranno pubblicabili con un piano a pagamento.</FieldDescription>
				<FieldGroup>
					<LinkAnnuncioPremiumField
						idPrefix="premium"
						tipologia={profileType}
						value={extras.genericLink}
						onValueChange={(genericLink) => onExtrasChange((previous) => ({...previous, genericLink}))}
						error={errors.genericLink}
					/>
					{profileType === "giocatore" && (
						<LinkAnnuncioPremiumField
							idPrefix="premium-highlights"
							tipologia={profileType}
							label="Link video highlights"
							functionName="Video highlights"
							placeholder="https://esempio.it/video"
							description="Il video viene salvato ora e potrà essere pubblicato con un piano a pagamento."
							value={extras.videoHighlights}
							onValueChange={(videoHighlights) => onExtrasChange((previous) => ({...previous, videoHighlights}))}
							error={errors.videoHighlights}
							labelAddon={(
								<Tooltip>
									<TooltipTrigger render={<button type="button" className="inline-flex size-5 items-center justify-center rounded-full text-brand-indigo outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40" aria-label="Informazioni sul link video highlights" />}>
										<CircleHelpIcon className="size-4" />
									</TooltipTrigger>
									<TooltipContent>Info aggiuntive</TooltipContent>
								</Tooltip>
							)}
						/>
					)}
					<ImmagineAnnuncioPremiumField idPrefix="premium" tipologia={profileType} value={image} onValueChange={onImageChange} />
				</FieldGroup>
			</FieldSet>

			<FieldSet>
				<FieldLegend>Contatti pubblici <RequiredMark /></FieldLegend>
				<FieldDescription>Inserisci almeno email o telefono. L’email del tuo account non viene mai pubblicata automaticamente.</FieldDescription>
				<Field data-invalid={Boolean(errors.contacts)}>
					<FieldGroup className="grid gap-4 sm:grid-cols-2">
					<Field data-invalid={Boolean(errors.contacts || errors.email)}>
						<FieldLabel htmlFor="announcement-contact-email" className="flex items-center gap-2"><MailIcon className="size-4" /> Email <OptionalLabel /></FieldLabel>
						<Input id="announcement-contact-email" type="email" value={contacts.email} onChange={(event) => onContactsChange((previous) => ({...previous, email: event.target.value}))} placeholder="nome@email.it" aria-invalid={Boolean(errors.contacts || errors.email)} />
						{errors.email && <FieldError>{errors.email}</FieldError>}
					</Field>
					<Field data-invalid={Boolean(errors.contacts || errors.phone)}>
						<FieldLabel htmlFor="announcement-contact-phone" className="flex items-center gap-2"><PhoneIcon className="size-4" /> Telefono <OptionalLabel /></FieldLabel>
						<Input id="announcement-contact-phone" type="tel" value={contacts.phone} onChange={(event) => onContactsChange((previous) => ({...previous, phone: event.target.value}))} placeholder="+39 333 123 4567" aria-invalid={Boolean(errors.contacts || errors.phone)} />
						{errors.phone && <FieldError>{errors.phone}</FieldError>}
					</Field>
					</FieldGroup>
					{errors.contacts && <FieldError>{errors.contacts}</FieldError>}
				</Field>
			</FieldSet>

			<FieldSet>
				<FieldLegend>Località dell’annuncio</FieldLegend>
				<FieldDescription>Puoi modificare le località precompilate senza cambiare quelle salvate nel profilo.</FieldDescription>
				<ProfileLocationsField idPrefix="announcement-locations" value={locations} onValueChange={onLocationsChange} required error={errors.locations ?? null} />
			</FieldSet>
		</FieldGroup>
	);
}
