"use client";

import {type SetStateAction} from "react";

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
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import AnnateMultiselectField from "@/features/pubblica-annuncio/components/InputFields/AnnateMultiselectField";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import DateRangeFields from "@/features/pubblica-annuncio/components/InputFields/DateRangeFields";
import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import RuoloPrincipaleMultiselectField from "@/features/pubblica-annuncio/components/InputFields/RuoloPrincipaleMultiselectField";
import {FIGURA_PROFESSIONALE_OPTIONS} from "@/features/pubblica-annuncio/components/InputFields/FiguraProfessionaleMultiselectField";
import {
	type AnnuncioSquadraData,
	useAnnuncioSquadraStore,
} from "@/features/pubblica-annuncio/state/AnnuncioSquadra.store";
import CategorieAvversarioField from "@/features/pubblica-annuncio/components/InputFields/CategorieAvversarioField";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";

export type {
	CercaAmichevoliSquadra,
	CercaGiocatoreSquadra,
	CercaSponsorSquadra,
	CercaStaffSquadra,
	SedePrincipaleSquadra,
} from "@/features/pubblica-annuncio/state/AnnuncioSquadra.store";

export const TIPOLOGIA_SPORT_SQUADRA_OPTIONS = [
	{valore: "Calcio a 11", etichetta: "Calcio a 11"},
	{valore: "Calcio a 7", etichetta: "Calcio a 7"},
	{valore: "Calcio a 5", etichetta: "Calcio a 5"},
];

export const RUOLI_AVANZATI_PER_RUOLO: Record<string, string[]> = {
	Portiere: [],
	Difensore: [
		"Libero",
		"Terzino sinistro",
		"Difensore centrale",
		"Terzino destro",
		"Esterno sinistro a tutta fascia",
		"Esterno destro a tutta fascia",
	],
	Centrocampista: [
		"Mediano",
		"Centrocampista sinistro",
		"Centrocampista centrale",
		"Centrocampista destro",
		"Trequartista",
	],
	Attaccante: [
		"Ala sinistra",
		"Ala destra",
		"Attaccante sinistro / Seconda punta sinistra",
		"Centravanti",
		"Attaccante destro / Seconda punta destra",
		"Seconda punta",
	],
};

export const FIGURE_STAFF_OPTIONS = FIGURA_PROFESSIONALE_OPTIONS;

const CATEGORIE_AVVERSARIO_GROUPS = [
	{
		gruppo: "Calcio professionistico",
		opzioni: ["Serie A", "Serie B", "Serie C"],
	},
	{
		gruppo: "Calcio dilettantistico",
		opzioni: [
			"Serie D",
			"Eccellenza",
			"Promozione",
			"Prima Categoria",
			"Seconda Categoria",
			"Terza Categoria",
		],
	},
	{
		gruppo: "Calcio giovanile",
		opzioni: ["Primavera 1", "Primavera 2", "Primavera 3", "Primavera 4"],
	},
	{
		gruppo: "Calcio femminile",
		opzioni: [
			"Serie A Femminile",
			"Serie B Femminile",
			"Serie C Femminile",
			"Eccellenza Femminile",
			"Promozione Femminile",
		],
	},
	{
		gruppo: "Calcio a 5",
		opzioni: ["Serie A C5", "Serie A2 Élite", "Serie A2", "Serie B C5", "Serie C C5"],
	},
	{
		gruppo: "Calcio amatoriale",
		opzioni: ["Calcio amatoriale"],
	},
];

const DISPONIBILITA_TRASFERTA_OPTIONS = [
	{valore: "Si", etichetta: "Si"},
	{valore: "No", etichetta: "No"},
];

export function getStagioniDisponibili(date = new Date()): [string, string] {
	const annoInizio = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;

	return [
		`${annoInizio}/${annoInizio + 1}`,
		`${annoInizio + 1}/${annoInizio + 2}`,
	];
}

