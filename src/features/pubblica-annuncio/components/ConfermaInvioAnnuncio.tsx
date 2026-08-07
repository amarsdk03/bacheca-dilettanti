"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Crown} from "lucide-react";

import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
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
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {toast} from "@/components/ui/toast";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {useAnnuncioGiocatoreStore} from "@/features/pubblica-annuncio/state/AnnuncioGiocatore.store";
import RecapAnnuncio from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncio";

const METODI_PUBBLICAZIONE = [
	{
		valore: "gratuito",
		nome: "Gratuito",
		descrizione: "Pubblica il tuo annuncio senza alcun costo.",
		icona: "Gift",
	},
	{
		valore: "iban",
		nome: "Premium con bonifico",
		descrizione: "Aggiungi i contenuti premium e ricevi le coordinate per il bonifico.",
		icona: "Landmark",
	},
] as const;

type ConfermaInvioAnnuncioProps = {
	tipologia: string;
	sottotipologia: string;
	onEditStep: (step: number) => void;
};

export default function ConfermaInvioAnnuncio({
	tipologia,
	sottotipologia,
	onEditStep,
}: ConfermaInvioAnnuncioProps) {
	const router = useRouter();
	const fotoGiocatore = useAnnuncioGiocatoreStore((state) => state.foto);
	const [metodoPagamento, setMetodoPagamento] = useState("gratuito");
	const [datiConfermati, setDatiConfermati] = useState(false);
	const [terminiAccettati, setTerminiAccettati] = useState(false);
	const [privacyAccettata, setPrivacyAccettata] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const richiedePremium = tipologia === "giocatore" && fotoGiocatore !== null;
	const premiumValido = !richiedePremium || metodoPagamento !== "gratuito";
	const isValid = premiumValido && datiConfermati && terminiAccettati && privacyAccettata;

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

	const disabledMessage = !premiumValido
		? "Scegli la pubblicazione Premium per includere l'immagine"
		: "Completa le conferme richieste";

	return (
		<div className="grid gap-8">
			<RecapAnnuncio tipologia={tipologia} sottotipologia={sottotipologia} onEditStep={onEditStep} />

			<FieldGroup className="w-full">
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">Vuoi maggiore visibilità?</FieldLegend>
					</div>
					<RadioGroup className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2" value={metodoPagamento} onValueChange={setMetodoPagamento}>
						{METODI_PUBBLICAZIONE.map((metodo) => (
							<FieldLabel key={metodo.valore} htmlFor={`pagamento-${metodo.valore}`} className="group/card">
								<Field orientation="horizontal" className="rounded-lg transition-all group-has-[data-checked]/card:bg-fuchsia-100">
									<FieldContent>
										<FieldTitle className="field-content-title gap-1.5">
											<DynamicLucideIcon iconName={metodo.icona} className="size-4" />
											{metodo.nome}
										</FieldTitle>
										<FieldDescription>{metodo.descrizione}</FieldDescription>
									</FieldContent>
									<RadioGroupItem value={metodo.valore} id={`pagamento-${metodo.valore}`} />
								</Field>
							</FieldLabel>
						))}
					</RadioGroup>

					{richiedePremium && metodoPagamento === "gratuito" && (
						<div className="mt-3 flex gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
							<Crown className="mt-0.5 size-4 shrink-0 text-purple-700" />
							<p>L&apos;immagine selezionata è una funzione Premium. Scegli il bonifico oppure rimuovila tornando ai dati.</p>
						</div>
					)}

					{metodoPagamento === "iban" && (
						<div className="mt-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-900">
							<p className="font-medium">Coordinate per il bonifico</p>
							<p className="mt-1">IBAN: <span className="font-mono">IT60X0542811101000000123456</span></p>
							<p>Intestatario: Bacheca Dilettanti Srl</p>
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
				<Button variant="outline" onClick={() => onEditStep(2)}>Indietro</Button>
				<Tooltip>
					<TooltipTrigger render={<span />}><Button disabled={!isValid || isSubmitting} onClick={submitAnnuncio}>{isSubmitting ? "Invio..." : "Invia annuncio"}</Button></TooltipTrigger>
					{!isValid && <TooltipContent><p>{disabledMessage}</p></TooltipContent>}
				</Tooltip>
			</div>
		</div>
	);
}
