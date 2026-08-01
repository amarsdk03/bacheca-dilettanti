"use client";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {ArrowRight, Check, ClipboardPenIcon} from "lucide-react";
import {useMemo, useState} from "react";
import {
	campiPerTipologia,
	getChiaveCampi,
	getTipologia,
	metodiPagamento,
	tipologieAnnuncio,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import AnnuncioGiocatore, {
	RUOLO_PRINCIPALE_OPTIONS,
	TIPOLOGIA_CALCIO_OPTIONS,
	type CittaComuniPerRegione,
} from "@/features/pubblica-annuncio/components/AnnuncioGiocatore";
import AnnuncioSquadra, {
	CERCA_AMICHEVOLI_SQUADRA_DEFAULT,
	CERCA_GIOCATORE_SQUADRA_DEFAULT,
	CERCA_SPONSOR_SQUADRA_DEFAULT,
	CERCA_STAFF_SQUADRA_DEFAULT,
	FIGURE_STAFF_OPTIONS,
	SEDE_PRINCIPALE_SQUADRA_DEFAULT,
	TIPOLOGIA_SPORT_SQUADRA_OPTIONS,
	type CercaAmichevoliSquadra,
	type CercaGiocatoreSquadra,
	type CercaSponsorSquadra,
	type CercaStaffSquadra,
	type SedePrincipaleSquadra,
} from "@/features/pubblica-annuncio/components/AnnuncioSquadra";
import AnnuncioArbitro from "@/features/pubblica-annuncio/components/AnnuncioArbitro";
import AnnuncioStaff from "@/features/pubblica-annuncio/components/AnnuncioStaff";
import AnnuncioScouting from "@/features/pubblica-annuncio/components/AnnuncioScouting";
import AnnuncioSocietaEnte, {
	DISPONIBILITA_STRUTTURA_SOCIETA_ENTE_DEFAULT,
	EVENTO_SOCIETA_ENTE_DEFAULT,
	type DisponibilitaStrutturaSocietaEnte,
	type EventoSocietaEnte,
} from "@/features/pubblica-annuncio/components/AnnuncioSocietaEnte";
import RecapAnnuncio from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncio";
import {
	CONTATTI_ANNUNCIO_DEFAULT,
	getCanaliContattoCompilati,
	hasContattoPubblico,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import {type EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import {
	CATEGORIA_RICERCATA_OPTIONS,
	DISPONIBILITA_SPOSTAMENTO_OPTIONS,
	FIGURA_PROFESSIONALE_OPTIONS,
	PARTECIPAZIONE_EVENTO_OPTIONS,
} from "@/features/pubblica-annuncio/components/opzioniAnnuncio";
import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import useIsMobile from "@/lib/isMobile";
import Link from "next/link";

export default function PubblicaAnnuncio() {
	const isMobile = useIsMobile();
	const [step, setStep] = useState<number>(1);

	// Step 1
	const [tipologiaAnnuncio, setTipologiaAnnuncio] = useState<string>("");
	const [sottotipologiaAnnuncio, setSottotipologiaAnnuncio] = useState<string>("");

	// Step 2
	const [regioniInteressate, setRegioniInteressate] = useState<string[]>([]);
	const [datiCampi, setDatiCampi] = useState<Record<string, string>>({});
	const [emailCollegamentoGiocatore, setEmailCollegamentoGiocatore] = useState<string>("");
	const [nomeGiocatore, setNomeGiocatore] = useState<string>("");
	const [cognomeGiocatore, setCognomeGiocatore] = useState<string>("");
	const [giornoNascitaGiocatore, setGiornoNascitaGiocatore] = useState<string>("");
	const [meseNascitaGiocatore, setMeseNascitaGiocatore] = useState<string>("");
	const [annoNascitaGiocatore, setAnnoNascitaGiocatore] = useState<string>("");
	const [cittaComuniPerRegione, setCittaComuniPerRegione] =
		useState<CittaComuniPerRegione>({});
	const [linkFotoGiocatore, setLinkFotoGiocatore] = useState<string>("");
	const [contattiGiocatore, setContattiGiocatore] = useState<ContattiAnnuncio>({
		...CONTATTI_ANNUNCIO_DEFAULT,
	});
	const [biografiaGiocatore, setBiografiaGiocatore] = useState<string>("");
	const [tipologiaCalcioGiocatore, setTipologiaCalcioGiocatore] = useState<string>("");
	const [ruoloPrincipaleGiocatore, setRuoloPrincipaleGiocatore] = useState<string>("");
	const [nomeSocietaSquadra, setNomeSocietaSquadra] = useState<string>("");
	const [linkStemmaSquadra, setLinkStemmaSquadra] = useState<string>("");
	const [contattiSquadra, setContattiSquadra] = useState<ContattiAnnuncio>({
		...CONTATTI_ANNUNCIO_DEFAULT,
	});
	const [sedePrincipaleSquadra, setSedePrincipaleSquadra] =
		useState<SedePrincipaleSquadra>({...SEDE_PRINCIPALE_SQUADRA_DEFAULT});
	const [descrizioneSquadra, setDescrizioneSquadra] = useState<string>("");
	const [tipologiaSportSquadra, setTipologiaSportSquadra] = useState<string>("");
	const [cercaGiocatoreSquadra, setCercaGiocatoreSquadra] =
		useState<CercaGiocatoreSquadra>({...CERCA_GIOCATORE_SQUADRA_DEFAULT});
	const [cercaStaffSquadra, setCercaStaffSquadra] =
		useState<CercaStaffSquadra>({...CERCA_STAFF_SQUADRA_DEFAULT});
	const [cercaAmichevoliSquadra, setCercaAmichevoliSquadra] =
		useState<CercaAmichevoliSquadra>({...CERCA_AMICHEVOLI_SQUADRA_DEFAULT});
	const [cercaSponsorSquadra, setCercaSponsorSquadra] =
		useState<CercaSponsorSquadra>({...CERCA_SPONSOR_SQUADRA_DEFAULT});
	const [nomeArbitro, setNomeArbitro] = useState<string>("");
	const [cognomeArbitro, setCognomeArbitro] = useState<string>("");
	const [giornoNascitaArbitro, setGiornoNascitaArbitro] = useState<string>("");
	const [meseNascitaArbitro, setMeseNascitaArbitro] = useState<string>("");
	const [annoNascitaArbitro, setAnnoNascitaArbitro] = useState<string>("");
	const [regioniInteressateArbitro, setRegioniInteressateArbitro] = useState<string[]>([]);
	const [cittaComuniPerRegioneArbitro, setCittaComuniPerRegioneArbitro] =
		useState<CittaComuniPerRegione>({});
	const [tipologiaCalcioArbitro, setTipologiaCalcioArbitro] = useState<string>("");
	const [presentazioneArbitro, setPresentazioneArbitro] = useState<string>("");
	const [esperienzeArbitro, setEsperienzeArbitro] = useState<EsperienzaAnnuncio[]>([]);
	const [disponibilitaSpostamentoArbitro, setDisponibilitaSpostamentoArbitro] =
		useState<string>("");
	const [nomeStaff, setNomeStaff] = useState<string>("");
	const [cognomeStaff, setCognomeStaff] = useState<string>("");
	const [giornoNascitaStaff, setGiornoNascitaStaff] = useState<string>("");
	const [meseNascitaStaff, setMeseNascitaStaff] = useState<string>("");
	const [annoNascitaStaff, setAnnoNascitaStaff] = useState<string>("");
	const [regioniInteressateStaff, setRegioniInteressateStaff] = useState<string[]>([]);
	const [cittaComuniPerRegioneStaff, setCittaComuniPerRegioneStaff] =
		useState<CittaComuniPerRegione>({});
	const [tipologiaCalcioStaff, setTipologiaCalcioStaff] = useState<string>("");
	const [figuraProfessionaleStaff, setFiguraProfessionaleStaff] = useState<string>("");
	const [presentazioneStaff, setPresentazioneStaff] = useState<string>("");
	const [esperienzeStaff, setEsperienzeStaff] = useState<EsperienzaAnnuncio[]>([]);
	const [categoriaRicercataStaff, setCategoriaRicercataStaff] = useState<string>("");
	const [disponibilitaSpostamentoStaff, setDisponibilitaSpostamentoStaff] =
		useState<string>("");
	const [nomeScouting, setNomeScouting] = useState<string>("");
	const [linkLogoScouting, setLinkLogoScouting] = useState<string>("");
	const [contattiScouting, setContattiScouting] = useState<ContattiAnnuncio>({
		...CONTATTI_ANNUNCIO_DEFAULT,
	});
	const [presentazioneScouting, setPresentazioneScouting] = useState<string>("");
	const [tipologiaCalcioScouting, setTipologiaCalcioScouting] = useState<string>("");
	const [nomeSocietaEnte, setNomeSocietaEnte] = useState<string>("");
	const [indirizzoSocietaEnte, setIndirizzoSocietaEnte] = useState<string>("");
	const [presentazioneSocietaEnte, setPresentazioneSocietaEnte] = useState<string>("");
	const [contattiSocietaEnte, setContattiSocietaEnte] = useState<ContattiAnnuncio>({
		...CONTATTI_ANNUNCIO_DEFAULT,
	});
	const [eventoSocietaEnte, setEventoSocietaEnte] = useState<EventoSocietaEnte>({
		...EVENTO_SOCIETA_ENTE_DEFAULT,
	});
	const [disponibilitaStrutturaSocietaEnte, setDisponibilitaStrutturaSocietaEnte] =
		useState<DisponibilitaStrutturaSocietaEnte>({
			...DISPONIBILITA_STRUTTURA_SOCIETA_ENTE_DEFAULT,
		});

	// Step 3
	const [metodoPagamento, setMetodoPagamento] = useState<string>("");
	const [datiConfermati, setDatiConfermati] = useState<boolean>(false);
	const [termeniAccettati, setTermeniAccettati] = useState<boolean>(false);
	const [privacyAccettata, setPrivacyAccettata] = useState<boolean>(false);

	const regioniPerArea = REGIONI_ITALIANE.reduce(
		(acc, regione) => {
			acc[regione.area].push(regione);
			return acc;
		},
		{
			Nord: [],
			Centro: [],
			Sud: [],
		} as Record<"Nord" | "Centro" | "Sud", typeof REGIONI_ITALIANE>
	);

	const tipologiaSelezionata = useMemo(
		() => getTipologia(tipologiaAnnuncio),
		[tipologiaAnnuncio]
	);
	const richiedeSottotipologia = !!tipologiaSelezionata?.sottotipologie?.length;
	const sottotipologiaSelezionata = tipologiaSelezionata?.sottotipologie?.find(
		(s) => s.valore === sottotipologiaAnnuncio
	);

	const chiaveCampi = getChiaveCampi(
		tipologiaAnnuncio,
		richiedeSottotipologia ? sottotipologiaAnnuncio : undefined
	);
	const campiCorrenti = useMemo(
		() => campiPerTipologia[chiaveCampi] ?? [],
		[chiaveCampi]
	);
	const isAnnuncioGiocatore = tipologiaAnnuncio === "giocatore";
	const isAnnuncioSquadra = tipologiaAnnuncio === "squadra";
	const isAnnuncioArbitro = tipologiaAnnuncio === "arbitro";
	const isAnnuncioStaff = tipologiaAnnuncio === "staff";
	const isAnnuncioScouting = tipologiaAnnuncio === "scout-talent-finder";
	const isAnnuncioSocietaEnte = tipologiaAnnuncio === "societa-ente-sportivo";
	const annuncioGiocatoreValido = useMemo(
		() =>
			regioniInteressate.length > 0 &&
			hasContattoPubblico(contattiGiocatore) &&
			biografiaGiocatore.length <= 2000,
		[regioniInteressate, contattiGiocatore, biografiaGiocatore]
	);
	const annuncioSquadraValido = useMemo(() => {
		const profiloSquadraValido =
			nomeSocietaSquadra.trim() !== "" &&
			hasContattoPubblico(contattiSquadra) &&
			tipologiaSportSquadra !== "" &&
			descrizioneSquadra.length <= 5000;

		if (!profiloSquadraValido) return false;

		switch (sottotipologiaAnnuncio) {
			case "cerca-giocatore":
				return (
					cercaGiocatoreSquadra.ruoloPrincipale !== "" &&
					cercaGiocatoreSquadra.requisiti.length <= 2000
				);
			case "cerca-staff":
				return (
					cercaStaffSquadra.figuraCercata !== "" &&
					cercaStaffSquadra.requisiti.length <= 2000
				);
			case "cerca-partite-amichevoli":
				return cercaAmichevoliSquadra.categorieAvversario.length > 0;
			case "cerca-sponsor":
				return (
					cercaSponsorSquadra.categoriaSettore.trim() !== "" &&
					cercaSponsorSquadra.supportoRicercato.trim() !== "" &&
					cercaSponsorSquadra.cosaOffrite.trim() !== ""
				);
			default:
				return false;
		}
	}, [
		nomeSocietaSquadra,
		contattiSquadra,
		tipologiaSportSquadra,
		descrizioneSquadra,
		sottotipologiaAnnuncio,
		cercaGiocatoreSquadra,
		cercaStaffSquadra,
		cercaAmichevoliSquadra,
		cercaSponsorSquadra,
	]);
	const annuncioArbitroValido = useMemo(
		() =>
			nomeArbitro.trim() !== "" &&
			cognomeArbitro.trim() !== "" &&
			regioniInteressateArbitro.length > 0 &&
			presentazioneArbitro.length <= 2000,
		[nomeArbitro, cognomeArbitro, regioniInteressateArbitro, presentazioneArbitro]
	);
	const annuncioStaffValido = useMemo(
		() =>
			nomeStaff.trim() !== "" &&
			cognomeStaff.trim() !== "" &&
			regioniInteressateStaff.length > 0 &&
			figuraProfessionaleStaff !== "" &&
			presentazioneStaff.length <= 2000,
		[
			nomeStaff,
			cognomeStaff,
			regioniInteressateStaff,
			figuraProfessionaleStaff,
			presentazioneStaff,
		]
	);
	const annuncioScoutingValido = useMemo(
		() =>
			nomeScouting.trim() !== "" &&
			hasContattoPubblico(contattiScouting) &&
			presentazioneScouting.length <= 2000,
		[nomeScouting, contattiScouting, presentazioneScouting]
	);
	const annuncioSocietaEnteValido = useMemo(() => {
		const profiloEnteValido =
			nomeSocietaEnte.trim() !== "" &&
			hasContattoPubblico(contattiSocietaEnte) &&
			presentazioneSocietaEnte.length <= 5000;

		if (!profiloEnteValido) return false;

		switch (sottotipologiaAnnuncio) {
			case "openday-allenamento-libero":
			case "evento-torneo-sportivo":
				return (
					eventoSocietaEnte.descrizioneEvento.length <= 5000 &&
					eventoSocietaEnte.modalitaIscrizioneRequisiti.length <= 2000 &&
					eventoSocietaEnte.livelloIndicativo.length <= 2000
				);
			case "struttura-campo":
				return disponibilitaStrutturaSocietaEnte.serviziInclusi.length <= 2000;
			default:
				return false;
		}
	}, [
		nomeSocietaEnte,
		contattiSocietaEnte,
		presentazioneSocietaEnte,
		sottotipologiaAnnuncio,
		eventoSocietaEnte,
		disponibilitaStrutturaSocietaEnte,
	]);
	const tipologiaCalcioGiocatoreLabel =
		TIPOLOGIA_CALCIO_OPTIONS.find((opzione) => opzione.valore === tipologiaCalcioGiocatore)
			?.etichetta ?? tipologiaCalcioGiocatore;
	const ruoloPrincipaleGiocatoreLabel =
		RUOLO_PRINCIPALE_OPTIONS.find((opzione) => opzione.valore === ruoloPrincipaleGiocatore)
			?.etichetta ?? ruoloPrincipaleGiocatore;
	const contattiGiocatoreCompilati = getCanaliContattoCompilati(contattiGiocatore);
	const contattiSquadraCompilati = getCanaliContattoCompilati(contattiSquadra);
	const contattiScoutingCompilati = getCanaliContattoCompilati(contattiScouting);
	const contattiSocietaEnteCompilati = getCanaliContattoCompilati(contattiSocietaEnte);
	const contattiGiocatorePubblici = contattiGiocatoreCompilati
		.map((canale) => `${canale.etichetta}: ${contattiGiocatore[canale.valore]}`)
		.join(" · ");
	const contattiSquadraPubblici = contattiSquadraCompilati
		.map((canale) => `${canale.etichetta}: ${contattiSquadra[canale.valore]}`)
		.join(" · ");
	const contattiScoutingPubblici = contattiScoutingCompilati
		.map((canale) => `${canale.etichetta}: ${contattiScouting[canale.valore]}`)
		.join(" · ");
	const contattiSocietaEntePubblici = contattiSocietaEnteCompilati
		.map((canale) => `${canale.etichetta}: ${contattiSocietaEnte[canale.valore]}`)
		.join(" · ");
	const tipologiaSportSquadraLabel =
		TIPOLOGIA_SPORT_SQUADRA_OPTIONS.find((opzione) => opzione.valore === tipologiaSportSquadra)
			?.etichetta ?? tipologiaSportSquadra;
	const figuraStaffSquadraLabel =
		FIGURE_STAFF_OPTIONS.find((opzione) => opzione === cercaStaffSquadra.figuraCercata) ??
		cercaStaffSquadra.figuraCercata;
	const tipologiaCalcioArbitroLabel =
		TIPOLOGIA_CALCIO_OPTIONS.find((opzione) => opzione.valore === tipologiaCalcioArbitro)
			?.etichetta ?? tipologiaCalcioArbitro;
	const tipologiaCalcioStaffLabel =
		TIPOLOGIA_CALCIO_OPTIONS.find((opzione) => opzione.valore === tipologiaCalcioStaff)
			?.etichetta ?? tipologiaCalcioStaff;
	const tipologiaCalcioScoutingLabel =
		TIPOLOGIA_CALCIO_OPTIONS.find((opzione) => opzione.valore === tipologiaCalcioScouting)
			?.etichetta ?? tipologiaCalcioScouting;
	const tipologiaCalcioSocietaEnteLabel =
		TIPOLOGIA_CALCIO_OPTIONS.find((opzione) => opzione.valore === eventoSocietaEnte.tipologiaCalcio)
			?.etichetta ?? eventoSocietaEnte.tipologiaCalcio;
	const figuraProfessionaleStaffLabel =
		FIGURA_PROFESSIONALE_OPTIONS.find((opzione) => opzione === figuraProfessionaleStaff) ??
		figuraProfessionaleStaff;
	const categoriaRicercataStaffLabel =
		CATEGORIA_RICERCATA_OPTIONS.find((opzione) => opzione.valore === categoriaRicercataStaff)
			?.etichetta ?? categoriaRicercataStaff;
	const disponibilitaSpostamentoArbitroLabel =
		DISPONIBILITA_SPOSTAMENTO_OPTIONS.find(
			(opzione) => opzione.valore === disponibilitaSpostamentoArbitro
		)?.etichetta ?? disponibilitaSpostamentoArbitro;
	const disponibilitaSpostamentoStaffLabel =
		DISPONIBILITA_SPOSTAMENTO_OPTIONS.find(
			(opzione) => opzione.valore === disponibilitaSpostamentoStaff
		)?.etichetta ?? disponibilitaSpostamentoStaff;
	const partecipazioneSocietaEnteLabel =
		PARTECIPAZIONE_EVENTO_OPTIONS.find(
			(opzione) => opzione.valore === eventoSocietaEnte.partecipazione
		)?.etichetta ?? eventoSocietaEnte.partecipazione;
	const recapRegioniInteressate = isAnnuncioArbitro
		? regioniInteressateArbitro
		: isAnnuncioStaff
			? regioniInteressateStaff
			: regioniInteressate;
	const recapCittaComuniPerRegione = isAnnuncioArbitro
		? cittaComuniPerRegioneArbitro
		: isAnnuncioStaff
			? cittaComuniPerRegioneStaff
			: cittaComuniPerRegione;
	const disponibilitaTrasfertaSquadraLabel =
		cercaAmichevoliSquadra.disponibilitaTrasferta === "si"
			? "Si"
			: cercaAmichevoliSquadra.disponibilitaTrasferta === "no"
				? "No"
				: "Non specificato";
	const step1Valid =
		tipologiaAnnuncio !== "" && (!richiedeSottotipologia || sottotipologiaAnnuncio !== "");
	const step2Valid = useMemo(() => {
		if (isAnnuncioGiocatore) return annuncioGiocatoreValido;
		if (isAnnuncioSquadra) return annuncioSquadraValido;
		if (isAnnuncioArbitro) return annuncioArbitroValido;
		if (isAnnuncioStaff) return annuncioStaffValido;
		if (isAnnuncioScouting) return annuncioScoutingValido;
		if (isAnnuncioSocietaEnte) return annuncioSocietaEnteValido;

		const campiObbligatoriCompilati = campiCorrenti.every(
			(campo) => !campo.obbligatorio || (datiCampi[campo.id] ?? "").trim() !== ""
		);
		return regioniInteressate.length > 0 && campiObbligatoriCompilati;
	}, [
		isAnnuncioGiocatore,
		isAnnuncioSquadra,
		isAnnuncioArbitro,
		isAnnuncioStaff,
		isAnnuncioScouting,
		isAnnuncioSocietaEnte,
		annuncioGiocatoreValido,
		annuncioSquadraValido,
		annuncioArbitroValido,
		annuncioStaffValido,
		annuncioScoutingValido,
		annuncioSocietaEnteValido,
		regioniInteressate,
		datiCampi,
		campiCorrenti,
	]);
	const step3Valid =
		metodoPagamento !== "" && datiConfermati && termeniAccettati && privacyAccettata;

	const handleTipologiaChange = (value: string) => {
		setTipologiaAnnuncio(value);
		setSottotipologiaAnnuncio("");
		setDatiCampi({});
	};

	const handleSottotipologiaChange = (value: string) => {
		setSottotipologiaAnnuncio(value);
		setDatiCampi({});
	};

	const handleTabChange = (value: string) => {
		const targetStep = Number(value.replace("tab-", ""));
		// Permetti solo di andare a step già sbloccati o indietro
		if (targetStep === 2 && !step1Valid) return;
		if (targetStep === 3 && (!step1Valid || !step2Valid)) return;
		setStep(targetStep);
	};

	return (
		<div className="min-h-screen bg-muted/30 py-10">
			<div className="mx-auto max-w-3xl px-4">
				<section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12">
					<div className="flex flex-col items-center">
						<div className="max-w-xl flex flex-col items-center text-center">
							<div className="flex items-center gap-2 sm:text-3xl text-2xl font-semibold tracking-tight">
								<ClipboardPenIcon className="size-6 sm:size-8" />
								<h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-neutral-950">
									Pubblica un annuncio
								</h1>
							</div>
							<p className="mt-2 text-sm sm:text-lg leading-6 text-neutral-600">
								Compila i campi richiesti per pubblicare il tuo annuncio
							</p>
						</div>
					</div>
				</section>

				<Tabs value={`tab-${step}`} onValueChange={handleTabChange}>
					<TabsList variant="line" className="grid w-full grid-cols-3">
						<TabsTrigger value="tab-1">
							{isMobile ? "Profilo" : "1. Selezione profilo"}
						</TabsTrigger>

						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-2" disabled={!step1Valid} className="w-full">
									{isMobile ? "Dati" : "2. Compila i dati"}
								</TabsTrigger>
							</TooltipTrigger>
							{!step1Valid && (
								<TooltipContent>
									<p>Campi obbligatori mancanti!</p>
								</TooltipContent>
							)}
						</Tooltip>

						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger
									value="tab-3"
									disabled={!step1Valid || !step2Valid}
									className="w-full"
								>
									{isMobile ? "Conferma" : "3. Conferma e invia"}
								</TabsTrigger>
							</TooltipTrigger>
							{!step2Valid && step < 2 ? (
								<TooltipContent>
									<p>Completa gli step precedenti prima di continuare</p>
								</TooltipContent>
							) : (
								!step2Valid && (
									<TooltipContent>
										<p>Campi obbligatori mancanti!</p>
									</TooltipContent>
								)
							)}
						</Tooltip>
					</TabsList>

					{/* STEP 1 — Tipologia annuncio + sottotipologia */}

					<TabsContent value="tab-1">
						<Card className="my-4">
							<CardHeader>
								<CardContent className="grid gap-8">
									<FieldGroup className="w-full">
										<FieldSet>
											<div className="mt-4">
												<FieldLegend variant="label" className="field-legend-title mb-0">
													Seleziona il tuo profilo:
												</FieldLegend>
												<FieldDescription
													className="text-red-800 font-medium mb-2"
													hidden={tipologiaAnnuncio !== ""}
												>
													Campo obbligatorio
												</FieldDescription>
											</div>
											<RadioGroup
												className="grid w-full sm:grid-cols-2 gap-3"
												value={tipologiaAnnuncio}
												onValueChange={handleTipologiaChange}
											>
												{tipologieAnnuncio.map((tipologia) => (
													<FieldLabel
														key={tipologia.valore}
														htmlFor={tipologia.valore}
														className="group/card"
													>
														<Field
															orientation="horizontal"
															className="transition-all group-has-[data-checked]/card:bg-fuchsia-100 rounded-lg"
														>
															<FieldContent>
																<FieldTitle className="field-content-title gap-1.5">
																	{tipologia.icona && (
																		<DynamicLucideIcon
																			iconName={tipologia.icona}
																			className="size-4"
																		/>
																	)}
																	{tipologia.nome}
																</FieldTitle>
																<FieldDescription>{tipologia.descrizione}</FieldDescription>
															</FieldContent>
															<RadioGroupItem value={tipologia.valore} id={tipologia.valore} />
														</Field>
													</FieldLabel>
												))}
											</RadioGroup>
										</FieldSet>

										{/* Sotto-filtro condizionale (Squadra / Ente sportivo) */}
										{richiedeSottotipologia && tipologiaSelezionata?.sottotipologie && (
											<FieldSet>
												<div className="mt-4">
													<FieldLegend variant="label" className="field-legend-title mb-0">
														Seleziona la tipologia di annuncio:
													</FieldLegend>
													<FieldDescription
														className="text-red-800 font-medium mb-2"
														hidden={sottotipologiaAnnuncio !== ""}
													>
														Campo obbligatorio
													</FieldDescription>
												</div>
												<RadioGroup
													className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3"
													value={sottotipologiaAnnuncio}
													onValueChange={handleSottotipologiaChange}
												>
													{tipologiaSelezionata.sottotipologie.map((sotto) => (
														<FieldLabel
															key={sotto.valore}
															htmlFor={`sotto-${sotto.valore}`}
															className="group/card"
														>
															<Field
																orientation="horizontal"
																className="transition-all group-has-[data-checked]/card:bg-fuchsia-100 rounded-lg"
															>
																<FieldContent>
																	<FieldTitle className="field-content-title gap-1.5">
																		{sotto.icona && (
																			<DynamicLucideIcon
																				iconName={sotto.icona}
																				className="size-4 me-1.5 sm:me-0"
																			/>
																		)}
																		{sotto.nome}
																	</FieldTitle>
																	{sotto.descrizione && (
																		<FieldDescription>{sotto.descrizione}</FieldDescription>
																	)}
																</FieldContent>
																<RadioGroupItem
																	value={sotto.valore}
																	id={`sotto-${sotto.valore}`}
																/>
															</Field>
														</FieldLabel>
													))}
												</RadioGroup>
											</FieldSet>
										)}
									</FieldGroup>

									<div className="flex justify-end">
										<Tooltip>
											<TooltipTrigger render={<span />}>
												<Button disabled={!step1Valid} onClick={() => setStep(2)}>
													Avanti
												</Button>
											</TooltipTrigger>
											{!step1Valid && (
												<TooltipContent>
													<p>Campi obbligatori mancanti!</p>
												</TooltipContent>
											)}
										</Tooltip>
									</div>
								</CardContent>
							</CardHeader>
						</Card>
					</TabsContent>

					{/* STEP 2 — Regioni + campi dinamici */}

					<TabsContent value="tab-2">
						<Card className="my-4">
							<CardHeader>
								<CardContent className="grid gap-8">
									{isAnnuncioGiocatore ? (
										<AnnuncioGiocatore
											emailCollegamento={emailCollegamentoGiocatore}
											setEmailCollegamento={setEmailCollegamentoGiocatore}
											nome={nomeGiocatore}
											setNome={setNomeGiocatore}
											cognome={cognomeGiocatore}
											setCognome={setCognomeGiocatore}
											giornoNascita={giornoNascitaGiocatore}
											setGiornoNascita={setGiornoNascitaGiocatore}
											meseNascita={meseNascitaGiocatore}
											setMeseNascita={setMeseNascitaGiocatore}
											annoNascita={annoNascitaGiocatore}
											setAnnoNascita={setAnnoNascitaGiocatore}
											regioniInteressate={regioniInteressate}
											setRegioniInteressate={setRegioniInteressate}
											cittaComuniPerRegione={cittaComuniPerRegione}
											setCittaComuniPerRegione={setCittaComuniPerRegione}
											linkFoto={linkFotoGiocatore}
											setLinkFoto={setLinkFotoGiocatore}
											contatti={contattiGiocatore}
											setContatti={setContattiGiocatore}
											biografia={biografiaGiocatore}
											setBiografia={setBiografiaGiocatore}
											tipologiaCalcio={tipologiaCalcioGiocatore}
											setTipologiaCalcio={setTipologiaCalcioGiocatore}
											ruoloPrincipale={ruoloPrincipaleGiocatore}
											setRuoloPrincipale={setRuoloPrincipaleGiocatore}
										/>
									) : isAnnuncioSquadra ? (
										<AnnuncioSquadra
											sottotipologia={sottotipologiaAnnuncio}
											nomeSocieta={nomeSocietaSquadra}
											setNomeSocieta={setNomeSocietaSquadra}
											linkStemma={linkStemmaSquadra}
											setLinkStemma={setLinkStemmaSquadra}
											contatti={contattiSquadra}
											setContatti={setContattiSquadra}
											sedePrincipale={sedePrincipaleSquadra}
											setSedePrincipale={setSedePrincipaleSquadra}
											descrizione={descrizioneSquadra}
											setDescrizione={setDescrizioneSquadra}
											tipologiaSport={tipologiaSportSquadra}
											setTipologiaSport={setTipologiaSportSquadra}
											cercaGiocatore={cercaGiocatoreSquadra}
											setCercaGiocatore={setCercaGiocatoreSquadra}
											cercaStaff={cercaStaffSquadra}
											setCercaStaff={setCercaStaffSquadra}
											cercaAmichevoli={cercaAmichevoliSquadra}
											setCercaAmichevoli={setCercaAmichevoliSquadra}
											cercaSponsor={cercaSponsorSquadra}
											setCercaSponsor={setCercaSponsorSquadra}
										/>
									) : isAnnuncioArbitro ? (
										<AnnuncioArbitro
											nome={nomeArbitro}
											setNome={setNomeArbitro}
											cognome={cognomeArbitro}
											setCognome={setCognomeArbitro}
											giornoNascita={giornoNascitaArbitro}
											setGiornoNascita={setGiornoNascitaArbitro}
											meseNascita={meseNascitaArbitro}
											setMeseNascita={setMeseNascitaArbitro}
											annoNascita={annoNascitaArbitro}
											setAnnoNascita={setAnnoNascitaArbitro}
											regioniInteressate={regioniInteressateArbitro}
											setRegioniInteressate={setRegioniInteressateArbitro}
											cittaComuniPerRegione={cittaComuniPerRegioneArbitro}
											setCittaComuniPerRegione={setCittaComuniPerRegioneArbitro}
											tipologiaCalcio={tipologiaCalcioArbitro}
											setTipologiaCalcio={setTipologiaCalcioArbitro}
											presentazione={presentazioneArbitro}
											setPresentazione={setPresentazioneArbitro}
											esperienze={esperienzeArbitro}
											setEsperienze={setEsperienzeArbitro}
											disponibilitaSpostamento={disponibilitaSpostamentoArbitro}
											setDisponibilitaSpostamento={setDisponibilitaSpostamentoArbitro}
										/>
									) : isAnnuncioStaff ? (
										<AnnuncioStaff
											nome={nomeStaff}
											setNome={setNomeStaff}
											cognome={cognomeStaff}
											setCognome={setCognomeStaff}
											giornoNascita={giornoNascitaStaff}
											setGiornoNascita={setGiornoNascitaStaff}
											meseNascita={meseNascitaStaff}
											setMeseNascita={setMeseNascitaStaff}
											annoNascita={annoNascitaStaff}
											setAnnoNascita={setAnnoNascitaStaff}
											regioniInteressate={regioniInteressateStaff}
											setRegioniInteressate={setRegioniInteressateStaff}
											cittaComuniPerRegione={cittaComuniPerRegioneStaff}
											setCittaComuniPerRegione={setCittaComuniPerRegioneStaff}
											tipologiaCalcio={tipologiaCalcioStaff}
											setTipologiaCalcio={setTipologiaCalcioStaff}
											figuraProfessionale={figuraProfessionaleStaff}
											setFiguraProfessionale={setFiguraProfessionaleStaff}
											presentazione={presentazioneStaff}
											setPresentazione={setPresentazioneStaff}
											esperienze={esperienzeStaff}
											setEsperienze={setEsperienzeStaff}
											categoriaRicercata={categoriaRicercataStaff}
											setCategoriaRicercata={setCategoriaRicercataStaff}
											disponibilitaSpostamento={disponibilitaSpostamentoStaff}
											setDisponibilitaSpostamento={setDisponibilitaSpostamentoStaff}
										/>
									) : isAnnuncioScouting ? (
										<AnnuncioScouting
											nome={nomeScouting}
											setNome={setNomeScouting}
											linkLogo={linkLogoScouting}
											setLinkLogo={setLinkLogoScouting}
											contatti={contattiScouting}
											setContatti={setContattiScouting}
											presentazione={presentazioneScouting}
											setPresentazione={setPresentazioneScouting}
											tipologiaCalcio={tipologiaCalcioScouting}
											setTipologiaCalcio={setTipologiaCalcioScouting}
										/>
									) : isAnnuncioSocietaEnte ? (
										<AnnuncioSocietaEnte
											sottotipologia={sottotipologiaAnnuncio}
											nomeEnte={nomeSocietaEnte}
											setNomeEnte={setNomeSocietaEnte}
											indirizzo={indirizzoSocietaEnte}
											setIndirizzo={setIndirizzoSocietaEnte}
											presentazione={presentazioneSocietaEnte}
											setPresentazione={setPresentazioneSocietaEnte}
											contatti={contattiSocietaEnte}
											setContatti={setContattiSocietaEnte}
											evento={eventoSocietaEnte}
											setEvento={setEventoSocietaEnte}
											disponibilitaStruttura={disponibilitaStrutturaSocietaEnte}
											setDisponibilitaStruttura={setDisponibilitaStrutturaSocietaEnte}
										/>
									) : (
										<FieldGroup className="w-full">
											<FieldSet>
												<div className="mt-4">
													<FieldLegend variant="label" className="field-legend-title mb-0">
														Seleziona una o più regioni d&apos;interesse:
													</FieldLegend>
													<FieldDescription
														className="text-red-800 font-medium mb-2"
														hidden={regioniInteressate.length > 0}
													>
														Campo obbligatorio
													</FieldDescription>
												</div>
												{Object.entries(regioniPerArea).map(([area, regioni]) => (
													<Field key={area} className="mb-2">
														<FieldLabel htmlFor={area}>{area}:</FieldLabel>

														<ToggleGroup
															variant="outline"
															spacing={2}
															size="lg"
															className="flex-wrap grid grid-cols-3"
															value={regioniInteressate}
															onValueChange={setRegioniInteressate}
															multiple
														>
															{regioni.map((regione) => (
																<ToggleGroupItem
																	key={regione.nome}
																	value={regione.nome}
																	aria-label={regione.nome}
																	className="transition-all data-pressed:bg-fuchsia-200 group flex items-center gap-2 overflow-hidden"
																>
																	<Check
																		className="text-fuchsia-600 size-4 -translate-x-2 opacity-0 scale-75 transition-all duration-300 ease-out
																		group-data-pressed:-translate-x-1 group-data-pressed:opacity-100 group-data-pressed:scale-100"
																	/>
																	<span className="-translate-x-2.5 transition-all duration-300 ease-out group-data-pressed:-translate-x-1">
																		{regione.nome}
																	</span>
																</ToggleGroupItem>
															))}
														</ToggleGroup>
													</Field>
												))}
											</FieldSet>

											{/* Campi dinamici in base a tipologia/sottotipologia selezionata */}
											{campiCorrenti.length > 0 && (
												<FieldSet>
													<div className="mt-4">
														<FieldLegend variant="label" className="field-legend-title mb-0">
															Dettagli dell&apos;annuncio
															{tipologiaSelezionata && (
																<span className="font-normal text-muted-foreground">
																	{" "}
																	— {tipologiaSelezionata.nome}
																	{sottotipologiaSelezionata
																		? ` · ${sottotipologiaSelezionata.nome}`
																		: ""}
																</span>
															)}
														</FieldLegend>
													</div>
												</FieldSet>
											)}
										</FieldGroup>
									)}

									<div className="flex justify-between">
										<Button variant="outline" onClick={() => setStep(1)}>
											Indietro
										</Button>
										<Tooltip>
											<TooltipTrigger render={<span />}>
												<Button disabled={!step2Valid} onClick={() => setStep(3)}>
													Avanti
												</Button>
											</TooltipTrigger>
											{!step2Valid && (
												<TooltipContent>
													<p>Campi obbligatori mancanti!</p>
												</TooltipContent>
											)}
										</Tooltip>
									</div>
								</CardContent>
							</CardHeader>
						</Card>
					</TabsContent>

					{/* STEP 3 — Recap, pagamento, conferme */}

					<TabsContent value="tab-3">
						<Card className="my-4">
							<CardHeader>
								<CardContent className="grid gap-8">
									{/* Recap */}
									<RecapAnnuncio
										tipologiaSelezionata={tipologiaSelezionata}
										sottotipologiaSelezionata={sottotipologiaSelezionata}
										setStep={setStep}
										isAnnuncioGiocatore={isAnnuncioGiocatore}
										isAnnuncioSquadra={isAnnuncioSquadra}
										isAnnuncioArbitro={isAnnuncioArbitro}
										isAnnuncioStaff={isAnnuncioStaff}
										isAnnuncioScouting={isAnnuncioScouting}
										isAnnuncioSocietaEnte={isAnnuncioSocietaEnte}
										recapRegioniInteressate={recapRegioniInteressate}
										recapCittaComuniPerRegione={recapCittaComuniPerRegione}
										nomeGiocatore={nomeGiocatore}
										cognomeGiocatore={cognomeGiocatore}
										giornoNascitaGiocatore={giornoNascitaGiocatore}
										meseNascitaGiocatore={meseNascitaGiocatore}
										annoNascitaGiocatore={annoNascitaGiocatore}
										tipologiaCalcioGiocatoreLabel={tipologiaCalcioGiocatoreLabel}
										ruoloPrincipaleGiocatoreLabel={ruoloPrincipaleGiocatoreLabel}
										emailCollegamentoGiocatore={emailCollegamentoGiocatore}
										linkFotoGiocatore={linkFotoGiocatore}
										contattiGiocatorePubblici={contattiGiocatorePubblici}
										biografiaGiocatore={biografiaGiocatore}
										nomeSocietaSquadra={nomeSocietaSquadra}
										tipologiaSportSquadraLabel={tipologiaSportSquadraLabel}
										linkStemmaSquadra={linkStemmaSquadra}
										sedePrincipaleSquadra={sedePrincipaleSquadra}
										contattiSquadraPubblici={contattiSquadraPubblici}
										descrizioneSquadra={descrizioneSquadra}
										cercaGiocatoreSquadra={cercaGiocatoreSquadra}
										cercaStaffSquadra={cercaStaffSquadra}
										cercaAmichevoliSquadra={cercaAmichevoliSquadra}
										cercaSponsorSquadra={cercaSponsorSquadra}
										figuraStaffSquadraLabel={figuraStaffSquadraLabel}
										disponibilitaTrasfertaSquadraLabel={disponibilitaTrasfertaSquadraLabel}
										sottotipologiaAnnuncio={sottotipologiaAnnuncio}
										nomeArbitro={nomeArbitro}
										cognomeArbitro={cognomeArbitro}
										giornoNascitaArbitro={giornoNascitaArbitro}
										meseNascitaArbitro={meseNascitaArbitro}
										annoNascitaArbitro={annoNascitaArbitro}
										tipologiaCalcioArbitroLabel={tipologiaCalcioArbitroLabel}
										disponibilitaSpostamentoArbitroLabel={disponibilitaSpostamentoArbitroLabel}
										presentazioneArbitro={presentazioneArbitro}
										esperienzeArbitro={esperienzeArbitro}
										nomeStaff={nomeStaff}
										cognomeStaff={cognomeStaff}
										giornoNascitaStaff={giornoNascitaStaff}
										meseNascitaStaff={meseNascitaStaff}
										annoNascitaStaff={annoNascitaStaff}
										tipologiaCalcioStaffLabel={tipologiaCalcioStaffLabel}
										figuraProfessionaleStaffLabel={figuraProfessionaleStaffLabel}
										categoriaRicercataStaffLabel={categoriaRicercataStaffLabel}
										disponibilitaSpostamentoStaffLabel={disponibilitaSpostamentoStaffLabel}
										presentazioneStaff={presentazioneStaff}
										esperienzeStaff={esperienzeStaff}
										nomeScouting={nomeScouting}
										tipologiaCalcioScoutingLabel={tipologiaCalcioScoutingLabel}
										linkLogoScouting={linkLogoScouting}
										contattiScoutingPubblici={contattiScoutingPubblici}
										presentazioneScouting={presentazioneScouting}
										nomeSocietaEnte={nomeSocietaEnte}
										indirizzoSocietaEnte={indirizzoSocietaEnte}
										contattiSocietaEntePubblici={contattiSocietaEntePubblici}
										presentazioneSocietaEnte={presentazioneSocietaEnte}
										eventoSocietaEnte={eventoSocietaEnte}
										disponibilitaStrutturaSocietaEnte={disponibilitaStrutturaSocietaEnte}
										tipologiaCalcioSocietaEnteLabel={tipologiaCalcioSocietaEnteLabel}
										partecipazioneSocietaEnteLabel={partecipazioneSocietaEnteLabel}
									/>

									<FieldGroup className="w-full">
										{/* Metodo di pagamento */}
										<FieldSet>
											<div className="mt-4">
												<FieldLegend variant="label" className="field-legend-title mb-0">
													Metodo di pagamento:
												</FieldLegend>
												<FieldDescription
													className="text-red-800 font-medium mb-2"
													hidden={metodoPagamento !== ""}
												>
													Campo obbligatorio
												</FieldDescription>
											</div>
											<RadioGroup
												className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3"
												value={metodoPagamento}
												onValueChange={setMetodoPagamento}
											>
												{metodiPagamento.map((metodo) => (
													<FieldLabel
														key={metodo.valore}
														htmlFor={`pagamento-${metodo.valore}`}
														className="group/card"
													>
														<Field
															orientation="horizontal"
															className="transition-all group-has-[data-checked]/card:bg-fuchsia-100 rounded-lg"
														>
															<FieldContent>
																<FieldTitle className="field-content-title gap-1.5">
																	{metodo.icona && (
																		<DynamicLucideIcon
																			iconName={metodo.icona}
																			className="size-4"
																		/>
																	)}
																	{metodo.nome}
																</FieldTitle>
																<FieldDescription>{metodo.descrizione}</FieldDescription>
															</FieldContent>
															<RadioGroupItem
																value={metodo.valore}
																id={`pagamento-${metodo.valore}`}
															/>
														</Field>
													</FieldLabel>
												))}
											</RadioGroup>

											{metodoPagamento === "iban" && (
												<div className="mt-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-900">
													<p className="font-medium">Coordinate per il bonifico</p>
													<p className="mt-1">
														IBAN: <span className="font-mono">IT60X0542811101000000123456</span>
													</p>
													<p>Intestatario: Bacheca Dilettanti Srl</p>
													<p>
														Causale: annuncio-{tipologiaAnnuncio || "profilo"}
														{sottotipologiaAnnuncio ? `-${sottotipologiaAnnuncio}` : ""}
													</p>
													<p className="mt-2 text-fuchsia-700">
														Riceverai conferma della pubblicazione non appena il pagamento sarà
														verificato.
													</p>
												</div>
											)}
										</FieldSet>

										{/* Conferme e accettazioni */}
										<FieldSet>
											<div className="mt-4 space-y-3">
												<div className="flex items-start gap-3">
													<Checkbox
														id="conferma-dati"
														checked={datiConfermati}
														onCheckedChange={(checked) => setDatiConfermati(checked)}
														className="mt-0.5"
													/>
													<FieldLabel htmlFor="conferma-dati" className="text-sm leading-snug font-normal">
														Confermo che tutti i dati inseriti sono corretti e veritieri
													</FieldLabel>
												</div>

												<div className="flex items-start gap-3">
													<Checkbox
														id="accetta-termini"
														checked={termeniAccettati}
														onCheckedChange={(checked) => setTermeniAccettati(checked)}
														className="mt-0.5"
													/>
													<FieldLabel htmlFor="accetta-termini" className="text-sm leading-snug font-normal">
														Ho letto e accettato i Termini e Condizioni del servizio
													</FieldLabel>
												</div>

												<div className="flex items-start gap-3">
													<Checkbox
														id="accetta-privacy"
														checked={privacyAccettata}
														onCheckedChange={(checked) => setPrivacyAccettata(checked)}
														className="mt-0.5"
													/>
													<FieldLabel htmlFor="accetta-privacy" className="text-sm leading-snug font-normal">
														Ho letto l&apos;informativa sulla Privacy e acconsento al trattamento dei miei dati
													</FieldLabel>
												</div>
											</div>
										</FieldSet>
									</FieldGroup>

									<div className="flex justify-between">
										<Button variant="outline" onClick={() => setStep(2)}>
											Indietro
										</Button>
										<Tooltip>
											<TooltipTrigger render={<span />}>
												<Button disabled={!step3Valid}>Invia annuncio</Button>
											</TooltipTrigger>
											{!step3Valid && (
												<TooltipContent>
													<p>Completa il pagamento e le conferme richieste</p>
												</TooltipContent>
											)}
										</Tooltip>
									</div>
								</CardContent>
							</CardHeader>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
