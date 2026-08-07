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
	isAnnuncioSocietaEnteValid,
	useAnnuncioSocietaEnteStore,
} from "@/features/pubblica-annuncio/state/AnnuncioSocietaEnte.store";
import {
	isAnnuncioSquadraValid,
	useAnnuncioSquadraStore,
} from "@/features/pubblica-annuncio/state/AnnuncioSquadra.store";
import {
	isAnnuncioStaffValid,
	useAnnuncioStaffStore,
} from "@/features/pubblica-annuncio/state/AnnuncioStaff.store";
import ConfermaInvioAnnuncio from "@/features/pubblica-annuncio/components/ConfermaInvioAnnuncio";
import DettagliAnnuncio from "@/features/pubblica-annuncio/components/DettagliAnnuncio";
import SelezionaTipologiaAnnuncio from "@/features/pubblica-annuncio/components/SelezionaTipologiaAnnuncio";
import {getTipologia} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import useIsMobile from "@/lib/isMobile";

export default function PubblicaAnnuncio() {
	const isMobile = useIsMobile();
	const [step, setStep] = useState(1);
	const [tipologia, setTipologia] = useState("");
	const [sottotipologia, setSottotipologia] = useState("");

	const giocatoreValido = useAnnuncioGiocatoreStore((state) => isAnnuncioGiocatoreValid(state));
	const squadraValida = useAnnuncioSquadraStore((state) => isAnnuncioSquadraValid(state, sottotipologia));
	const arbitroValido = useAnnuncioArbitroStore((state) => isAnnuncioArbitroValid(state));
	const staffValido = useAnnuncioStaffStore((state) => isAnnuncioStaffValid(state));
	const societaEnteValida = useAnnuncioSocietaEnteStore((state) => isAnnuncioSocietaEnteValid(state));
	const campoImpiantoValido = useAnnuncioCampoImpiantoStore((state) => isAnnuncioCampoImpiantoValid(state));

	const tipologiaSelezionata = getTipologia(tipologia);
	const richiedeSottotipologia = Boolean(tipologiaSelezionata?.sottotipologie?.length);
	const step1Valid = tipologia !== "" && (!richiedeSottotipologia || sottotipologia !== "");
	const step2Valid = {
		giocatore: giocatoreValido,
		squadra: squadraValida,
		arbitro: arbitroValido,
		staff: staffValido,
		"societa-ente-sportivo": societaEnteValida,
		"campo-impianto-sportivo": campoImpiantoValido,
	}[tipologia] ?? false;

	const scrollToTop = () => window.scrollTo({top: 0, behavior: "smooth"});
	const goToStep = (nextStep: number) => {
		setStep(nextStep);
		scrollToTop();
	};

	const handleTabChange = (value: string) => {
		const targetStep = Number(value.replace("tab-", ""));
		if (targetStep === 2 && !step1Valid) return;
		if (targetStep === 3 && (!step1Valid || !step2Valid)) return;
		goToStep(targetStep);
	};

	const handleTipologiaChange = (value: string) => {
		setTipologia(value);
		setSottotipologia("");
	};

	return (
		<div className="min-h-screen bg-muted/30 py-10">
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
					<TabsList variant="line" className="grid w-full grid-cols-3">
						<TabsTrigger value="tab-1" onClick={scrollToTop}>{isMobile ? "Profilo" : "1. Selezione profilo"}</TabsTrigger>

						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-2" disabled={!step1Valid} className="w-full" onClick={scrollToTop}>{isMobile ? "Dati" : "2. Compila i dati"}</TabsTrigger>
							</TooltipTrigger>
							{!step1Valid && <TooltipContent><p>Campi obbligatori mancanti!</p></TooltipContent>}
						</Tooltip>

						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-3" disabled={!step1Valid || !step2Valid} className="w-full" onClick={scrollToTop}>{isMobile ? "Conferma" : "3. Conferma e invia"}</TabsTrigger>
							</TooltipTrigger>
							{!step2Valid && <TooltipContent><p>{step < 2 ? "Completa gli step precedenti prima di continuare" : "Campi obbligatori mancanti!"}</p></TooltipContent>}
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
							<ConfermaInvioAnnuncio tipologia={tipologia} sottotipologia={sottotipologia} onEditStep={goToStep} />
						</CardContent></CardHeader></Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
