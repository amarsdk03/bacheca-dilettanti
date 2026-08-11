"use client";

import {useState} from "react";
import {ClipboardPenIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {
	isAnnuncioArbitroValid,
	useAnnuncioArbitroStore,
} from "@/features/pubblica-annuncio/state/AnnuncioArbitro.store";
import {
	isAnnuncioCampoImpiantoValid,
	useAnnuncioCampoImpiantoStore,
} from "@/features/pubblica-annuncio/state/AnnuncioCampoImpianto.store";
import {
	isAnnuncioGiocatoreValid,
	useAnnuncioGiocatoreStore,
} from "@/features/pubblica-annuncio/state/AnnuncioGiocatore.store";
import {
	isAnnuncioSquadraValid,
	useAnnuncioSquadraStore,
} from "@/features/pubblica-annuncio/state/AnnuncioSquadra.store";
import {
	isAnnuncioStaffValid,
	useAnnuncioStaffStore,
} from "@/features/pubblica-annuncio/state/AnnuncioStaff.store";
import {
	isAnnuncioAziendeEntiValid,
	isAnnuncioProfessionistiStudiValid,
	isAnnuncioTorneoEventoValid,
	useAnnuncioAziendeEntiStore,
	useAnnuncioProfessionistiStudiStore,
	useAnnuncioTorneoEventoStore,
} from "@/features/pubblica-annuncio/state/AnnuncioNuoveTipologie.store";
import ConfermaInvioAnnuncio from "@/features/pubblica-annuncio/components/ConfermaInvioAnnuncio";
import DettagliAnnuncio from "@/features/pubblica-annuncio/components/DettagliAnnuncio";
import SelezionaTipologiaAnnuncio from "@/features/pubblica-annuncio/components/SelezionaTipologiaAnnuncio";
import SelezionaVisibilitaAnnuncio from "@/features/pubblica-annuncio/components/SelezionaVisibilitaAnnuncio";
import {
	type CategoriaVisibilita,
	getOpzioniVisibilita,
	getPianiPubblicazione,
	getTipologia,
	isPianoPagamento,
	PUBBLICAZIONE_GRATUITA,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import useIsMobile from "@/lib/isMobile";

export default function PubblicaAnnuncio() {
	const isMobile = useIsMobile();
	const [step, setStep] = useState(1);
	const [tipologia, setTipologia] = useState("");
	const [sottotipologia, setSottotipologia] = useState("");
	const [categoriaVisibilita, setCategoriaVisibilita] = useState<CategoriaVisibilita>("gratis");
	const [pianoSelezionato, setPianoSelezionato] = useState(PUBBLICAZIONE_GRATUITA.valore);
	const [emailPagamento, setEmailPagamento] = useState("");
	const [emailVerificata, setEmailVerificata] = useState<string | null>(null);
	const [visibilitaConfermata, setVisibilitaConfermata] = useState(false);

	const giocatoreValido = useAnnuncioGiocatoreStore((state) => isAnnuncioGiocatoreValid(state));
	const squadraValida = useAnnuncioSquadraStore((state) => isAnnuncioSquadraValid(state, sottotipologia));
	const arbitroValido = useAnnuncioArbitroStore((state) => isAnnuncioArbitroValid(state));
	const staffValido = useAnnuncioStaffStore((state) => isAnnuncioStaffValid(state));
	const aziendeEntiValida = useAnnuncioAziendeEntiStore((state) => isAnnuncioAziendeEntiValid(state));
	const professionistiStudiValida = useAnnuncioProfessionistiStudiStore((state) => isAnnuncioProfessionistiStudiValid(state));
	const torneoEventoValido = useAnnuncioTorneoEventoStore((state) => isAnnuncioTorneoEventoValid(state));
	const campoImpiantoValido = useAnnuncioCampoImpiantoStore((state) => isAnnuncioCampoImpiantoValid(state));
	const fotoGiocatore = useAnnuncioGiocatoreStore((state) => state.foto);
	const linkGiocatore = useAnnuncioGiocatoreStore((state) => state.linkAnnuncio);
	const linkSquadra = useAnnuncioSquadraStore((state) => state.linkAnnuncio);
	const linkArbitro = useAnnuncioArbitroStore((state) => state.linkAnnuncio);
	const linkStaff = useAnnuncioStaffStore((state) => state.linkAnnuncio);
	const linkAziendeEnti = useAnnuncioAziendeEntiStore((state) => state.linkAnnuncio);
	const linkProfessionistiStudi = useAnnuncioProfessionistiStudiStore((state) => state.linkAnnuncio);
	const linkTorneoEvento = useAnnuncioTorneoEventoStore((state) => state.linkAnnuncio);
	const linkCampoImpianto = useAnnuncioCampoImpiantoStore((state) => state.linkAnnuncio);

	const tipologiaSelezionata = getTipologia(tipologia);
	const richiedeSottotipologia = Boolean(tipologiaSelezionata?.sottotipologie?.length);
	const step1Valid = tipologia !== "" && (!richiedeSottotipologia || sottotipologia !== "");
	const step2Valid = {
		giocatore: giocatoreValido,
		squadra: squadraValida,
		arbitro: arbitroValido,
		"staff-sportivo": staffValido,
		"aziende-enti": aziendeEntiValida,
		"professionisti-studi": professionistiStudiValida,
		"torneo-evento": torneoEventoValido,
		"campo-impianto-sportivo": campoImpiantoValido,
	}[tipologia] ?? false;
	const pianiPubblicazione = getPianiPubblicazione(tipologia);
	const pianoScelto = pianiPubblicazione.find((piano) => piano.valore === pianoSelezionato)
		?? PUBBLICAZIONE_GRATUITA;
	const annuncioPagamento = isPianoPagamento(pianoScelto);
	const linkAnnuncio = {
		giocatore: linkGiocatore,
		squadra: linkSquadra,
		arbitro: linkArbitro,
		"staff-sportivo": linkStaff,
		"aziende-enti": linkAziendeEnti,
		"professionisti-studi": linkProfessionistiStudi,
		"torneo-evento": linkTorneoEvento,
		"campo-impianto-sportivo": linkCampoImpianto,
	}[tipologia] ?? "";
	const funzioniPremium = [
		...(tipologia === "giocatore" && fotoGiocatore !== null ? ["Immagine dell'annuncio"] : []),
		...(linkAnnuncio.trim() !== "" ? ["Link annuncio"] : []),
	];
	const premiumValido = funzioniPremium.length === 0 || annuncioPagamento;
	const emailNormalizzata = emailPagamento.trim().toLowerCase();
	const step3Valid = pianoSelezionato !== "" && premiumValido && (!annuncioPagamento || emailVerificata === emailNormalizzata);

	const scrollToTop = () => window.scrollTo({top: 0, behavior: "smooth"});
	const goToStep = (nextStep: number) => {
		setStep(nextStep);
		scrollToTop();
	};

	const handleTabChange = (value: string) => {
		const targetStep = Number(value.replace("tab-", ""));
		if (targetStep === 2 && !step1Valid) return;
		if (targetStep === 3 && (!step1Valid || !step2Valid)) return;
		if (targetStep === 4 && (!step1Valid || !step2Valid || !step3Valid || !visibilitaConfermata)) return;
		goToStep(targetStep);
	};

	const handleTipologiaChange = (value: string) => {
		setTipologia(value);
		setSottotipologia("");
		setCategoriaVisibilita("gratis");
		setPianoSelezionato(PUBBLICAZIONE_GRATUITA.valore);
		setEmailPagamento("");
		setEmailVerificata(null);
		setVisibilitaConfermata(false);
	};

	const handleEmailChange = (value: string) => {
		setEmailPagamento(value);
		if (emailVerificata !== value.trim().toLowerCase()) setEmailVerificata(null);
		setVisibilitaConfermata(false);
	};

	const handlePianoChange = (value: string) => {
		setPianoSelezionato(value);
		setVisibilitaConfermata(false);
	};

	const handleCategoriaVisibilitaChange = (categoria: CategoriaVisibilita) => {
		const opzioni = getOpzioniVisibilita(tipologia);
		const piano = categoria === "gratis"
			? opzioni.gratis
			: categoria === "plus"
				? opzioni.plus
				: categoria === "pro"
					? opzioni.pro
					: undefined;

		setCategoriaVisibilita(categoria);
		setPianoSelezionato(piano?.valore ?? "");
		setVisibilitaConfermata(false);
	};

	const handleEmailVerificata = (value: string | null) => {
		setEmailVerificata(value);
		setVisibilitaConfermata(false);
	};

	return (
		<div className="min-h-screen bg-muted/30 py-16">
			<div className="mx-auto max-w-3xl px-4">
				<section className="mx-auto mb-8 max-w-6xl px-4 sm:mb-12 sm:px-6 lg:px-8">
					<div className="flex flex-col items-center">
						<div className="flex max-w-xl flex-col items-center text-center">
							<div className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
								<ClipboardPenIcon className="size-6 sm:size-8" />
								<h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Pubblica un annuncio</h1>
							</div>
							<p className="mt-2 text-sm leading-6 text-neutral-600 sm:text-lg">Compila i campi richiesti per pubblicare il tuo annuncio</p>
						</div>
					</div>
				</section>

				<Tabs value={`tab-${step}`} onValueChange={handleTabChange}>
					<TabsList variant="line" className="grid w-full grid-cols-4">
						<TabsTrigger value="tab-1" onClick={scrollToTop}>{isMobile ? "Profilo" : "1. Selezione profilo"}</TabsTrigger>

						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-2" disabled={!step1Valid} className="w-full" onClick={scrollToTop}>{isMobile ? "Dati" : "2. Compila i dati"}</TabsTrigger>
							</TooltipTrigger>
							{!step1Valid && <TooltipContent><p>Campi obbligatori mancanti!</p></TooltipContent>}
						</Tooltip>

						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-3" disabled={!step1Valid || !step2Valid} className="w-full" onClick={scrollToTop}>{isMobile ? "Visibilità" : "3. Visibilità"}</TabsTrigger>
							</TooltipTrigger>
							{!step2Valid && <TooltipContent><p>{step < 2 ? "Completa gli step precedenti prima di continuare" : "Campi obbligatori mancanti!"}</p></TooltipContent>}
						</Tooltip>

						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-4" disabled={!step1Valid || !step2Valid || !step3Valid || !visibilitaConfermata} className="w-full" onClick={scrollToTop}>{isMobile ? "Conferma" : "4. Conferma e invia"}</TabsTrigger>
							</TooltipTrigger>
							{(!step3Valid || !visibilitaConfermata) && (
								<TooltipContent>
									<p>{step < 3 ? "Completa gli step precedenti prima di continuare" : "Conferma il piano e, se richiesto, verifica l'email"}</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TabsList>

					<TabsContent value="tab-1">
						<Card className="my-4"><CardHeader><CardContent>
							<SelezionaTipologiaAnnuncio
								tipologia={tipologia}
								sottotipologia={sottotipologia}
								onTipologiaChange={handleTipologiaChange}
								onSottotipologiaChange={setSottotipologia}
								onContinue={() => goToStep(2)}
							/>
						</CardContent></CardHeader></Card>
					</TabsContent>

					<TabsContent value="tab-2">
						<Card className="my-4"><CardHeader><CardContent className="grid gap-8">
							<DettagliAnnuncio tipologia={tipologia} sottotipologia={sottotipologia} />
							<div className="flex justify-between">
								<Button variant="outline" onClick={() => goToStep(1)}>Indietro</Button>
								<Tooltip>
									<TooltipTrigger render={<span />}><Button disabled={!step2Valid} onClick={() => goToStep(3)}>Avanti</Button></TooltipTrigger>
									{!step2Valid && <TooltipContent><p>Campi obbligatori mancanti!</p></TooltipContent>}
								</Tooltip>
							</div>
						</CardContent></CardHeader></Card>
					</TabsContent>

					<TabsContent value="tab-3">
						<Card className="my-4"><CardHeader><CardContent>
							<SelezionaVisibilitaAnnuncio
								tipologia={tipologia}
								categoriaSelezionata={categoriaVisibilita}
								pianoSelezionato={pianoSelezionato}
								funzioniPremium={funzioniPremium}
								onCategoriaChange={handleCategoriaVisibilitaChange}
								onPianoChange={handlePianoChange}
								email={emailPagamento}
								onEmailChange={handleEmailChange}
								emailVerificata={emailVerificata}
								onEmailVerificata={handleEmailVerificata}
								onBack={() => goToStep(2)}
								onContinue={() => {
									setVisibilitaConfermata(true);
									goToStep(4);
								}}
							/>
						</CardContent></CardHeader></Card>
					</TabsContent>

					<TabsContent value="tab-4">
						<Card className="my-4"><CardHeader><CardContent>
							<ConfermaInvioAnnuncio
								tipologia={tipologia}
								sottotipologia={sottotipologia}
								pianoScelto={pianoScelto}
								emailVerificata={emailVerificata}
								onEditStep={goToStep}
							/>
						</CardContent></CardHeader></Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
