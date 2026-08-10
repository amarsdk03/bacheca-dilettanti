"use client";

import {useState, type FormEvent} from "react";
import {CheckCircle2, Crown, MailCheck} from "lucide-react";

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
	getPianiPubblicazione,
	isPianoPagamento,
	PUBBLICAZIONE_GRATUITA,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {createClient} from "@/lib/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SelezionaVisibilitaAnnuncioProps = {
	tipologia: string;
	pianoSelezionato: string;
	funzioniPremium: readonly string[];
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
	pianoSelezionato,
	funzioniPremium,
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

	const pianiPubblicazione = getPianiPubblicazione(tipologia);
	const pianoScelto = pianiPubblicazione.find((piano) => piano.valore === pianoSelezionato)
		?? PUBBLICAZIONE_GRATUITA;
	const annuncioPagamento = isPianoPagamento(pianoScelto);
	const richiedePremium = funzioniPremium.length > 0;
	const premiumValido = !richiedePremium || annuncioPagamento;
	const emailNormalizzata = email.trim().toLowerCase();
	const emailValida = EMAIL_PATTERN.test(emailNormalizzata);
	const emailConfermata = emailVerificata === emailNormalizzata;
	const codiceInviatoPerEmailCorrente = emailCodiceInviato === emailNormalizzata;
	const isValid = premiumValido && (!annuncioPagamento || emailConfermata);

	const handleEmailChange = (value: string) => {
		onEmailChange(value);
		setCodiceOtp("");
		setFeedback(null);
	};

	const sendOtp = async () => {
		if (!emailValida || isSendingOtp) return;

		setIsSendingOtp(true);
		setFeedback(null);

		try {
			const supabase = createClient();
			// Il template email di Supabase Auth deve usare {{ .Token }} per inviare il codice OTP.
			const {error} = await supabase.auth.signInWithOtp({
				email: emailNormalizzata,
				options: {shouldCreateUser: true},
			});

			if (error) throw error;

			setEmailCodiceInviato(emailNormalizzata);
			setCodiceOtp("");
			setFeedback({
				tipo: "successo",
				messaggio: "Codice inviato. Controlla anche la cartella spam.",
			});
		} catch (error) {
			setFeedback({
				tipo: "errore",
				messaggio: error instanceof Error ? error.message : "Non è stato possibile inviare il codice.",
			});
		} finally {
			setIsSendingOtp(false);
		}
	};

	const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const token = codiceOtp.replace(/\s/g, "");
		if (!codiceInviatoPerEmailCorrente || token.length !== 6 || isVerifyingOtp) return;

		setIsVerifyingOtp(true);
		setFeedback(null);

		try {
			const supabase = createClient();
			const {data, error} = await supabase.auth.verifyOtp({
				email: emailCodiceInviato,
				token,
				type: "email",
			});

			if (error) throw error;
			if (data.user?.email?.trim().toLowerCase() !== emailCodiceInviato) {
				throw new Error("Non è stato possibile confermare l'indirizzo email.");
			}

			onEmailVerificata(emailCodiceInviato);
			setFeedback({tipo: "successo", messaggio: "Email verificata correttamente."});
		} catch (error) {
			setFeedback({
				tipo: "errore",
				messaggio: error instanceof Error ? error.message : "Il codice non è valido o è scaduto.",
			});
		} finally {
			setIsVerifyingOtp(false);
		}
	};

	const funzioniPremiumLabel = funzioniPremium.join(" e ");
	const disabledMessage = !premiumValido
		? `Scegli un piano a pagamento per includere: ${funzioniPremiumLabel}`
		: !emailValida
			? "Inserisci un indirizzo email valido"
			: "Verifica l'email con il codice OTP";

	return (
		<div className="grid gap-8">
			<FieldGroup className="w-full">
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">Vuoi maggiore visibilità?</FieldLegend>
					</div>
					<FieldDescription className="mb-3">Scegli la pubblicazione standard, un piano profilo o un pacchetto prioritario.</FieldDescription>
					<RadioGroup className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2" value={pianoSelezionato} onValueChange={onPianoChange}>
						{pianiPubblicazione.map((piano) => (
							<FieldLabel key={piano.valore} htmlFor={`piano-${piano.valore}`} className="group/card">
								<Field orientation="horizontal" className="rounded-lg transition-all group-has-[data-checked]/card:bg-fuchsia-100">
									<FieldContent>
										<FieldTitle className="field-content-title gap-1.5">
											{piano.nome}
											<span className="ml-auto font-semibold text-fuchsia-700">{piano.prezzo}</span>
										</FieldTitle>
										<FieldDescription>{piano.durata ? `${piano.durata} · ` : ""}{piano.descrizione}</FieldDescription>
										{piano.prezzoAnnuale && <FieldDescription>Oppure {piano.prezzoAnnuale}</FieldDescription>}
									</FieldContent>
									<RadioGroupItem value={piano.valore} id={`piano-${piano.valore}`} />
								</Field>
							</FieldLabel>
						))}
					</RadioGroup>

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
