"use client";

import {useState} from "react";
import {CircleDollarSign, Crown, Rocket, Sparkles} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {
	CATEGORIE_VISIBILITA_OPTIONS,
	type CategoriaVisibilita,
	getOpzioniVisibilita,
	getPianiPubblicazione,
	isPianoPagamento,
	PUBBLICAZIONE_GRATUITA,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {cn} from "@/lib/utils";

type SelezionaVisibilitaAnnuncioProps = {
	tipologia: string;
	categoriaSelezionata: CategoriaVisibilita;
	pianoSelezionato: string;
	funzioniPremium: readonly string[];
	onCategoriaChange: (categoria: CategoriaVisibilita) => void;
	onPianoChange: (piano: string) => void;
	onBack: () => void;
	onContinue: () => void;
};

export default function SelezionaVisibilitaAnnuncio({
	tipologia,
	categoriaSelezionata,
	pianoSelezionato,
	funzioniPremium,
	onCategoriaChange,
	onPianoChange,
	onBack,
	onContinue,
}: SelezionaVisibilitaAnnuncioProps) {
	const [validationVisible, setValidationVisible] = useState(false);

	const opzioniVisibilita = getOpzioniVisibilita(tipologia);
	const pianiPubblicazione = getPianiPubblicazione(tipologia);
	const pianoScelto = pianiPubblicazione.find((piano) => piano.valore === pianoSelezionato)
		?? PUBBLICAZIONE_GRATUITA;
	const pianoPrioritarioSelezionato = opzioniVisibilita.prioritari.some(
		(piano) => piano.valore === pianoSelezionato
	);
	const annuncioPagamento = isPianoPagamento(pianoScelto);
	const richiedePremium = funzioniPremium.length > 0;
	const premiumValido = !richiedePremium || annuncioPagamento;
	const funzioniPremiumLabel = funzioniPremium.join(" e ");
	const validationError = categoriaSelezionata === "prioritario" && !pianoPrioritarioSelezionato
		? "Scegli un pacchetto prioritario"
		: !premiumValido
			? `Scegli un piano a pagamento per includere: ${funzioniPremiumLabel}`
			: null;
	const isValid = validationError === null;
	const handleContinue = () => {
		setValidationVisible(true);
		if (isValid) onContinue();
	};
	const iconeCategoria = {
		gratis: CircleDollarSign,
		plus: Sparkles,
		pro: Rocket,
		prioritario: Crown,
	} as const;

	return (
		<div className="grid gap-8">
			<FieldGroup className="w-full">
				<FieldSet data-invalid={validationVisible && !isValid}>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">Vuoi maggiore visibilità?</FieldLegend>
					</div>
					<FieldDescription className="mb-3">Scegli una delle quattro categorie. Con Prioritario potrai selezionare il pacchetto più adatto.</FieldDescription>
					<RadioGroup
						className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4"
						value={categoriaSelezionata}
						onValueChange={(value) => onCategoriaChange(value as CategoriaVisibilita)}
						aria-invalid={validationVisible && !isValid}
					>
						{CATEGORIE_VISIBILITA_OPTIONS.map((categoria) => {
							const piano = categoria.valore === "gratis"
								? opzioniVisibilita.gratis
								: categoria.valore === "plus"
									? opzioniVisibilita.plus
									: categoria.valore === "pro"
										? opzioniVisibilita.pro
										: undefined;
							const disabled = (categoria.valore === "plus" || categoria.valore === "pro") && !piano;
							const Icon = iconeCategoria[categoria.valore];
							const prezzo = categoria.valore === "prioritario"
								? `Da ${opzioniVisibilita.prioritari[0]?.prezzo ?? "—"}`
								: piano?.prezzo ?? "Non disponibile";
							const descrizione = categoria.valore === "prioritario"
								? "Metti in evidenza l'annuncio scegliendo durata e pacchetto."
								: piano?.descrizione ?? "Questo livello non è disponibile per la tipologia scelta.";

							return (
								<FieldLabel
									key={categoria.valore}
									htmlFor={`categoria-${categoria.valore}`}
									className={cn("group/card h-full", disabled && "cursor-not-allowed")}
								>
									<Field className="h-full items-start rounded-xl border-2 p-4 transition-all group-has-[data-checked]/card:border-fuchsia-500 group-has-[data-checked]/card:bg-fuchsia-50 group-has-[data-checked]/card:shadow-sm group-has-[data-disabled]/card:opacity-45">
										<div className="flex w-full items-start justify-between gap-2">
											<div className="rounded-lg bg-fuchsia-100 p-2 text-fuchsia-700"><Icon className="size-5" /></div>
											<RadioGroupItem value={categoria.valore} id={`categoria-${categoria.valore}`} disabled={disabled} />
										</div>
										<FieldContent className="gap-1">
											<FieldTitle className="text-base">{categoria.nome}</FieldTitle>
											<p className={cn("text-sm font-semibold", disabled ? "text-muted-foreground" : "text-fuchsia-700")}>{prezzo}</p>
											{piano && piano.nome.toLowerCase() !== categoria.nome.toLowerCase() && (
												<p className="text-xs font-medium text-foreground">Piano {piano.nome}</p>
											)}
											<FieldDescription className="mt-1 leading-5">{descrizione}</FieldDescription>
										</FieldContent>
									</Field>
								</FieldLabel>
							);
						})}
					</RadioGroup>

					{categoriaSelezionata === "prioritario" && (
						<div className="mt-5 rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 p-4 sm:p-5">
							<div className="mb-3">
								<p className="font-semibold">Scegli il pacchetto prioritario</p>
								<p className="text-sm text-muted-foreground">La scelta del pacchetto è necessaria per continuare.</p>
							</div>
							<RadioGroup className="grid gap-3 sm:grid-cols-2" value={pianoPrioritarioSelezionato ? pianoSelezionato : ""} onValueChange={onPianoChange}>
								{opzioniVisibilita.prioritari.map((piano) => (
									<FieldLabel key={piano.valore} htmlFor={`piano-${piano.valore}`} className="group/package">
										<Field orientation="horizontal" className="h-full rounded-lg bg-background transition-all group-has-[data-checked]/package:border-fuchsia-500 group-has-[data-checked]/package:bg-fuchsia-100">
											<FieldContent>
												<FieldTitle className="field-content-title gap-2">
													{piano.nome}
													<span className="ml-auto shrink-0 font-semibold text-fuchsia-700">{piano.prezzo}</span>
												</FieldTitle>
												<FieldDescription>{piano.durata ? `${piano.durata} · ` : ""}{piano.descrizione}</FieldDescription>
											</FieldContent>
											<RadioGroupItem value={piano.valore} id={`piano-${piano.valore}`} />
										</Field>
									</FieldLabel>
								))}
							</RadioGroup>
						</div>
					)}

					{richiedePremium && !annuncioPagamento && (
						<div className="mt-3 flex gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
							<Crown className="mt-0.5 size-4 shrink-0 text-purple-700" />
							<p>
								{funzioniPremium.length === 1
									? `${funzioniPremiumLabel} è una funzione Premium. `
									: `${funzioniPremiumLabel} sono funzioni Premium. `}
								Scegli un piano a pagamento oppure torna ai dati per rimuovere i campi Premium.
							</p>
						</div>
					)}

					{validationVisible && validationError && <FieldError>{validationError}</FieldError>}
				</FieldSet>
			</FieldGroup>

			<div className="flex justify-between">
				<Button variant="outline" onClick={onBack}>Indietro</Button>
				<Button onClick={handleContinue}>Avanti</Button>
			</div>
		</div>
	);
}