export default function AnnuncioSquadra({sottotipologia}: {sottotipologia: string}) {
	const {
		nomeSocieta,
		contatti,
		sedePrincipale,
		descrizione,
		tipologiaSport,
		cercaGiocatore,
		cercaStaff,
		cercaAmichevoli,
		cercaSponsor,
		linkAnnuncio,
		setField,
	} = useAnnuncioSquadraStore();
	const setStoreField = <K extends keyof AnnuncioSquadraData>(field: K) =>
		(value: SetStateAction<AnnuncioSquadraData[K]>) => setField(field, value);
	const setNomeSocieta = setStoreField("nomeSocieta");
	const setContatti = setStoreField("contatti");
	const setSedePrincipale = setStoreField("sedePrincipale");
	const setDescrizione = setStoreField("descrizione");
	const setTipologiaSport = setStoreField("tipologiaSport");
	const setCercaGiocatore = setStoreField("cercaGiocatore");
	const setCercaStaff = setStoreField("cercaStaff");
	const setCercaAmichevoli = setStoreField("cercaAmichevoli");
	const setCercaSponsor = setStoreField("cercaSponsor");
	const [stagioneCorrente, stagioneSuccessiva] = getStagioniDisponibili();
	const stagionePersonalizzataRichiesta =
		cercaGiocatore.stagione === "altro" && cercaGiocatore.stagionePersonalizzata.trim().length === 0;

	const ruoliAvanzatiDisponibili = Array.from(
		new Set(cercaGiocatore.ruoliPrincipali.flatMap((ruolo) => RUOLI_AVANZATI_PER_RUOLO[ruolo] ?? []))
	);

	return (
		<FieldGroup className="w-full gap-6">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati squadra
					</FieldLegend>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="squadra-nome-societa">
							Nome società <OptionalLabel />
						</FieldLabel>
						<Input
							id="squadra-nome-societa"
							value={nomeSocieta}
							onChange={(event) => setNomeSocieta(event.target.value)}
							placeholder="A.S.D. Esempio Calcio"
						/>
					</Field>

					<Field>
						<FieldLabel>Tipologia principale</FieldLabel>
						<Select value={tipologiaSport || null} onValueChange={(value) => setTipologiaSport(value ?? "")}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Seleziona" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={null}>
									Non specificare
								</SelectItem>
								{TIPOLOGIA_SPORT_SQUADRA_OPTIONS.map((opzione) => (
									<SelectItem key={opzione.valore} value={opzione.valore}>
										{opzione.etichetta}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
				</div>
			</FieldSet>

			<ContattiAnnuncioFields contatti={contatti} setContatti={setContatti} />

			<RegioniInteresseField
				idPrefix="squadra-sede"
				titolo="Sede principale"
				required={false}
				regioniInteressate={sedePrincipale.regioniInteressate}
				setRegioniInteressate={(value) =>
					setSedePrincipale((prev) => ({...prev, regioniInteressate: typeof value === "function" ? value(prev.regioniInteressate) : value}))
				}
				cittaComuniPerRegione={sedePrincipale.cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) =>
					setSedePrincipale((prev) => ({...prev, cittaComuniPerRegione: typeof value === "function" ? value(prev.cittaComuniPerRegione) : value}))
				}
			/>

			<FieldSet>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="squadra-descrizione">Breve presentazione aggiuntiva <OptionalLabel /></FieldLabel>
						<span className="text-xs text-muted-foreground">{descrizione.length}/5000</span>
					</div>
					<Textarea
						id="squadra-descrizione"
						value={descrizione}
						onChange={(event) => setDescrizione(event.target.value.slice(0, 5000))}
						maxLength={5000}
						placeholder="Storia della squadra, categorie coperte, obiettivi, valori..."
						className="min-h-40 resize-y"
					/>
				</Field>
			</FieldSet>

			{sottotipologia === "cerca-giocatore" && (
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">
							Ricerca giocatore
						</FieldLegend>
						<FieldDescription
							className="text-red-800 font-medium"
							hidden={cercaGiocatore.ruoliPrincipali.length > 0}
						>
							Seleziona almeno un ruolo principale.
						</FieldDescription>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<RuoloPrincipaleMultiselectField
							required
							value={cercaGiocatore.ruoliPrincipali}
							onValueChange={(value) => {
								const opzioniDisponibili = new Set(
									value.flatMap((ruolo) => RUOLI_AVANZATI_PER_RUOLO[ruolo] ?? [])
								);
								setCercaGiocatore((previous) => ({
									...previous,
									ruoliPrincipali: value,
									ruoliSpecifici: previous.ruoliSpecifici.filter((ruolo) => opzioniDisponibili.has(ruolo)),
								}));
							}}
						/>

						<MultiselectField
							label="Ruolo specifico"
							options={ruoliAvanzatiDisponibili}
							value={cercaGiocatore.ruoliSpecifici}
							onValueChange={(value) => setCercaGiocatore((previous) => ({...previous, ruoliSpecifici: value}))}
							placeholder={cercaGiocatore.ruoliPrincipali.length > 0 ? "Seleziona i ruoli specifici..." : "Prima seleziona un ruolo principale"}
						/>
					</div>

					<AnnateMultiselectField
						label="Annate ricercate"
						value={cercaGiocatore.annateCercate}
						onValueChange={(value) =>
							setCercaGiocatore((prev) => ({...prev, annateCercate: value}))
						}
					/>

					<Field>
						<div className="flex items-center justify-between gap-3">
							<FieldLabel htmlFor="squadra-requisiti-giocatore">Requisiti <OptionalLabel /></FieldLabel>
							<span className="text-xs text-muted-foreground">
								{cercaGiocatore.requisiti.length}/2000
							</span>
						</div>
						<Textarea
							id="squadra-requisiti-giocatore"
							value={cercaGiocatore.requisiti}
							onChange={(event) =>
								setCercaGiocatore((prev) => ({
									...prev,
									requisiti: event.target.value.slice(0, 2000),
								}))
							}
							maxLength={2000}
							className="min-h-32 resize-y"
							placeholder="Esperienza, disponibilità, documenti, caratteristiche tecniche..."
						/>
					</Field>

					<Field>
						<FieldLabel>Stagione <OptionalLabel /></FieldLabel>
						<RadioGroup
							aria-label="Stagione"
							value={cercaGiocatore.stagione}
							onValueChange={(value) =>
								setCercaGiocatore((prev) => ({
									...prev,
									stagione: value ?? "",
									stagionePersonalizzata: value === "altro" ? prev.stagionePersonalizzata : "",
								}))
							}
							className="gap-3"
						>
							{[stagioneCorrente, stagioneSuccessiva].map((stagione) => (
								<Field key={stagione} orientation="horizontal">
									<RadioGroupItem id={`squadra-cerca-giocatore-${stagione}`} value={stagione} />
									<FieldLabel htmlFor={`squadra-cerca-giocatore-${stagione}`} className="font-normal">
										{stagione}
									</FieldLabel>
								</Field>
							))}
							<Field orientation="horizontal">
								<RadioGroupItem id="squadra-cerca-giocatore-stagione-altro" value="altro" />
								<FieldLabel htmlFor="squadra-cerca-giocatore-stagione-altro" className="font-normal">
									Altro
								</FieldLabel>
							</Field>
						</RadioGroup>
					</Field>

					{cercaGiocatore.stagione === "altro" && (
						<Field data-invalid={stagionePersonalizzataRichiesta || undefined}>
							<FieldLabel htmlFor="squadra-cerca-giocatore-stagione-personalizzata">
								Specifica la stagione
							</FieldLabel>
							<Input
								id="squadra-cerca-giocatore-stagione-personalizzata"
								value={cercaGiocatore.stagionePersonalizzata}
								onChange={(event) =>
									setCercaGiocatore((prev) => ({...prev, stagionePersonalizzata: event.target.value}))
								}
								maxLength={80}
								required
								aria-invalid={stagionePersonalizzataRichiesta}
								placeholder="Es. Stagione estiva 2027"
							/>
							{stagionePersonalizzataRichiesta && (
								<FieldDescription className="text-destructive">
									Inserisci la stagione personalizzata.
								</FieldDescription>
							)}
						</Field>
					)}
				</FieldSet>
			)}

			{sottotipologia === "cerca-staff" && (
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">
							Ricerca staff sportivo
						</FieldLegend>
					</div>

					<Field>
						<FieldLabel>Figura cercata</FieldLabel>
						<Select
							value={cercaStaff.figuraCercata || null}
							onValueChange={(value) =>
								setCercaStaff((prev) => ({...prev, figuraCercata: value ?? ""}))
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Seleziona" />
							</SelectTrigger>
							<SelectContent>
								{FIGURE_STAFF_OPTIONS.map((opzione) => (
									<SelectItem key={opzione} value={opzione}>
										{opzione}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel htmlFor="squadra-staff-settore">Settore <OptionalLabel /></FieldLabel>
							<Input
								id="squadra-staff-settore"
								value={cercaStaff.settore}
								onChange={(event) =>
									setCercaStaff((prev) => ({...prev, settore: event.target.value}))
								}
								placeholder="Prima squadra, settore giovanile..."
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="squadra-staff-compenso">Compenso mensile <OptionalLabel /></FieldLabel>
							<InputGroup>
								<InputGroupAddon>
									<InputGroupText>&euro;</InputGroupText>
								</InputGroupAddon>
								<InputGroupInput
									id="squadra-staff-compenso"
									type="number"
									min={0}
									value={cercaStaff.compensoMensile}
									onChange={(event) =>
										setCercaStaff((prev) => ({...prev, compensoMensile: event.target.value}))
									}
									placeholder="1800"
								/>
								<InputGroupAddon align="inline-end">
									<InputGroupText>EUR</InputGroupText>
								</InputGroupAddon>
							</InputGroup>
						</Field>
					</div>

					<Field>
						<div className="flex items-center justify-between gap-3">
							<FieldLabel htmlFor="squadra-staff-requisiti">Requisiti <OptionalLabel /></FieldLabel>
							<span className="text-xs text-muted-foreground">
								{cercaStaff.requisiti.length}/2000
							</span>
						</div>
						<Textarea
							id="squadra-staff-requisiti"
							value={cercaStaff.requisiti}
							onChange={(event) =>
								setCercaStaff((prev) => ({
									...prev,
									requisiti: event.target.value.slice(0, 2000),
								}))
							}
							maxLength={2000}
							className="min-h-32 resize-y"
							placeholder="Esperienza, qualifiche, disponibilità e responsabilità previste..."
						/>
					</Field>

					<DateRangeFields
						idPrefix="squadra-cerca-staff-periodo"
						from={cercaStaff.periodoDa}
						setFrom={(value) => setCercaStaff((prev) => ({...prev, periodoDa: value}))}
						to={cercaStaff.periodoA}
						setTo={(value) => setCercaStaff((prev) => ({...prev, periodoA: value}))}
					/>
				</FieldSet>
			)}

			{sottotipologia === "cerca-partite-amichevoli" && (
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">
							Ricerca amichevoli
						</FieldLegend>
					</div>

					<div className={"grid gap-4 sm:grid-cols-5"}>
						<CategorieAvversarioField
							className="sm:col-span-3"
							items={CATEGORIE_AVVERSARIO_GROUPS}
							value={cercaAmichevoli.categorieAvversario}
							action={(value) =>
								setCercaAmichevoli((prev) => ({ ...prev, categorieAvversario: value }))
							}
						/>

						<Field className="sm:col-span-2">
							<FieldLabel>Disponibilità trasferta <OptionalLabel /></FieldLabel>
							<Select
								value={cercaAmichevoli.disponibilitaTrasferta || null}
								onValueChange={(value) =>
									setCercaAmichevoli((prev) => ({
										...prev,
										disponibilitaTrasferta: value ?? "",
									}))
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Non specificato" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={null}>
										Non specificare
									</SelectItem>
									{DISPONIBILITA_TRASFERTA_OPTIONS.map((opzione) => (
										<SelectItem key={opzione.etichetta} value={opzione.valore}>
											{opzione.etichetta}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
					</div>

					<RegioniInteresseField
						idPrefix="squadra-amichevoli-campo"
						titolo="Regioni e località del campo"
						required={false}
						regioniInteressate={cercaAmichevoli.regioniInteressate}
						setRegioniInteressate={(value) =>
							setCercaAmichevoli((prev) => ({...prev, regioniInteressate: typeof value === "function" ? value(prev.regioniInteressate) : value}))
						}
						cittaComuniPerRegione={cercaAmichevoli.cittaComuniPerRegione}
						setCittaComuniPerRegione={(value) =>
							setCercaAmichevoli((prev) => ({...prev, cittaComuniPerRegione: typeof value === "function" ? value(prev.cittaComuniPerRegione) : value}))
						}
					/>

					<DateRangeFields
						idPrefix="squadra-amichevoli-periodo"
						from={cercaAmichevoli.periodoDa}
						setFrom={(value) =>
							setCercaAmichevoli((prev) => ({...prev, periodoDa: value}))
						}
						to={cercaAmichevoli.periodoA}
						setTo={(value) => setCercaAmichevoli((prev) => ({...prev, periodoA: value}))}
						indicativo
					/>
				</FieldSet>
			)}

			{sottotipologia === "cerca-sponsor" && (
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">
							Ricerca sponsor
						</FieldLegend>
					</div>

					<Field>
						<FieldLabel htmlFor="squadra-sponsor-categoria">Categoria / settore</FieldLabel>
						<Textarea
							id="squadra-sponsor-categoria"
							value={cercaSponsor.categoriaSettore}
							onChange={(event) =>
								setCercaSponsor((prev) => ({...prev, categoriaSettore: event.target.value}))
							}
							maxLength={1000}
							placeholder="Ristorazione, edilizia, servizi..."
							className="min-h-20 resize-y"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="squadra-sponsor-supporto">Supporto ricercato</FieldLabel>
						<Textarea
							id="squadra-sponsor-supporto"
							value={cercaSponsor.supportoRicercato}
							onChange={(event) =>
								setCercaSponsor((prev) => ({...prev, supportoRicercato: event.target.value}))
							}
							maxLength={1000}
							placeholder="Contributo economico, materiale tecnico, servizi..."
							className="min-h-20 resize-y"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="squadra-sponsor-offerta">Cosa offrite</FieldLabel>
						<Textarea
							id="squadra-sponsor-offerta"
							value={cercaSponsor.cosaOffrite}
							onChange={(event) =>
								setCercaSponsor((prev) => ({...prev, cosaOffrite: event.target.value}))
							}
							maxLength={1000}
							placeholder="Logo su maglia, post social, banner a bordo campo..."
							className="min-h-20 resize-y"
						/>
					</Field>
				</FieldSet>
			)}

			<LinkAnnuncioPremiumField
				idPrefix="squadra"
				tipologia="squadra"
				value={linkAnnuncio}
				onValueChange={(value) => setField("linkAnnuncio", value)}
			/>
		</FieldGroup>
	);
}
