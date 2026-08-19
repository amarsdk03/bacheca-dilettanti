"use client";

import {type FormEvent, useActionState, useState} from "react";
import {useFormStatus} from "react-dom";
import Link from "next/link";
import {ArrowLeftIcon, ArrowRightIcon, CheckIcon, EyeIcon, EyeOffIcon, FlameIcon, UserPlusIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import GradientBackground from "@/components/styling/GradientBackground";
import LimitedProfileAvailability from "@/features/auth/LimitedProfileAvailability";
import RegistrationProfileDetails from "@/features/auth/RegistrationProfileDetails";
import {signUpWithPassword} from "@/features/auth/actions";
import {
	createRegistrationProfileDrafts,
	createRegistrationProfileRegions,
	getMissingRegistrationProfileFields,
	isLimitedRegistrationProfileType,
	isRegistrationProfileType,
	MAX_REGISTRATION_PROFILES,
	REGISTRATION_PROFILE_OPTIONS,
	type RegistrationProfileType,
} from "@/features/auth/registration-profile";
import {INITIAL_AUTH_STATE, type AuthActionState, type AuthFieldErrors} from "@/features/auth/types";
import {hasFieldErrors, validateRegistration} from "@/features/auth/validation";
import {cn} from "@/lib/utils";

interface RegistratiProps {
	nextPath: string;
	contactEmail: string;
}

type RegistrationStep = 1 | 2 | 3;

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

export default function Registrati({nextPath, contactEmail}: RegistratiProps) {
	const [state, formAction] = useActionState(signUpWithPassword, INITIAL_AUTH_STATE);
	const [step, setStep] = useState<RegistrationStep>(1);
	const [account, setAccount] = useState<AccountDraft>(INITIAL_ACCOUNT_DRAFT);
	const [showPassword, setShowPassword] = useState(false);
	const [clientFieldErrors, setClientFieldErrors] = useState<AuthFieldErrors>({});
	const [selectedProfileTypes, setSelectedProfileTypes] = useState<RegistrationProfileType[]>([]);
	const [primaryProfileType, setPrimaryProfileType] = useState<RegistrationProfileType | "">("");
	const [profileDrafts, setProfileDrafts] = useState(createRegistrationProfileDrafts);
	const [profileRegions, setProfileRegions] = useState(createRegistrationProfileRegions);
	const [profileSelectionError, setProfileSelectionError] = useState<string>();
	const [showPrimaryProfileError, setShowPrimaryProfileError] = useState(false);
	const [showProfileDetailsErrors, setShowProfileDetailsErrors] = useState(false);
	const [profileDetailIndex, setProfileDetailIndex] = useState(0);
	const [handledServerError, setHandledServerError] = useState<AuthActionState | null>(null);
	const visibleStep = state.status === "error" && state !== handledServerError ? 1 : step;

	const selectedProfilesInCatalogOrder = REGISTRATION_PROFILE_OPTIONS
		.map((option) => option.value)
		.filter((type) => selectedProfileTypes.includes(type));
	const limitedSelectedProfileTypes = selectedProfilesInCatalogOrder.filter(isLimitedRegistrationProfileType);
	const registrableProfileTypes: RegistrationProfileType[] = selectedProfilesInCatalogOrder.filter(
		(type) => !isLimitedRegistrationProfileType(type),
	);
	const orderedSelectedProfileTypes = primaryProfileType
		? [primaryProfileType, ...registrableProfileTypes.filter((type) => type !== primaryProfileType)]
		: registrableProfileTypes;
	const currentProfileType = orderedSelectedProfileTypes[profileDetailIndex];
	const currentProfile = REGISTRATION_PROFILE_OPTIONS.find((option) => option.value === currentProfileType);
	const isLastProfileDetail = profileDetailIndex === orderedSelectedProfileTypes.length - 1;
	const fieldErrors = {...state.fieldErrors, ...clientFieldErrors};

	const updateAccount = (field: keyof AccountDraft, value: string) => {
		setAccount((previous) => ({...previous, [field]: value}));
		setClientFieldErrors((previous) => ({...previous, [field]: undefined}));
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

	const continueFromAccount = () => {
		if (!validateAccountStep()) return;
		if (state.status === "error") setHandledServerError(state);
		setStep(2);
	};

	const toggleProfileType = (type: RegistrationProfileType, checked: boolean) => {
		if (checked && selectedProfileTypes.includes(type)) return;
		if (checked && selectedProfileTypes.length >= MAX_REGISTRATION_PROFILES) {
			setProfileSelectionError(`Puoi selezionare al massimo ${MAX_REGISTRATION_PROFILES} profili.`);
			return;
		}

		const nextSelectedProfileTypes = checked
			? [...selectedProfileTypes, type]
			: selectedProfileTypes.filter((selectedType) => selectedType !== type);
		const previousRegistrableProfiles: RegistrationProfileType[] = selectedProfileTypes.filter(
			(selectedType) => !isLimitedRegistrationProfileType(selectedType),
		);
		const nextRegistrableProfiles: RegistrationProfileType[] = nextSelectedProfileTypes.filter(
			(selectedType) => !isLimitedRegistrationProfileType(selectedType),
		);

		setSelectedProfileTypes(nextSelectedProfileTypes);
		setPrimaryProfileType((previousPrimary) => {
			if (nextRegistrableProfiles.length === 0) return "";
			if (nextRegistrableProfiles.length === 1) return nextRegistrableProfiles[0];
			if (previousRegistrableProfiles.length <= 1) return "";
			return nextRegistrableProfiles.includes(previousPrimary as RegistrationProfileType)
				? previousPrimary
				: "";
		});

		setProfileSelectionError(undefined);
		setShowPrimaryProfileError(false);
	};

	const continueFromProfileTypes = () => {
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
		setShowProfileDetailsErrors(false);
		setProfileDetailIndex(0);
		setStep(3);
	};

	const updateProfileDraft = (type: RegistrationProfileType, field: string, value: string) => {
		setProfileDrafts((previous) => ({
			...previous,
			[type]: {...previous[type], [field]: value},
		}));
	};

	const updateProfileRegions = (type: RegistrationProfileType, regions: string[]) => {
		setProfileRegions((previous) => ({...previous, [type]: regions}));
	};

	const continueFromProfileDetails = () => {
		if (!currentProfileType) return;

		if (getMissingRegistrationProfileFields(
			currentProfileType,
			profileDrafts[currentProfileType],
			profileRegions[currentProfileType],
		).length > 0) {
			setShowProfileDetailsErrors(true);
			return;
		}

		setShowProfileDetailsErrors(false);
		setProfileDetailIndex((previous) => previous + 1);
	};

	const goBack = () => {
		setShowProfileDetailsErrors(false);

		if (visibleStep === 3 && profileDetailIndex > 0) {
			setProfileDetailIndex((previous) => previous - 1);
			return;
		}

		setStep(visibleStep === 3 ? 2 : 1);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

		const firstInvalidProfileIndex = orderedSelectedProfileTypes.findIndex(
			(type) => getMissingRegistrationProfileFields(type, profileDrafts[type], profileRegions[type]).length > 0,
		);

		if (firstInvalidProfileIndex >= 0) {
			event.preventDefault();
			setShowProfileDetailsErrors(true);
			setProfileDetailIndex(firstInvalidProfileIndex);
			setStep(3);
		}
	};

	const title = visibleStep === 1
		? "Crea il tuo account"
		: visibleStep === 2
			? "Scegli i tuoi profili"
			: currentProfile?.label ?? "Completa i tuoi profili";
	const description = visibleStep === 1
		? "Registrati gratuitamente con email e password."
		: visibleStep === 2
			? "Seleziona le categorie che rappresentano meglio i tuoi interessi e obiettivi."
			: "Personalizza il tuo profilo compilando i seguenti campi. Potrai modificarli in qualsiasi momento.";

	return (
		<GradientBackground className="min-h-svh px-4 py-8 sm:px-6 md:py-10">
			<div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl flex-col">
				<div className="flex flex-1 items-start justify-center py-6">
					<form action={formAction} onSubmit={handleSubmit} className="w-full max-w-3xl">
						{visibleStep !== 1 && (
							<>
								<input type="hidden" name="email" value={account.email} />
								<input type="hidden" name="password" value={account.password} />
								<input type="hidden" name="confirmPassword" value={account.confirmPassword} />
							</>
						)}

						<Card className="bg-card/95 shadow-xl backdrop-blur-sm">
							<CardHeader className="flex flex-col items-stretch gap-8 pt-4">
								<RegistrationProgress step={visibleStep} />
								<div className="flex flex-col gap-1 text-center mb-4">
									{visibleStep === 3 && currentProfileType && (
										<div className="flex justify-center gap-2 mb-2">
											<Badge variant="secondary">Profilo {profileDetailIndex + 1} di {orderedSelectedProfileTypes.length}</Badge>
										</div>
									)}
									<CardTitle className="text-2xl font-medium">{title}</CardTitle>
									<CardDescription>{description}</CardDescription>
								</div>
							</CardHeader>

							<CardContent className="px-12 pb-8">
								{visibleStep === 1 && (
									<FieldGroup className="mx-auto max-w-xl">
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
										{state.message && <p role="alert" aria-live="polite" className="text-sm text-destructive">{state.message}</p>}
										<FieldDescription className="text-center">
											Hai già un account? <Link href={`/accedi?next=${encodeURIComponent(nextPath)}`}>Accedi</Link>
										</FieldDescription>
									</FieldGroup>
								)}

								{visibleStep === 2 && (
									<FieldGroup>
										<FieldSet>
											<FieldLegend variant="label">Seleziona i tuoi profili</FieldLegend>
											<FieldDescription>Puoi scegliere fino a un massimo di {MAX_REGISTRATION_PROFILES} tipologie, che potrai modificare in seguito.</FieldDescription>
											<Badge variant="secondary" className="w-fit">{selectedProfileTypes.length} di {MAX_REGISTRATION_PROFILES} selezionati</Badge>
											<FieldGroup data-slot="checkbox-group" className="grid gap-3 sm:grid-cols-2">
												{REGISTRATION_PROFILE_OPTIONS.map(({value, label, description: optionDescription, icon: Icon}) => {
													const checked = selectedProfileTypes.includes(value);
													const disabled = !checked && selectedProfileTypes.length >= MAX_REGISTRATION_PROFILES;

													return (
														<div key={value} className="relative">
															{
																(value === "professionisti-studi" || value === "creators") && (
																	<Badge
																		variant="destructive"
																		className="absolute -top-1 -right-2 flex items-center gap-1"
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
														if (!isRegistrationProfileType(value) || !registrableProfileTypes.includes(value)) return;
														setPrimaryProfileType(value);
														setShowPrimaryProfileError(false);
													}}
													aria-invalid={showPrimaryProfileError}
													className="grid gap-3 sm:grid-cols-2"
												>
													{REGISTRATION_PROFILE_OPTIONS.filter(({value}) => registrableProfileTypes.includes(value)).map(({value, label, icon: Icon}) => (
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
									<RegistrationProfileDetails
										type={currentProfileType}
										draft={profileDrafts[currentProfileType]}
										regions={profileRegions[currentProfileType]}
										showErrors={showProfileDetailsErrors}
										onChange={(field, value) => updateProfileDraft(currentProfileType, field, value)}
										onRegionsChange={(regions: string[]) => updateProfileRegions(currentProfileType, regions)}
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
								{visibleStep === 1 && (
									<Button type="button" size="lg" onClick={continueFromAccount}>
										Continua
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
