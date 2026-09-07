"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {CheckCircle2Icon, Clock3Icon, ShieldCheckIcon} from "lucide-react";
import {REGEXP_ONLY_DIGITS} from "input-otp";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Checkbox} from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {toast} from "@/components/ui/toast";
import type {ProfileDrafts, ProfileLocationDraft} from "@/features/profilo/profile-model";
import type {PublishAnnouncementPayload} from "@/features/pubblica-annuncio/publish-model";
import {
	publishAnnouncement,
	requestPublishEmailOtp,
	verifyPublishEmailOtp,
} from "@/features/pubblica-annuncio/server/actions";
import {EMAIL_PATTERN, getTipologia} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

interface ConfermaInvioAnnuncioProps {
	payload: PublishAnnouncementPayload;
	profileDrafts: ProfileDrafts;
	profileLocations: ProfileLocationDraft[];
	authenticated: boolean;
	onEditStep: (step: number) => void;
}

type OtpStatus = "idle" | "sending" | "sent" | "verifying" | "verified";

interface OtpRetryState {
	email: string;
	limit: "cooldown" | "daily" | "provider";
	retryAt: string;
}

function profileTitle(payload: PublishAnnouncementPayload, drafts: ProfileDrafts) {
	if (payload.profileType === "giocatore") return [drafts.giocatore.nome, drafts.giocatore.cognome].filter(Boolean).join(" ") || "Giocatore";
	if (payload.profileType === "squadra") return drafts.squadra.nome_societa || "Squadra";
	if (payload.profileType === "staff-sportivo") return [drafts["staff-sportivo"].nome, drafts["staff-sportivo"].cognome].filter(Boolean).join(" ") || "Staff sportivo";
	if (payload.profileType === "arbitro") return [drafts.arbitro.nome, drafts.arbitro.cognome].filter(Boolean).join(" ") || "Arbitro";
	if (payload.profileType === "torneo-evento") return drafts["torneo-evento"].nome_organizzazione || "Organizzazione";
	return drafts["campi-impianti-sportivi"].nome_organizzazione || "Campo o impianto";
}

function locationSummary(locations: ProfileLocationDraft[]) {
	return locations.map(({regione, citta}) => [citta, regione].filter(Boolean).join(", ")).join(" · ");
}

function formattedDate(value: string) {
	return new Intl.DateTimeFormat("it-IT", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Europe/Rome",
	}).format(new Date(value));
}

