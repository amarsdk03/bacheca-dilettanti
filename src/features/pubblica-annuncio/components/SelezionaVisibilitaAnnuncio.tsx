"use client";

import {useState, type FormEvent} from "react";
import {CheckCircle2, CircleDollarSign, Crown, MailCheck, Rocket, Sparkles} from "lucide-react";

import {Button} from "@/components/ui/button";
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
import {Input} from "@/components/ui/input";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {
	CATEGORIE_VISIBILITA_OPTIONS,
	type CategoriaVisibilita,
	getOpzioniVisibilita,
	getPianiPubblicazione,
	isPianoPagamento,
	PUBBLICAZIONE_GRATUITA,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {createClient} from "@/lib/client";
import {cn} from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SelezionaVisibilitaAnnuncioProps = {
	tipologia: string;
	categoriaSelezionata: CategoriaVisibilita;
	pianoSelezionato: string;
	funzioniPremium: readonly string[];
	onCategoriaChange: (categoria: CategoriaVisibilita) => void;
	onPianoChange: (piano: string) => void;
	email: string;
	onEmailChange: (email: string) => void;
	emailVerificata: string | null;
	onEmailVerificata: (email: string | null) => void;
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
	email,
	onEmailChange,
	emailVerificata,
	onEmailVerificata,
	onBack,
	onContinue,
}: SelezionaVisibilitaAnnuncioProps) {
	const [emailCodiceInviato, setEmailCodiceInviato] = useState("");
	const [codiceOtp, setCodiceOtp] = useState("");
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
	const [feedback, setFeedback] = useState<{tipo: "errore" | "successo"; messaggio: string} | null>(null);

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
	const emailNormalizzata = email.trim().toLowerCase();
	const emailValida = EMAIL_PATTERN.test(emailNormalizzata);
	const emailConfermata = emailVerificata === emailNormalizzata;
	const codiceInviatoPerEmailCorrente = emailCodiceInviato === emailNormalizzata;
	const isValid = categoriaSelezionata !== "prioritario" || pianoPrioritarioSelezionato;

	const handleEmailChange = (value: string) => {
		onEmailChange(value);
		setCodiceOtp("");
		setFeedback(null);
	};

	const sendOtp = async () => {
		if (!emailValida || isSendingOtp) return;

		setIsSendingOtp(true);
		setFeedback(null);

		// TODO: implementare invio codice OTP
		setEmailCodiceInviato(emailNormalizzata);
		setCodiceOtp("123456");
		setFeedback({
			tipo: "successo",
			messaggio: "Codice inviato. Controlla anche la cartella spam.",
		});
		setIsSendingOtp(false);
	};

	const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const token = codiceOtp.replace(/\s/g, "");

		// TODO: implementare invio codice OTP
		setFeedback({tipo: "successo", messaggio: "Email verificata correttamente."});
	};

	const funzioniPremiumLabel = funzioniPremium.join(" e ");
	const disabledMessage = categoriaSelezionata === "prioritario" && !pianoPrioritarioSelezionato
		? "Scegli un pacchetto prioritario"
		: !premiumValido
			? `Scegli un piano a pagamento per includere: ${funzioniPremiumLabel}`
			: !emailValida
				? "Inserisci un indirizzo email valido"
				: "Verifica l'email con il codice OTP";
	const iconeCategoria = {
		gratis: CircleDollarSign,
		plus: Sparkles,
		pro: Rocket,
		prioritario: Crown,
	} as const;

	return (
		<div className="grid gap-8">
			<FieldGroup className="w-full">
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">Vuoi maggiore visibilità?</FieldLegend>
					</div>
					<FieldDescription className="mb-3">Scegli una delle quattro categorie. Con Prioritario potrai selezionare il pacchetto più adatto.</FieldDescription>
					<RadioGroup
						className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4"
						value={categoriaSelezionata}
						onValueChange={(value) => onCategoriaChange(value as CategoriaVisibilita)}
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
				</FieldSet>

				{annuncioPagamento && (
					<FieldSet>
						<div className="mt-4">
							<FieldLegend variant="label" className="field-legend-title mb-0">Verifica email</FieldLegend>
							<FieldDescription>L&apos;email è obbligatoria per una pubblicazione a pagamento e non verrà mostrata nell&apos;annuncio.</FieldDescription>
						</div>

						<Field>
							<FieldLabel htmlFor="email-verifica-annuncio">Email</FieldLabel>
							<div className="flex flex-col gap-2 sm:flex-row">
								<Input
									id="email-verifica-annuncio"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => handleEmailChange(event.target.value)}
									placeholder="nome@email.it"
									aria-invalid={email !== "" && !emailValida}
									required
									disabled={emailConfermata}
								/>
								<Button type="button" variant="outline" onClick={sendOtp} disabled={!emailValida || isSendingOtp || emailConfermata}>
									<MailCheck />
									{isSendingOtp ? "Invio..." : codiceInviatoPerEmailCorrente ? "Invia di nuovo" : "Invia codice"}
								</Button>
							</div>
						</Field>

						{codiceInviatoPerEmailCorrente && !emailConfermata && (
							<form className="grid gap-3" onSubmit={verifyOtp}>
								<Field>
									<FieldLabel htmlFor="codice-otp-annuncio">Codice OTP</FieldLabel>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
										<InputOTP
											id="codice-otp-annuncio"
											maxLength={6}
											value={codiceOtp}
											onChange={(value) => setCodiceOtp(value.replace(/\D/g, ""))}
											inputMode="numeric"
											autoComplete="one-time-code"
											required
										>
											<InputOTPGroup>
												{Array.from({length: 6}, (_, index) => (
													<InputOTPSlot key={index} index={index} className="size-10" />
												))}
											</InputOTPGroup>
										</InputOTP>
										<Button type="submit" disabled={codiceOtp.length !== 6 || isVerifyingOtp}>
											{isVerifyingOtp ? "Verifica..." : "Verifica codice"}
										</Button>
									</div>
								</Field>
							</form>
						)}

						{emailConfermata && (
							<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
								<CheckCircle2 className="size-4" />
								Email verificata: {emailNormalizzata}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="ml-auto text-emerald-800 hover:bg-emerald-100"
									onClick={() => {
										onEmailVerificata(null);
										setEmailCodiceInviato("");
										setCodiceOtp("");
										setFeedback(null);
									}}
								>
									Modifica
								</Button>
							</div>
						)}

						{feedback && (
							<p
								role={feedback.tipo === "errore" ? "alert" : "status"}
								className={feedback.tipo === "errore" ? "text-sm font-medium text-red-800" : "text-sm text-emerald-700"}
							>
								{feedback.messaggio}
							</p>
						)}
					</FieldSet>
				)}
			</FieldGroup>

			<div className="flex justify-between">
				<Button variant="outline" onClick={onBack}>Indietro</Button>
				<Tooltip>
					<TooltipTrigger render={<span />}>
						<Button disabled={!isValid} onClick={onContinue}>Avanti</Button>
					</TooltipTrigger>
					{!isValid && <TooltipContent><p>{disabledMessage}</p></TooltipContent>}
				</Tooltip>
			</div>
		</div>
	);
}
