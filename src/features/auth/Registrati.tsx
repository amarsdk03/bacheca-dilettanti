"use client";

import {type FormEvent, useActionState, useState} from "react";
import {useFormStatus} from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {ArrowLeftIcon, ArrowRightIcon, CheckIcon, EyeIcon, EyeOffIcon, UserPlusIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";
import AuthBackground from "@/features/auth/AuthBackground";
import RegistrationProfileDetails from "@/features/auth/RegistrationProfileDetails";
import {signUpWithPassword} from "@/features/auth/actions";
import {
	createRegistrationProfileDrafts,
	getMissingRegistrationProfileFields,
	isRegistrationProfileType,
	REGISTRATION_PROFILE_OPTIONS,
	type RegistrationProfileType,
} from "@/features/auth/registration-profile";
import {INITIAL_AUTH_STATE, type AuthActionState, type AuthFieldErrors} from "@/features/auth/types";
import {hasFieldErrors, validateRegistration} from "@/features/auth/validation";
import {cn} from "@/lib/utils";

interface RegistratiProps {
	nextPath: string;
}

type RegistrationStep = 1 | 2 | 3;

interface AccountDraft {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
}

const INITIAL_ACCOUNT_DRAFT: AccountDraft = {
	name: "",
	email: "",
	password: "",
	confirmPassword: "",
};

const STEPS = ["Account", "Tipo di profilo", "Dettagli"] as const;

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

export default function Registrati({nextPath}: RegistratiProps) {
	const [state, formAction] = useActionState(signUpWithPassword, INITIAL_AUTH_STATE);
	const [step, setStep] = useState<RegistrationStep>(1);
	const [account, setAccount] = useState<AccountDraft>(INITIAL_ACCOUNT_DRAFT);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [clientFieldErrors, setClientFieldErrors] = useState<AuthFieldErrors>({});
	const [profileType, setProfileType] = useState<RegistrationProfileType | "">("");
	const [profileDrafts, setProfileDrafts] = useState(createRegistrationProfileDrafts);
	const [showProfileTypeError, setShowProfileTypeError] = useState(false);
	const [showProfileDetailsErrors, setShowProfileDetailsErrors] = useState(false);
	const [handledServerError, setHandledServerError] = useState<AuthActionState | null>(null);
	const visibleStep = state.status === "error" && state !== handledServerError ? 1 : step;

	const selectedProfile = REGISTRATION_PROFILE_OPTIONS.find((option) => option.value === profileType);
	const fieldErrors = {...state.fieldErrors, ...clientFieldErrors};

	const updateAccount = (field: keyof AccountDraft, value: string) => {
		setAccount((previous) => ({...previous, [field]: value}));
		setClientFieldErrors((previous) => ({...previous, [field]: undefined}));
	};

	const validateAccountStep = () => {
		const formData = new FormData();
		formData.set("name", account.name);
		formData.set("email", account.email);
		formData.set("password", account.password);
		formData.set("confirmPassword", account.confirmPassword);
		const {fieldErrors: nextErrors} = validateRegistration(formData);

		setClientFieldErrors(nextErrors);
		return !hasFieldErrors(nextErrors);
	};

	const continueFromAccount = () => {
		if (!validateAccountStep()) return;
		if (state.status === "error") setHandledServerError(state);
		setStep(2);
	};

	const continueFromProfileType = () => {
		if (!profileType) {
			setShowProfileTypeError(true);
			return;
		}

		setShowProfileTypeError(false);
		setShowProfileDetailsErrors(false);
		setStep(3);
	};

	const updateProfileDraft = (field: string, value: string) => {
		if (!profileType) return;

		setProfileDrafts((previous) => ({
			...previous,
			[profileType]: {...previous[profileType], [field]: value},
		}));
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		if (!validateAccountStep()) {
			event.preventDefault();
			setStep(1);
			return;
		}

		if (!profileType) {
			event.preventDefault();
			setShowProfileTypeError(true);
			setStep(2);
			return;
		}

		if (getMissingRegistrationProfileFields(profileType, profileDrafts[profileType]).length > 0) {
			event.preventDefault();
			setShowProfileDetailsErrors(true);
		}
	};

	const title = visibleStep === 1
		? "Crea il tuo account"
		: visibleStep === 2
			? "Scegli il tuo profilo"
			: selectedProfile?.label ?? "Completa il profilo";
	const description = visibleStep === 1
		? "Registrati gratuitamente con email e password."
		: visibleStep === 2
			? "Seleziona la categoria che rappresenta meglio la tua attività nel calcio dilettantistico."
			: "Aggiungi ora le informazioni essenziali; potrai gestirle davvero in una prossima versione.";

	return (
		<AuthBackground className="min-h-svh px-4 py-8 sm:px-6 md:py-10">
			<div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl flex-col">
				<Link href="/" className="flex w-fit self-center md:self-start">
					<Image src={DEFAULT_LOGO_TRANSPARENT_PATH} alt="Bacheca Dilettanti" width={150} height={90} priority />
				</Link>

				<div className="flex flex-1 items-center justify-center py-6">
					<form action={formAction} onSubmit={handleSubmit} className="w-full max-w-4xl">
						{visibleStep !== 1 && (
							<>
								<input type="hidden" name="name" value={account.name} />
								<input type="hidden" name="email" value={account.email} />
								<input type="hidden" name="password" value={account.password} />
								<input type="hidden" name="confirmPassword" value={account.confirmPassword} />
							</>
						)}

						<Card className="bg-card/95 shadow-xl backdrop-blur-sm">
							<CardHeader className="flex flex-col items-stretch gap-5">
								<RegistrationProgress step={visibleStep} />
								<div className="flex flex-col gap-1 text-center">
									<CardTitle className="text-2xl">{title}</CardTitle>
									<CardDescription>{description}</CardDescription>
								</div>
							</CardHeader>

							<CardContent>
								{visibleStep === 1 && (
									<FieldGroup className="mx-auto max-w-md">
										<Field data-invalid={Boolean(fieldErrors.name)}>
											<FieldLabel htmlFor="registration-name">Nome e cognome</FieldLabel>
											<Input id="registration-name" name="name" value={account.name} onChange={(event) => updateAccount("name", event.target.value)} type="text" maxLength={80} placeholder="Mario Rossi" autoComplete="name" required aria-invalid={Boolean(fieldErrors.name)} />
											<FieldError>{fieldErrors.name}</FieldError>
										</Field>
										<Field data-invalid={Boolean(fieldErrors.email)}>
											<FieldLabel htmlFor="registration-email">Email</FieldLabel>
											<Input id="registration-email" name="email" value={account.email} onChange={(event) => updateAccount("email", event.target.value)} type="email" maxLength={254} placeholder="nome@esempio.it" autoComplete="email" required aria-invalid={Boolean(fieldErrors.email)} />
											<FieldError>{fieldErrors.email}</FieldError>
										</Field>
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
											<FieldDescription>Usa almeno 8 caratteri.</FieldDescription>
											<FieldError>{fieldErrors.password}</FieldError>
										</Field>
										<Field data-invalid={Boolean(fieldErrors.confirmPassword)}>
											<FieldLabel htmlFor="registration-confirm-password">Conferma password</FieldLabel>
											<InputGroup>
												<InputGroupInput id="registration-confirm-password" name="confirmPassword" value={account.confirmPassword} onChange={(event) => updateAccount("confirmPassword", event.target.value)} type={showConfirmPassword ? "text" : "password"} minLength={8} maxLength={128} autoComplete="new-password" required aria-invalid={Boolean(fieldErrors.confirmPassword)} />
												<InputGroupAddon align="inline-end">
													<InputGroupButton
														type="button"
														size="icon-xs"
														aria-label={showConfirmPassword ? "Nascondi conferma password" : "Mostra conferma password"}
														aria-pressed={showConfirmPassword}
														title={showConfirmPassword ? "Nascondi conferma password" : "Mostra conferma password"}
														onClick={() => setShowConfirmPassword((visible) => !visible)}
													>
														{showConfirmPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
													</InputGroupButton>
												</InputGroupAddon>
											</InputGroup>
											<FieldError>{fieldErrors.confirmPassword}</FieldError>
										</Field>
										{state.message && <p role="alert" aria-live="polite" className="text-sm text-destructive">{state.message}</p>}
										<FieldDescription className="text-center">
											Hai già un account? <Link href={`/accedi?next=${encodeURIComponent(nextPath)}`}>Accedi</Link>
										</FieldDescription>
									</FieldGroup>
								)}

								{visibleStep === 2 && (
									<FieldSet>
										<FieldLegend variant="label">Seleziona il tuo profilo</FieldLegend>
										<FieldDescription>Questa scelta personalizza il prossimo passaggio.</FieldDescription>
										<RadioGroup
											value={profileType}
											onValueChange={(value) => {
												if (!isRegistrationProfileType(value)) return;
												setProfileType(value);
												setShowProfileTypeError(false);
											}}
											aria-invalid={showProfileTypeError}
											className="grid gap-3 sm:grid-cols-2"
										>
											{REGISTRATION_PROFILE_OPTIONS.map(({value, label, description: optionDescription, icon: Icon}) => (
												<FieldLabel key={value} htmlFor={`registration-type-${value}`}>
													<Field orientation="horizontal">
														<Icon aria-hidden="true" />
														<FieldContent>
															<FieldTitle>{label}</FieldTitle>
															<FieldDescription>{optionDescription}</FieldDescription>
														</FieldContent>
														<RadioGroupItem id={`registration-type-${value}`} value={value} aria-invalid={showProfileTypeError} />
													</Field>
												</FieldLabel>
											))}
										</RadioGroup>
										{showProfileTypeError && <FieldError>Seleziona una tipologia di profilo per continuare.</FieldError>}
									</FieldSet>
								)}

								{visibleStep === 3 && profileType && (
									<RegistrationProfileDetails
										type={profileType}
										draft={profileDrafts[profileType]}
										showErrors={showProfileDetailsErrors}
										onChange={updateProfileDraft}
									/>
								)}
							</CardContent>

							<CardFooter className={cn("flex gap-3", visibleStep === 1 ? "justify-end" : "justify-between")}>
								{visibleStep > 1 && (
									<Button type="button" variant="outline" size="lg" onClick={() => setStep(visibleStep === 3 ? 2 : 1)}>
										<ArrowLeftIcon data-icon="inline-start" />
										Indietro
									</Button>
								)}
								{visibleStep === 1 && (
									<Button type="button" size="lg" onClick={continueFromAccount}>
										Continua
										<ArrowRightIcon data-icon="inline-end" />
									</Button>
								)}
								{visibleStep === 2 && (
									<Button type="button" size="lg" onClick={continueFromProfileType}>
										Continua
										<ArrowRightIcon data-icon="inline-end" />
									</Button>
								)}
								{visibleStep === 3 && <SubmitButton />}
							</CardFooter>
						</Card>
					</form>
				</div>
			</div>
		</AuthBackground>
	);
}