export default function ConfermaInvioAnnuncio({
	payload,
	profileDrafts,
	profileLocations,
	authenticated,
	onEditStep,
}: ConfermaInvioAnnuncioProps) {
	const router = useRouter();
	const [dataConfirmed, setDataConfirmed] = useState(false);
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [privacyAccepted, setPrivacyAccepted] = useState(false);
	const [validationVisible, setValidationVisible] = useState(false);
	const [verificationEmail, setVerificationEmail] = useState(payload.announcement.contacts.email);
	const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
	const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
	const [otpCode, setOtpCode] = useState("");
	const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle");
	const [emailError, setEmailError] = useState<string | null>(null);
	const [otpError, setOtpError] = useState<string | null>(null);
	const [otpFeedback, setOtpFeedback] = useState<string | null>(null);
	const [otpServiceError, setOtpServiceError] = useState<string | null>(null);
	const [otpRetry, setOtpRetry] = useState<OtpRetryState | null>(null);
	const [otpNow, setOtpNow] = useState(() => Date.now());
	const [registeredEmail, setRegisteredEmail] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [rateLimitRetryAt, setRateLimitRetryAt] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const normalizedEmail = verificationEmail.trim().toLowerCase();
	const emailValid = EMAIL_PATTERN.test(normalizedEmail);
	const challengeMatchesEmail = requestedEmail === normalizedEmail;
	const emailVerified = authenticated || verifiedEmail === normalizedEmail;
	const otpBusy = otpStatus === "sending" || otpStatus === "verifying";
	const otpRetryAt = otpRetry ? Date.parse(otpRetry.retryAt) : Number.NaN;
	const otpRetryActive = otpRetry?.email === normalizedEmail
		&& Number.isFinite(otpRetryAt)
		&& otpRetryAt > otpNow;
	const otpRetrySeconds = otpRetryActive
		? Math.max(1, Math.ceil((otpRetryAt - otpNow) / 1000))
		: 0;
	const otpRequestLabel = otpStatus === "sending"
		? "Invio..."
		: otpRetryActive && otpRetry?.limit === "daily"
			? "Limite giornaliero raggiunto"
			: otpRetryActive
				? `Invia di nuovo tra ${otpRetrySeconds}s`
				: challengeMatchesEmail
					? "Invia di nuovo"
					: "Invia codice";
	const selectedType = getTipologia(payload.profileType);
	const selectedSubtype = selectedType?.sottotipologie?.find(({valore}) => valore === payload.teamSubtype);
	const consentErrors = {
		data: validationVisible && !dataConfirmed ? "Conferma che i dati inseriti sono corretti e veritieri." : null,
		terms: validationVisible && !termsAccepted ? "Accetta i Termini e condizioni del servizio." : null,
		privacy: validationVisible && !privacyAccepted ? "Accetta l’informativa privacy e il trattamento dei dati." : null,
	};
	const validationEmailError = !authenticated && validationVisible
		? !normalizedEmail
			? "Inserisci l’indirizzo email da verificare."
			: !emailValid
				? "Inserisci un indirizzo email valido."
				: !challengeMatchesEmail
					? "Richiedi il codice per questo indirizzo email."
					: null
		: null;
	const validationOtpError = !authenticated && validationVisible && challengeMatchesEmail && !emailVerified
		? "Inserisci e verifica il codice ricevuto via email."
		: null;
	const displayedEmailError = emailError ?? validationEmailError;
	const displayedOtpError = otpError ?? validationOtpError;

	useEffect(() => {
		if (!otpRetry) return;
		const retryAt = Date.parse(otpRetry.retryAt);
		if (!Number.isFinite(retryAt)) return;

		if (otpRetry.limit === "daily") {
			const timeoutId = window.setTimeout(
				() => setOtpNow(Date.now()),
				Math.max(0, retryAt - Date.now()),
			);
			return () => window.clearTimeout(timeoutId);
		}

		const intervalId = window.setInterval(() => {
			const currentTime = Date.now();
			setOtpNow(currentTime);
			if (currentTime >= retryAt) window.clearInterval(intervalId);
		}, 250);

		return () => window.clearInterval(intervalId);
	}, [otpRetry]);

	const resetVerification = (value: string) => {
		setVerificationEmail(value);
		setRequestedEmail(null);
		setVerifiedEmail(null);
		setOtpCode("");
		setOtpStatus("idle");
		setEmailError(null);
		setOtpError(null);
		setOtpFeedback(null);
		setOtpServiceError(null);
		setRegisteredEmail(false);
	};

	const requestOtp = async () => {
		if (otpBusy || otpRetryActive || registeredEmail) return;
		if (!emailValid) {
			setEmailError(normalizedEmail ? "Inserisci un indirizzo email valido." : "Inserisci l’indirizzo email da verificare.");
			return;
		}

		const hadCurrentChallenge = challengeMatchesEmail;
		setOtpStatus("sending");
		setEmailError(null);
		setOtpError(null);
		setOtpFeedback(null);
		setOtpServiceError(null);

		try {
			const result = await requestPublishEmailOtp({submissionId: payload.submissionId, email: normalizedEmail});
			if (result.status === "sent") {
				setOtpNow(Date.now());
				setOtpRetry({email: normalizedEmail, limit: "cooldown", retryAt: result.retryAt});
				setRequestedEmail(normalizedEmail);
				setVerifiedEmail(null);
				setOtpCode("");
				setOtpStatus("sent");
				setOtpFeedback(result.message);
				return;
			}
			if (result.status === "already_registered") {
				setOtpRetry(null);
				setRegisteredEmail(true);
				setRequestedEmail(null);
				setVerifiedEmail(null);
				setOtpStatus("idle");
				return;
			}
			if (result.status === "rate_limited") {
				if (result.retryAt) {
					setOtpNow(Date.now());
					setOtpRetry({email: normalizedEmail, limit: result.limit, retryAt: result.retryAt});
				}
				setRequestedEmail(normalizedEmail);
				setVerifiedEmail(null);
				setOtpStatus("sent");
				setOtpServiceError(
					result.limit === "daily" && result.retryAt
						? `${result.message} Potrai riprovare dal ${formattedDate(result.retryAt)}.`
						: result.message,
				);
				return;
			}
			setOtpStatus(hadCurrentChallenge ? "sent" : "idle");
			setOtpServiceError(result.message);
		} catch {
			setOtpStatus(hadCurrentChallenge ? "sent" : "idle");
			setOtpServiceError("Non è stato possibile inviare il codice. Riprova tra poco.");
		}
	};

	const verifyOtp = async () => {
		if (otpBusy || registeredEmail) return;
		if (!challengeMatchesEmail) {
			setEmailError("Richiedi il codice per questo indirizzo email.");
			return;
		}
		if (!/^\d{6}$/.test(otpCode)) {
			setOtpError("Inserisci il codice di 6 cifre ricevuto via email.");
			return;
		}

		setOtpStatus("verifying");
		setOtpError(null);
		setOtpServiceError(null);
		try {
			const result = await verifyPublishEmailOtp({submissionId: payload.submissionId, email: normalizedEmail, code: otpCode});
			if (result.status === "verified") {
				setVerifiedEmail(normalizedEmail);
				setOtpStatus("verified");
				setOtpFeedback(result.message);
				return;
			}
			if (result.status === "already_registered") {
				setRegisteredEmail(true);
				setVerifiedEmail(null);
				setOtpStatus("sent");
				return;
			}
			setOtpStatus("sent");
			if (result.status === "invalid" || result.status === "expired") {
				setOtpError(result.message);
				return;
			}
			setOtpServiceError(result.message);
		} catch {
			setOtpStatus("sent");
			setOtpServiceError("Non è stato possibile verificare il codice. Riprova tra poco.");
		}
	};

	const submit = async () => {
		if (isSubmitting) return;
		setValidationVisible(true);
		setSubmitError(null);
		setRateLimitRetryAt(null);
		if (!dataConfirmed || !termsAccepted || !privacyAccepted) return;
		if (!authenticated && (!emailVerified || registeredEmail)) return;

		setIsSubmitting(true);
		try {
			const result = await publishAnnouncement({
				...payload,
				consents: {dataConfirmed, termsAccepted, privacyAccepted},
			});
			if (result.status === "success") {
				toast.add({
					title: "Annuncio inviato",
					description: "L’annuncio è stato salvato ed è ora in revisione.",
					type: "success",
					timeout: 4500,
				});
				router.push("/pubblica-annuncio/conferma");
				router.refresh();
				return;
			}
			if (result.status === "rate_limited") {
				setRateLimitRetryAt(result.retryAt);
				return;
			}
			setSubmitError(result.message);
			if (result.step && result.step < 4) {
				toast.add({
					title: "Controlla i dati inseriti",
					description: result.message,
					type: "error",
					timeout: 5000,
				});
				onEditStep(result.step);
			}
		} catch {
			setSubmitError("Il servizio di pubblicazione non è momentaneamente disponibile. Riprova.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="grid gap-8">
			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<CardTitle>Profilo utilizzato</CardTitle>
							<Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>Modifica</Button>
						</div>
						<CardDescription>{selectedType?.nome ?? payload.profileType}</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2 text-sm">
						<p className="font-medium">{profileTitle(payload, profileDrafts)}</p>
						<p className="text-muted-foreground">{locationSummary(profileLocations)}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<CardTitle>Dati annuncio</CardTitle>
							<Button variant="ghost" size="sm" onClick={() => onEditStep(3)}>Modifica</Button>
						</div>
						<CardDescription>{selectedSubtype?.nome ?? selectedType?.nome ?? payload.announcement.type}</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2 text-sm">
						<div className="flex flex-wrap gap-2"><Badge variant="secondary">Gratuito</Badge><Badge variant="outline">In revisione dopo l’invio</Badge></div>
						<p className="text-muted-foreground">{locationSummary(payload.announcement.locations)}</p>
						<p>{[payload.announcement.contacts.email, payload.announcement.contacts.phone].filter(Boolean).join(" · ")}</p>
					</CardContent>
				</Card>
			</div>

			{!authenticated && (
				<FieldSet>
					<FieldLegend>Verifica indirizzo email</FieldLegend>
					<FieldDescription>
						L’indirizzo è precompilato dal contatto pubblico, ma puoi modificarlo. Verrà usato soltanto per la verifica e non sostituirà il contatto mostrato nell’annuncio.
					</FieldDescription>
					<FieldGroup>
						<Field data-invalid={Boolean(displayedEmailError || registeredEmail)}>
							<FieldLabel htmlFor="publish-verification-email">Email di verifica</FieldLabel>
							<div className="flex flex-col gap-3 sm:flex-row">
								<Input
									id="publish-verification-email"
									type="email"
									autoComplete="email"
									value={verificationEmail}
									onChange={(event) => resetVerification(event.target.value)}
									placeholder="nome@email.it"
									disabled={otpBusy}
									required
									aria-required="true"
									aria-invalid={Boolean(displayedEmailError || registeredEmail)}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={requestOtp}
									disabled={otpBusy || otpRetryActive || emailVerified || registeredEmail}
								>
									{otpRequestLabel}
								</Button>
							</div>
							{registeredEmail ? (
								<FieldError>
									Email già registrata,{" "}
									<Link href="/accedi?next=%2Fpubblica-annuncio" className="underline underline-offset-4">accedi al profilo per pubblicare annunci</Link>
								</FieldError>
							) : displayedEmailError ? (
								<FieldError>{displayedEmailError}</FieldError>
							) : null}
							{otpFeedback && !emailVerified && <FieldDescription role="status">{otpFeedback}</FieldDescription>}
						</Field>

						{challengeMatchesEmail && !emailVerified && !registeredEmail && (
							<Field data-invalid={Boolean(displayedOtpError)}>
								<FieldLabel htmlFor="publish-verification-code">Codice OTP</FieldLabel>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<InputOTP
										id="publish-verification-code"
										maxLength={6}
										pattern={REGEXP_ONLY_DIGITS}
										value={otpCode}
										onChange={(value) => {
											setOtpCode(value);
											setOtpError(null);
										}}
									inputMode="numeric"
									autoComplete="one-time-code"
									disabled={otpBusy}
									required
									aria-required="true"
									aria-invalid={Boolean(displayedOtpError)}
									>
										<InputOTPGroup>
											{Array.from({length: 6}, (_, index) => (
												<InputOTPSlot key={index} index={index} aria-invalid={Boolean(displayedOtpError)} />
											))}
										</InputOTPGroup>
									</InputOTP>
								<Button type="button" onClick={verifyOtp} disabled={otpBusy}>
										{otpStatus === "verifying" ? "Verifica..." : "Verifica codice"}
									</Button>
								</div>
								{displayedOtpError && <FieldError>{displayedOtpError}</FieldError>}
							</Field>
						)}

						{emailVerified && (
							<Field orientation="horizontal">
								<CheckCircle2Icon aria-hidden="true" />
								<FieldContent>
									<FieldLabel>Email verificata</FieldLabel>
									<FieldDescription role="status">{normalizedEmail}</FieldDescription>
								</FieldContent>
							</Field>
						)}
					</FieldGroup>
				</FieldSet>
			)}

			{authenticated && (
				<Alert>
					<ShieldCheckIcon />
					<AlertTitle>Email già verificata</AlertTitle>
					<AlertDescription>La sessione attiva consente di inviare l’annuncio senza richiedere un nuovo codice.</AlertDescription>
				</Alert>
			)}

			{otpServiceError && (
				<Alert variant="destructive">
					<AlertTitle>Verifica email non disponibile</AlertTitle>
					<AlertDescription>{otpServiceError}</AlertDescription>
				</Alert>
			)}

			<Alert>
				<ShieldCheckIcon />
				<AlertTitle>Controllo prima della pubblicazione</AlertTitle>
				<AlertDescription>L’annuncio verrà salvato su Supabase come gratuito e in revisione. Non sarà pubblicamente visibile finché non sarà approvato.</AlertDescription>
			</Alert>

			{rateLimitRetryAt && (
				<Alert variant="destructive">
					<Clock3Icon />
					<AlertTitle>Limite giornaliero raggiunto</AlertTitle>
					<AlertDescription>
						Con questo indirizzo email è già stato inviato un annuncio nelle ultime 24 ore. Potrai riprovare dal {formattedDate(rateLimitRetryAt)}.
					</AlertDescription>
				</Alert>
			)}

			{submitError && (
				<Alert variant="destructive">
					<AlertTitle>Invio non riuscito</AlertTitle>
					<AlertDescription>{submitError}</AlertDescription>
				</Alert>
			)}

			<FieldSet>
				<FieldLegend>Conferme richieste</FieldLegend>
				<FieldGroup className="gap-4">
					<Field orientation="horizontal" data-invalid={Boolean(consentErrors.data)}>
						<Checkbox id="confirm-data" checked={dataConfirmed} onCheckedChange={(checked) => setDataConfirmed(Boolean(checked))} required aria-required="true" aria-invalid={Boolean(consentErrors.data)} />
						<FieldContent>
							<FieldLabel htmlFor="confirm-data" className="font-normal">Confermo che i dati inseriti sono corretti e veritieri.</FieldLabel>
						</FieldContent>
					</Field>
					<Field orientation="horizontal" data-invalid={Boolean(consentErrors.terms)}>
						<Checkbox id="confirm-terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))} required aria-required="true" aria-invalid={Boolean(consentErrors.terms)} />
						<FieldContent>
							<FieldLabel htmlFor="confirm-terms" className="font-normal">Ho letto e accetto i Termini e condizioni del servizio.</FieldLabel>
						</FieldContent>
					</Field>
					<Field orientation="horizontal" data-invalid={Boolean(consentErrors.privacy)}>
						<Checkbox id="confirm-privacy" checked={privacyAccepted} onCheckedChange={(checked) => setPrivacyAccepted(Boolean(checked))} required aria-required="true" aria-invalid={Boolean(consentErrors.privacy)} />
						<FieldContent>
							<FieldLabel htmlFor="confirm-privacy" className="font-normal">Ho letto l’informativa privacy e acconsento al trattamento dei dati.</FieldLabel>
						</FieldContent>
					</Field>
				</FieldGroup>
			</FieldSet>

			<div className="flex justify-between gap-3">
				<Button variant="outline" onClick={() => onEditStep(3)}>Indietro</Button>
				<Button disabled={isSubmitting || otpBusy || registeredEmail} onClick={submit}>
					{isSubmitting ? "Invio in corso..." : "Conferma e invia"}
				</Button>
			</div>
		</div>
	);
}
