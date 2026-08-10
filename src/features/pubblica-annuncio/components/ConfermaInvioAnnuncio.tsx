"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {toast} from "@/components/ui/toast";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import RecapAnnuncio from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncio";
import {isPianoPagamento, type PianoVisibilita} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type ConfermaInvioAnnuncioProps = {
	tipologia: string;
	sottotipologia: string;
	pianoScelto: PianoVisibilita;
	emailVerificata: string | null;
	onEditStep: (step: number) => void;
};

export default function ConfermaInvioAnnuncio({
	tipologia,
	sottotipologia,
	pianoScelto,
	emailVerificata,
	onEditStep,
}: ConfermaInvioAnnuncioProps) {
	const router = useRouter();
	const [datiConfermati, setDatiConfermati] = useState(false);
	const [terminiAccettati, setTerminiAccettati] = useState(false);
	const [privacyAccettata, setPrivacyAccettata] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const annuncioPagamento = isPianoPagamento(pianoScelto);
	const emailValida = !annuncioPagamento || emailVerificata !== null;
	const isValid = emailValida && datiConfermati && terminiAccettati && privacyAccettata;

	const submitAnnuncio = async () => {
		if (!isValid || isSubmitting) return;

		setIsSubmitting(true);
		const invioSimulato = new Promise<void>((resolve) => window.setTimeout(resolve, 3000));

		try {
			await toast.promise(invioSimulato, {
				loading: {
					title: "Invio dell'annuncio in corso",
					description: "Stiamo preparando la pubblicazione...",
					type: "loading",
					timeout: 0,
				},
				success: {
					title: "Annuncio inviato",
					description: "La pubblicazione è stata completata con successo.",
					type: "success",
					timeout: 4500,
				},
				error: {
					title: "Invio non riuscito",
					description: "Riprova tra qualche istante.",
					type: "error",
				},
			});
			router.push("/pubblica-annuncio/conferma");
		} finally {
			setIsSubmitting(false);
		}
	};

	const disabledMessage = !emailValida
		? "Verifica l'email prima di inviare l'annuncio"
		: "Completa le conferme richieste";

	return (
		<div className="grid gap-8">
			<RecapAnnuncio tipologia={tipologia} sottotipologia={sottotipologia} onEditStep={onEditStep} />

			<FieldGroup className="w-full">
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">Pubblicazione scelta</FieldLegend>
					</div>
					<div className="rounded-lg border bg-background p-4 text-sm">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="font-medium">{pianoScelto.nome}</p>
								<p className="mt-1 text-muted-foreground">{pianoScelto.descrizione}</p>
								{pianoScelto.durata && <p className="mt-1 text-muted-foreground">Durata: {pianoScelto.durata}</p>}
							</div>
							<p className="shrink-0 font-semibold text-fuchsia-700">{pianoScelto.prezzo}</p>
						</div>
						{pianoScelto.prezzoAnnuale && <p className="mt-2 text-muted-foreground">Oppure {pianoScelto.prezzoAnnuale}</p>}
					</div>

					{annuncioPagamento && (
						<div className="mt-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-900">
							<p className="font-medium">Coordinate per il bonifico</p>
							<p className="mt-1">IBAN: <span className="font-mono">IT60X0542811101000000123456</span></p>
							<p>Intestatario: Bacheca Dilettanti Srl</p>
							<p>Piano: {pianoScelto.nome} — {pianoScelto.prezzo}</p>
							<p>Email verificata: {emailVerificata}</p>
							<p>Causale: annuncio-{tipologia}{sottotipologia ? `-${sottotipologia}` : ""}</p>
							<p className="mt-2 text-fuchsia-700">Riceverai conferma della pubblicazione non appena il pagamento sarà verificato.</p>
						</div>
					)}
				</FieldSet>

				<FieldSet>
					<div className="mt-4 space-y-3">
						<div className="flex items-start gap-3">
							<Checkbox id="conferma-dati" checked={datiConfermati} onCheckedChange={(checked) => setDatiConfermati(Boolean(checked))} className="mt-0.5" />
							<FieldLabel htmlFor="conferma-dati" className="text-sm font-normal leading-snug">Confermo che tutti i dati inseriti sono corretti e veritieri</FieldLabel>
						</div>
						<div className="flex items-start gap-3">
							<Checkbox id="accetta-termini" checked={terminiAccettati} onCheckedChange={(checked) => setTerminiAccettati(Boolean(checked))} className="mt-0.5" />
							<FieldLabel htmlFor="accetta-termini" className="text-sm font-normal leading-snug">Ho letto e accettato i Termini e Condizioni del servizio</FieldLabel>
						</div>
						<div className="flex items-start gap-3">
							<Checkbox id="accetta-privacy" checked={privacyAccettata} onCheckedChange={(checked) => setPrivacyAccettata(Boolean(checked))} className="mt-0.5" />
							<FieldLabel htmlFor="accetta-privacy" className="text-sm font-normal leading-snug">Ho letto l&apos;informativa sulla Privacy e acconsento al trattamento dei miei dati</FieldLabel>
						</div>
					</div>
				</FieldSet>
			</FieldGroup>

			<div className="flex justify-between">
				<Button variant="outline" onClick={() => onEditStep(3)}>Indietro</Button>
				<Tooltip>
					<TooltipTrigger render={<span />}><Button disabled={!isValid || isSubmitting} onClick={submitAnnuncio}>{isSubmitting ? "Invio..." : "Invia annuncio"}</Button></TooltipTrigger>
					{!isValid && <TooltipContent><p>{disabledMessage}</p></TooltipContent>}
				</Tooltip>
			</div>
		</div>
	);
}
