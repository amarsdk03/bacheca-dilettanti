"use client";

import {type SubmitEvent, useActionState, useRef, useState} from "react";
import {useFormStatus} from "react-dom";
import Link from "next/link";
import {REGEXP_ONLY_DIGITS} from "input-otp";
import {ArrowLeftIcon, ArrowRightIcon, CheckIcon, CircleAlertIcon, EyeIcon, EyeOffIcon, FlameIcon, MailCheckIcon, UserPlusIcon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button, buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Checkbox} from "@/components/ui/checkbox";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import GradientBackground from "@/components/styling/GradientBackground";
import LimitedProfileAvailability from "@/features/profilo/LimitedProfileAvailability";
import ProfileDetailsForm from "@/features/profilo/ProfileDetailsForm";
import SignupConfirmationResend from "@/features/auth/SignupConfirmationResend";
import {signUpWithPassword} from "@/features/auth/server/actions";
import {
	createProfileDrafts,
	createProfileLocations,
	isLimitedProfileType,
	isProfileType,
	MAX_PROFILE_COUNT,
	PROFILE_OPTIONS,
	type ProfileLocationDraft,
	type ProfileDrafts,
	type ProfileType,
} from "@/features/profilo/profile-model";
import {INITIAL_AUTH_STATE, type AuthActionState, type AuthFieldErrors} from "@/features/auth/types";
import {hasFieldErrors, validateRegistration} from "@/features/auth/validation";
import {createRegistrationPayload} from "@/features/registrati/registration-payload";
import {
	requestRegistrationEmailRecovery,
	verifyRegistrationEmailRecovery,
} from "@/features/registrati/server/actions";
import {cn} from "@/lib/utils";

interface RegistratiProps {
	nextPath: string;
	contactEmail: string;
	existingSessionEmail: string | null;
}

type RegistrationStep = 1 | 2 | 3;
type RegistrationEmailStatus = "unchecked" | "checking" | "new_email" | "sent" | "verifying" | "verified";

interface AccountDraft {
	email: string;
	password: string;
	confirmPassword: string;
}

const INITIAL_ACCOUNT_DRAFT: AccountDraft = {
	email: "",
	password: "",
	confirmPassword: "",
};

const STEPS = ["Account", "Tipo di profilo", "Dati profilo"] as const;

function SubmitButton() {
	const {pending} = useFormStatus();

	return (
		<Button type="submit" size="lg" disabled={pending}>
			<UserPlusIcon data-icon="inline-start" />
			{pending ? "Creazione in corso…" : "Crea account"}
		</Button>
	);
}

function RegistrationProgress({step}: {step: RegistrationStep}) {
	return (
		<nav aria-label="Avanzamento registrazione" className="mx-auto w-full max-w-lg">
			<ol className="grid grid-cols-3 gap-2">
				{STEPS.map((label, index) => {
					const stepNumber = (index + 1) as RegistrationStep;
					const completed = stepNumber < step;
					const current = stepNumber === step;

					return (
						<li
							key={label}
							aria-current={current ? "step" : undefined}
							className="flex min-w-0 flex-col items-center gap-1.5 text-center"
						>
							<Badge variant={stepNumber <= step ? "default" : "outline"} className="size-7 justify-center rounded-full p-0">
								{completed ? <CheckIcon aria-label="Completato" /> : stepNumber}
							</Badge>
							<span className={cn("truncate text-xs", current ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

function RegistrationConfirmation({email}: {email: string}) {
	return (
		<GradientBackground className="min-h-svh px-4 py-8 sm:px-6 md:py-10">
			<div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-3xl items-start justify-center py-6">
				<Card className="w-full bg-card/95 shadow-xl backdrop-blur-sm">
					<CardContent className="p-6 sm:p-10">
						<Empty role="status" aria-live="polite">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<MailCheckIcon aria-hidden="true" />
								</EmptyMedia>
								<EmptyTitle>Controlla la tua email</EmptyTitle>
								<EmptyDescription>
									Se l’indirizzo può essere registrato, riceverai un link di verifica a{" "}
									<span className="font-medium text-foreground">{email}</span>.
									 Aprilo per confermare l’account prima di accedere.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<SignupConfirmationResend email={email} />
								<Link href="/accedi" className={buttonVariants({size: "lg"})}>
									Vai ad accedi
									<ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
								</Link>
							</EmptyContent>
						</Empty>
					</CardContent>
				</Card>
			</div>
		</GradientBackground>
	);
}

export default function Registrati({nextPath, contactEmail, existingSessionEmail}: RegistratiProps) {
	const [state, formAction] = useActionState(signUpWithPassword, INITIAL_AUTH_STATE);
	const [step, setStep] = useState<RegistrationStep>(1);
	const [account, setAccount] = useState<AccountDraft>(() => ({
		...INITIAL_ACCOUNT_DRAFT,
		email: existingSessionEmail ?? "",
	}));
	const [registrationEmailStatus, setRegistrationEmailStatus] = useState<RegistrationEmailStatus>(
		existingSessionEmail ? "verified" : "unchecked",
	);
	const [resolvedEmail, setResolvedEmail] = useState<string | null>(
		existingSessionEmail?.trim().toLowerCase() ?? null,
	);
	const [verifiedSessionEmail, setVerifiedSessionEmail] = useState<string | null>(existingSessionEmail);
	const [otpCode, setOtpCode] = useState("");
	const [emailRecoveryError, setEmailRecoveryError] = useState<string>();
	const [otpError, setOtpError] = useState<string>();
	const [otpFeedback, setOtpFeedback] = useState<string>();
	const [registeredEmail, setRegisteredEmail] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [clientFieldErrors, setClientFieldErrors] = useState<AuthFieldErrors>({});
	const [selectedProfileTypes, setSelectedProfileTypes] = useState<ProfileType[]>([]);
	const [primaryProfileType, setPrimaryProfileType] = useState<ProfileType | "">("");
	const [profileDrafts, setProfileDrafts] = useState(createProfileDrafts);
	const [profileLocations, setProfileLocations] = useState(createProfileLocations);
	const [profileSelectionError, setProfileSelectionError] = useState<string>();
	const [showPrimaryProfileError, setShowPrimaryProfileError] = useState(false);
	const [profileDetailIndex, setProfileDetailIndex] = useState(0);
	const [handledServerError, setHandledServerError] = useState<AuthActionState | null>(null);
	const [pendingSignupEmail, setPendingSignupEmail] = useState<string | null>(null);
	const registrationHeaderRef = useRef<HTMLDivElement>(null);

	if (state.status === "success" || pendingSignupEmail) {
		return <RegistrationConfirmation email={pendingSignupEmail ?? account.email} />;
	}

	const selectedProfilesInCatalogOrder = PROFILE_OPTIONS
		.map((option) => option.value)
		.filter((type) => selectedProfileTypes.includes(type));
	const limitedSelectedProfileTypes = selectedProfilesInCatalogOrder.filter(isLimitedProfileType);
	const registrableProfileTypes: ProfileType[] = selectedProfilesInCatalogOrder.filter(
		(type) => !isLimitedProfileType(type),
	);
	const orderedSelectedProfileTypes = primaryProfileType
		? [primaryProfileType, ...registrableProfileTypes.filter((type) => type !== primaryProfileType)]
		: registrableProfileTypes;
	const hasUnhandledServerError = state.status === "error" && state !== handledServerError;
	const visibleStep = hasUnhandledServerError ? state.step ?? 1 : step;
	const serverProfileDetailIndex = state.profileType
		? orderedSelectedProfileTypes.indexOf(state.profileType)
		: -1;
	const visibleProfileDetailIndex = hasUnhandledServerError && visibleStep === 3 && serverProfileDetailIndex >= 0
		? serverProfileDetailIndex
		: profileDetailIndex;
	const currentProfileType = orderedSelectedProfileTypes[visibleProfileDetailIndex];
	const currentProfile = PROFILE_OPTIONS.find((option) => option.value === currentProfileType);
	const isLastProfileDetail = visibleProfileDetailIndex === orderedSelectedProfileTypes.length - 1;
	const fieldErrors = {
		...(hasUnhandledServerError ? state.fieldErrors : {}),
		...clientFieldErrors,
	};
	const normalizedAccountEmail = account.email.trim().toLowerCase();
	const emailRecoveryBusy = registrationEmailStatus === "checking" || registrationEmailStatus === "verifying";
	const serverRequiresEmailRecovery = hasUnhandledServerError && state.reason === "email_verification_required";
	const emailAlreadyRegistered = registeredEmail || (hasUnhandledServerError && state.reason === "already_registered");
	const emailLocked = Boolean(verifiedSessionEmail);
	const registrationPayload = createRegistrationPayload(
		selectedProfilesInCatalogOrder,
		primaryProfileType,
		profileDrafts,
		profileLocations,
	);

	const scrollToHeader = () => {
		registrationHeaderRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
	};

	const acknowledgeServerError = () => {
		if (!hasUnhandledServerError) return;
		setHandledServerError(state);
		setStep(visibleStep);
		if (visibleStep === 3) setProfileDetailIndex(visibleProfileDetailIndex);
	};

	const updateAccount = (field: keyof AccountDraft, value: string) => {
		acknowledgeServerError();
		setAccount((previous) => ({...previous, [field]: value}));
		setClientFieldErrors((previous) => ({...previous, [field]: undefined}));
		if (field === "email" && !emailLocked) {
			setRegistrationEmailStatus("unchecked");
			setResolvedEmail(null);
			setOtpCode("");
			setEmailRecoveryError(undefined);
			setOtpError(undefined);
			setOtpFeedback(undefined);
			setRegisteredEmail(false);
		}
	};

	const validateAccountStep = () => {
		const formData = new FormData();
		formData.set("email", account.email);
		formData.set("password", account.password);
		formData.set("confirmPassword", account.confirmPassword);
		const {fieldErrors: nextErrors} = validateRegistration(formData);

		setClientFieldErrors(nextErrors);
		return !hasFieldErrors(nextErrors);
	};

	const advanceFromAccount = () => {
		setStep(2);
		scrollToHeader();
	};

	const requestEmailRecovery = async (advanceWhenReady: boolean) => {
		setRegistrationEmailStatus("checking");
		setEmailRecoveryError(undefined);
		setOtpError(undefined);
		setOtpFeedback(undefined);
		setRegisteredEmail(false);

		const result = await requestRegistrationEmailRecovery({email: normalizedAccountEmail}).catch(() => null);
		if (!result) {
			setRegistrationEmailStatus(advanceWhenReady ? "unchecked" : "sent");
			setEmailRecoveryError("Non è stato possibile verificare l’indirizzo. Riprova tra poco.");
			return;
		}
		if (result.status === "new_email") {
			setRegistrationEmailStatus("new_email");
			setResolvedEmail(normalizedAccountEmail);
			if (advanceWhenReady) advanceFromAccount();
			return;
		}
		if (result.status === "verified") {
			setRegistrationEmailStatus("verified");
			setResolvedEmail(result.email);
			setVerifiedSessionEmail(result.email);
			setOtpFeedback(result.message);
			if (advanceWhenReady) advanceFromAccount();
			return;
		}
		if (result.status === "sent") {
			setRegistrationEmailStatus("sent");
			setResolvedEmail(normalizedAccountEmail);
			setOtpCode("");
			setOtpFeedback(result.message);
			return;
		}
		if (result.status === "signup_pending") {
			setRegistrationEmailStatus("unchecked");
			setPendingSignupEmail(result.email);
			return;
		}
		if (result.status === "already_registered") {
			setRegistrationEmailStatus("unchecked");
			setRegisteredEmail(true);
			setEmailRecoveryError(result.message);
			return;
		}

		setRegistrationEmailStatus(advanceWhenReady ? "unchecked" : "sent");
		setEmailRecoveryError(result.message);
	};

	const continueFromAccount = async () => {
		if (!validateAccountStep()) return;
		acknowledgeServerError();

		const emailAlreadyResolved = resolvedEmail === normalizedAccountEmail;
		if (
			!serverRequiresEmailRecovery
			&& emailAlreadyResolved
			&& (registrationEmailStatus === "new_email" || registrationEmailStatus === "verified")
		) {
			advanceFromAccount();
			return;
		}

		await requestEmailRecovery(true);
	};

	const verifyRecoveryCode = async () => {
		if (!/^\d{6}$/.test(otpCode)) {
			setOtpError("Inserisci il codice a 6 cifre ricevuto via email.");
			return;
		}

		setRegistrationEmailStatus("verifying");
		setOtpError(undefined);
		setEmailRecoveryError(undefined);
		const result = await verifyRegistrationEmailRecovery({
			email: normalizedAccountEmail,
			code: otpCode,
		}).catch(() => null);
		if (!result) {
			setRegistrationEmailStatus("sent");
			setOtpError("Non è stato possibile verificare il codice. Riprova.");
			return;
		}

		if (result.status === "verified") {
			setRegistrationEmailStatus("verified");
			setResolvedEmail(result.email);
			setVerifiedSessionEmail(result.email);
			setOtpFeedback(result.message);
			advanceFromAccount();
			return;
		}
		if (result.status === "already_registered") {
			setRegistrationEmailStatus("unchecked");
			setRegisteredEmail(true);
			setEmailRecoveryError(result.message);
			return;
		}

		setRegistrationEmailStatus("sent");
		setOtpError(result.message);
	};

	const toggleProfileType = (type: ProfileType, checked: boolean) => {
		acknowledgeServerError();
		if (checked && selectedProfileTypes.includes(type)) return;
		if (checked && selectedProfileTypes.length >= MAX_PROFILE_COUNT) {
			setProfileSelectionError(`Puoi selezionare al massimo ${MAX_PROFILE_COUNT} profili.`);
			return;
		}

		const nextSelectedProfileTypes = checked
			? [...selectedProfileTypes, type]
			: selectedProfileTypes.filter((selectedType) => selectedType !== type);
		const previousRegistrableProfiles: ProfileType[] = selectedProfileTypes.filter(
			(selectedType) => !isLimitedProfileType(selectedType),
		);
		const nextRegistrableProfiles: ProfileType[] = nextSelectedProfileTypes.filter(
			(selectedType) => !isLimitedProfileType(selectedType),
		);

		setSelectedProfileTypes(nextSelectedProfileTypes);
		setPrimaryProfileType((previousPrimary) => {
			if (nextRegistrableProfiles.length === 0) return "";
			if (nextRegistrableProfiles.length === 1) return nextRegistrableProfiles[0];
			if (previousRegistrableProfiles.length <= 1) return "";
			return nextRegistrableProfiles.includes(previousPrimary as ProfileType)
				? previousPrimary
				: "";
		});

		setProfileSelectionError(undefined);
		setShowPrimaryProfileError(false);
	};

	const continueFromProfileTypes = () => {
		acknowledgeServerError();
		if (selectedProfileTypes.length === 0) {
			setProfileSelectionError("Seleziona almeno una tipologia di profilo per continuare.");
			return;
		}

		if (registrableProfileTypes.length === 0) {
			setProfileSelectionError("Per creare subito l’account, seleziona almeno un profilo senza disponibilità limitata.");
			return;
		}

		if (!primaryProfileType || !registrableProfileTypes.includes(primaryProfileType)) {
			setShowPrimaryProfileError(true);
			return;
		}

		setProfileSelectionError(undefined);
		setShowPrimaryProfileError(false);
		setProfileDetailIndex(0);
		setStep(3);
		scrollToHeader();
	};

	const updateProfileDraft = <
		Type extends ProfileType,
		Field extends keyof ProfileDrafts[Type],
	>(type: Type, field: Field, value: ProfileDrafts[Type][Field]) => {
		acknowledgeServerError();
		setProfileDrafts((previous) => ({
			...previous,
			[type]: {...previous[type], [field]: value},
		}) as ProfileDrafts);
	};

	const updateProfileLocations = (type: ProfileType, locations: ProfileLocationDraft[]) => {
		acknowledgeServerError();
		setProfileLocations((previous) => ({...previous, [type]: locations}));
	};

	const continueFromProfileDetails = () => {
		if (!currentProfileType) return;
		acknowledgeServerError();
		setProfileDetailIndex(visibleProfileDetailIndex + 1);
		scrollToHeader();
	};

	const goBack = () => {
		acknowledgeServerError();
		if (visibleStep === 3 && visibleProfileDetailIndex > 0) {
			setStep(3);
			setProfileDetailIndex(visibleProfileDetailIndex - 1);
			return;
		}

		setStep(visibleStep === 3 ? 2 : 1);
		scrollToHeader();
	};

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		if (visibleStep === 1) {
			event.preventDefault();
			if (registrationEmailStatus === "sent" && resolvedEmail === normalizedAccountEmail) {
				void verifyRecoveryCode();
			} else if (!emailRecoveryBusy) {
				void continueFromAccount();
			}
			return;
		}

		acknowledgeServerError();
		if (!validateAccountStep()) {
			event.preventDefault();
			setStep(1);
			return;
		}

		if (selectedProfileTypes.length === 0) {
			event.preventDefault();
			setProfileSelectionError("Seleziona almeno una tipologia di profilo per continuare.");
			setStep(2);
			return;
		}

		if (registrableProfileTypes.length === 0) {
			event.preventDefault();
			setProfileSelectionError("Per creare subito l’account, seleziona almeno un profilo senza disponibilità limitata.");
			setStep(2);
			return;
		}

		if (!primaryProfileType || !registrableProfileTypes.includes(primaryProfileType)) {
			event.preventDefault();
			setShowPrimaryProfileError(true);
			setStep(2);
			return;
		}

		if (!registrationPayload) {
			event.preventDefault();
			setProfileSelectionError("Rivedi la selezione dei profili e riprova.");
			setStep(2);
		}
	};

	const title = visibleStep === 1
		? "Crea il tuo account"
		: visibleStep === 2
			? "Scegli i tuoi profili"
			: currentProfile?.label ?? "Completa i tuoi profili";
	const description = visibleStep === 1
		? verifiedSessionEmail
			? "Completa l’account verificato scegliendo una password."
			: "Registrati gratuitamente con email e password."
		: visibleStep === 2
			? "Seleziona le categorie che rappresentano meglio i tuoi interessi e obiettivi."
			: "Aggiungi i dettagli che vuoi mostrare. Tutti i campi sono facoltativi e modificabili in seguito.";

	return (
		<GradientBackground className="min-h-svh px-4 py-8 sm:px-6 md:py-10">
			<div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl flex-col">
				<div className="flex flex-1 items-start justify-center py-6">
					<form action={formAction} onSubmit={handleSubmit} className="w-full max-w-3xl">
						<input
							type="hidden"
							name="registrationPayload"
							value={registrationPayload ? JSON.stringify(registrationPayload) : ""}
						/>
						{visibleStep !== 1 && (
							<>
								<input type="hidden" name="email" value={account.email} />
								<input type="hidden" name="password" value={account.password} />
								<input type="hidden" name="confirmPassword" value={account.confirmPassword} />
							</>
						)}

						<Card className="bg-card/95 shadow-xl backdrop-blur-sm">
							<CardHeader ref={registrationHeaderRef} className="scroll-mt-24 px-6 sm:px-12 flex flex-col items-stretch gap-8 pt-4">
								<RegistrationProgress step={visibleStep} />
								<div className="flex flex-col gap-1 text-center mb-4">
									{visibleStep === 3 && currentProfileType && (
										<div className="flex justify-center gap-2 mb-2">
										<Badge variant="secondary">Profilo {visibleProfileDetailIndex + 1} di {orderedSelectedProfileTypes.length}</Badge>
										</div>
									)}
									<CardTitle className="text-2xl font-medium">{title}</CardTitle>
									<CardDescription>{description}</CardDescription>
								</div>
							</CardHeader>

							<CardContent className="px-8 sm:px-12 pb-8">
								{hasUnhandledServerError && state.message && (
									<Alert variant="destructive" className="mb-6" aria-live="polite">
										<CircleAlertIcon aria-hidden="true" />
										<AlertTitle>Registrazione non completata</AlertTitle>
										<AlertDescription>{state.message}</AlertDescription>
									</Alert>
								)}
								{visibleStep === 1 && (
									<FieldGroup className="mx-auto max-w-2xl">
										<Field data-invalid={Boolean(fieldErrors.email || emailRecoveryError || emailAlreadyRegistered)}>
											<FieldLabel htmlFor="registration-email">Email</FieldLabel>
											<Input id="registration-email" name="email" value={account.email} onChange={(event) => updateAccount("email", event.target.value)} type="email" maxLength={254} placeholder="nome@esempio.it" autoComplete="email" required readOnly={emailLocked} aria-invalid={Boolean(fieldErrors.email || emailRecoveryError || emailAlreadyRegistered)} />
											{emailAlreadyRegistered ? (
												<FieldError>
													Email già registrata. <Link href={`/accedi?next=${encodeURIComponent(nextPath)}`} className="underline underline-offset-4">Accedi al tuo account</Link>.
												</FieldError>
											) : (
												<FieldError>{emailRecoveryError ?? fieldErrors.email}</FieldError>
											)}
										</Field>
										{(registrationEmailStatus === "sent" || registrationEmailStatus === "verifying") && resolvedEmail === normalizedAccountEmail && (
											<Field data-invalid={Boolean(otpError)}>
												<FieldLabel htmlFor="registration-recovery-code">Codice OTP</FieldLabel>
												<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
													<InputOTP
														id="registration-recovery-code"
														maxLength={6}
														pattern={REGEXP_ONLY_DIGITS}
														value={otpCode}
														onChange={(value) => {
															setOtpCode(value);
															setOtpError(undefined);
														}}
														inputMode="numeric"
														autoComplete="one-time-code"
														disabled={emailRecoveryBusy}
														required
														aria-required="true"
														aria-invalid={Boolean(otpError)}
													>
														<InputOTPGroup>
															{Array.from({length: 6}, (_, index) => (
																<InputOTPSlot key={index} index={index} aria-invalid={Boolean(otpError)} />
															))}
														</InputOTPGroup>
													</InputOTP>
													<Button type="button" onClick={verifyRecoveryCode} disabled={emailRecoveryBusy}>
														{registrationEmailStatus === "verifying" ? "Verifica…" : "Verifica codice"}
													</Button>
												</div>
												{otpFeedback && <FieldDescription role="status">{otpFeedback}</FieldDescription>}
												<FieldError>{otpError}</FieldError>
												<Button type="button" variant="outline" size="sm" onClick={() => requestEmailRecovery(false)} disabled={emailRecoveryBusy} className="w-fit">
													Invia di nuovo il codice
												</Button>
											</Field>
										)}
										<Field data-invalid={Boolean(fieldErrors.password)}>
											<FieldLabel htmlFor="registration-password">Password</FieldLabel>
											<InputGroup>
												<InputGroupInput id="registration-password" name="password" value={account.password} onChange={(event) => updateAccount("password", event.target.value)} type={showPassword ? "text" : "password"} minLength={8} maxLength={128} autoComplete="new-password" required aria-invalid={Boolean(fieldErrors.password)} />
												<InputGroupAddon align="inline-end">
													<InputGroupButton
														type="button"
														size="icon-xs"
														aria-label={showPassword ? "Nascondi password" : "Mostra password"}
														aria-pressed={showPassword}
														title={showPassword ? "Nascondi password" : "Mostra password"}
														onClick={() => setShowPassword((visible) => !visible)}
													>
														{showPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
													</InputGroupButton>
												</InputGroupAddon>
											</InputGroup>
											<FieldDescription>
												Utilizza una password sicura, composta da almeno 8 caratteri
											</FieldDescription>
											<FieldError>{fieldErrors.password}</FieldError>
										</Field>
										<Field data-invalid={Boolean(fieldErrors.confirmPassword)}>
											<FieldLabel htmlFor="registration-confirm-password">Conferma password</FieldLabel>
											<InputGroup>
												<InputGroupInput id="registration-confirm-password" name="confirmPassword" value={account.confirmPassword} onChange={(event) => updateAccount("confirmPassword", event.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" required aria-invalid={Boolean(fieldErrors.confirmPassword)} />
											</InputGroup>
											<FieldError>{fieldErrors.confirmPassword}</FieldError>
										</Field>
										<FieldDescription className="text-center">
											{verifiedSessionEmail
												? "L’indirizzo email è verificato dalla sessione attiva."
												: <>Hai già un account? <Link href={`/accedi?next=${encodeURIComponent(nextPath)}`}>Accedi</Link></>}
										</FieldDescription>
									</FieldGroup>
								)}

								{visibleStep === 2 && (
									<FieldGroup>
										<FieldSet>
											<FieldLegend variant="label">Seleziona i tuoi profili</FieldLegend>
											<FieldDescription>Puoi scegliere fino a un massimo di {MAX_PROFILE_COUNT} tipologie, che potrai modificare in seguito.</FieldDescription>
											<Badge variant="secondary" className="w-fit">{selectedProfileTypes.length} di {MAX_PROFILE_COUNT} selezionati</Badge>
											<FieldGroup data-slot="checkbox-group" className="grid gap-3 sm:grid-cols-2">
												{PROFILE_OPTIONS.map(({value, label, description: optionDescription, icon: Icon}) => {
													const checked = selectedProfileTypes.includes(value);
													const disabled = !checked && selectedProfileTypes.length >= MAX_PROFILE_COUNT;

													return (
														<div key={value} className="relative">
															{
																(value === "professionisti-studi" || value === "creators") && (
																	<Badge
																		className="bg-orange-100 text-yellow-700 absolute -top-1 -right-1 z-10 flex items-center gap-1"
																	>
																		<FlameIcon aria-hidden="true" />
																		Posti limitati
																	</Badge>
																)
															}
															<FieldLabel htmlFor={`registration-type-${value}`}>
																<Field orientation="horizontal" data-disabled={disabled}>
																	<Icon aria-hidden="true" />
																	<FieldContent>
																		<FieldTitle>{label}</FieldTitle>
																		<FieldDescription>{optionDescription}</FieldDescription>
																	</FieldContent>
																	<Checkbox
																		id={`registration-type-${value}`}
																		checked={checked}
																		onCheckedChange={(nextChecked) => toggleProfileType(value, Boolean(nextChecked))}
																		disabled={disabled}
																		aria-invalid={Boolean(profileSelectionError)}
																	/>
																</Field>
															</FieldLabel>
														</div>
													);
												})}
											</FieldGroup>
											{profileSelectionError && <FieldError>{profileSelectionError}</FieldError>}
										</FieldSet>

										{limitedSelectedProfileTypes.length > 0 && (
											<FieldSet className="mt-4">
												<FieldLegend variant="label">Profili con disponibilità limitata</FieldLegend>
												<FieldDescription>Queste tipologie richiedono una verifica preventiva e non saranno attivate automaticamente con l’account.</FieldDescription>
												<FieldGroup className="gap-3">
													{limitedSelectedProfileTypes.map((type) => (
														<LimitedProfileAvailability key={type} type={type} contactEmail={contactEmail} />
													))}
												</FieldGroup>
												{registrableProfileTypes.length === 0 && (
													<FieldDescription>Per creare subito l’account, aggiungi almeno un profilo senza disponibilità limitata.</FieldDescription>
												)}
											</FieldSet>
										)}

										{registrableProfileTypes.length > 1 && (
											<FieldSet className="mt-4">
												<FieldLegend variant="label">Scegli il profilo principale</FieldLegend>
												<FieldDescription>È il profilo che rappresenterà per primo la tua presenza sulla piattaforma.</FieldDescription>
												<RadioGroup
													value={primaryProfileType}
												onValueChange={(value) => {
													if (!isProfileType(value) || !registrableProfileTypes.includes(value)) return;
													acknowledgeServerError();
														setPrimaryProfileType(value);
														setShowPrimaryProfileError(false);
													}}
													aria-invalid={showPrimaryProfileError}
													className="grid gap-3 sm:grid-cols-2"
												>
													{PROFILE_OPTIONS.filter(({value}) => registrableProfileTypes.includes(value)).map(({value, label, icon: Icon}) => (
														<FieldLabel key={value} htmlFor={`registration-primary-${value}`}>
															<Field orientation="horizontal">
																<Icon aria-hidden="true" />
																<FieldTitle>{label}</FieldTitle>
																<RadioGroupItem id={`registration-primary-${value}`} value={value} aria-invalid={showPrimaryProfileError} />
															</Field>
														</FieldLabel>
													))}
												</RadioGroup>
												{showPrimaryProfileError && <FieldError>Seleziona il profilo principale per continuare.</FieldError>}
											</FieldSet>
										)}
									</FieldGroup>
								)}

								{visibleStep === 3 && currentProfileType && (
									<ProfileDetailsForm
										key={currentProfileType}
										type={currentProfileType}
										drafts={profileDrafts}
										locations={profileLocations}
										onChange={updateProfileDraft}
										onLocationsChange={updateProfileLocations}
									/>
								)}
							</CardContent>

							<CardFooter className={cn("flex gap-3", visibleStep === 1 ? "justify-end" : "justify-between")}>
								{visibleStep > 1 && (
									<Button type="button" variant="outline" size="lg" onClick={goBack}>
										<ArrowLeftIcon data-icon="inline-start" />
										Indietro
									</Button>
								)}
								{visibleStep === 1 && registrationEmailStatus !== "sent" && registrationEmailStatus !== "verifying" && (
									<Button type="button" size="lg" onClick={continueFromAccount} disabled={emailRecoveryBusy}>
										{registrationEmailStatus === "checking" ? "Verifica email…" : "Continua"}
										<ArrowRightIcon data-icon="inline-end" />
									</Button>
								)}
								{visibleStep === 2 && (selectedProfileTypes.length === 0 || registrableProfileTypes.length > 0) && (
									<Button type="button" size="lg" onClick={continueFromProfileTypes}>
										Continua
										<ArrowRightIcon data-icon="inline-end" />
									</Button>
								)}
								{visibleStep === 3 && !isLastProfileDetail && (
									<Button type="button" size="lg" onClick={continueFromProfileDetails}>
										Continua
										<ArrowRightIcon data-icon="inline-end" />
									</Button>
								)}
								{visibleStep === 3 && isLastProfileDetail && <SubmitButton />}
							</CardFooter>
						</Card>
					</form>
				</div>
			</div>
		</GradientBackground>
	);
}
