"use client";

import {professionalLocationsAllowed, PROFESSIONAL_REGIONS_EMPTY_MESSAGE} from "@/features/profilo/professional-regions";
import {type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {ClipboardPenIcon, MailCheckIcon} from "lucide-react";

import GradientBackground from "@/components/styling/GradientBackground";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {
	createProfileDrafts,
	createProfileLocations,
	type ProfileDrafts,
	type ProfileDraftUpdater,
	type ProfileLocationDraft,
	type ProfileLocations,
} from "@/features/profilo/profile-model";
import {birthMonthNumber, daysInBirthMonth, getItalyDateParts} from "@/features/profilo/birth-date";
import {createProfileSocialLinks, type ProfileSocialPlatform,} from "@/features/profilo/profile-social-links";
import AnnouncementDetailsForm from "@/features/pubblica-annuncio/components/AnnouncementDetailsForm";
import ConfermaInvioAnnuncio from "@/features/pubblica-annuncio/components/ConfermaInvioAnnuncio";
import PublishProfileStep from "@/features/pubblica-annuncio/components/PublishProfileStep";
import SelezionaTipologiaAnnuncio from "@/features/pubblica-annuncio/components/SelezionaTipologiaAnnuncio";
import {
	type AnnouncementContacts,
	type AnnouncementExtras,
	announcementRegionsAllowed,
	PROFESSIONAL_AREA_ERROR,
	cloneProfileDrafts,
	cloneProfileLocations,
	cloneProfileSocialLinks,
	createAnnouncementDetailsDrafts,
	getAnnouncementDetail,
	getAnnouncementValidationErrors,
	getDatabaseAnnouncementType,
	getProfileValidationErrors,
	isPublishableProfileType,
	isTeamAnnouncementSubtype,
	PUBLISH_PAYLOAD_VERSION,
	type PublishableProfileType,
	type PublishAnnouncementPayload,
	type PublishProfileContext,
	type TeamAnnouncementSubtype,
} from "@/features/pubblica-annuncio/publish-model";
import {normalizeFacilityOpeningHours} from "@/features/pubblica-annuncio/publish-field-validation";
import {getAnnouncementImageError} from "@/features/pubblica-annuncio/types/announcementExtras";

interface PubblicaAnnuncioProps {
	authenticated: boolean;
	registered: boolean;
	initialEmail: string;
	profileContext: PublishProfileContext | null;
}

function getMinorContactNotice(profileType: PublishableProfileType, drafts: ProfileDrafts) {
	if (profileType === "servizi-consulenze") return false;
	if (
		profileType !== "giocatore"
		&& profileType !== "staff-sportivo"
		&& profileType !== "arbitro"
	) return true;
	const draft = drafts[profileType];
	const year = Number(draft.anno_nascita);
	const month = birthMonthNumber(draft.mese_nascita);
	const day = Number(draft.giorno_nascita);
	if (!Number.isInteger(year) || year < 1900 || !month || !Number.isInteger(day) || day < 1 || day > daysInBirthMonth(year, month)) return true;
	const today = getItalyDateParts();
	let age = today.year - year;
	if (today.month < month || (today.month === month && today.day < day)) age--;
	return age < 18;
}

function PublishStepTab({value, locked, reason, resetKey, children}: {
	value: string;
	locked: boolean;
	reason: string;
	resetKey: string;
	children: ReactNode;
}) {
	const tab = <TabsTrigger value={value} disabled={locked} className="w-full">{children}</TabsTrigger>;
	if (!locked) return tab;
	return <Tooltip key={resetKey}>
		<TooltipTrigger render={<span className="w-full" />}>{tab}</TooltipTrigger>
		<TooltipContent><p>{reason}</p></TooltipContent>
	</Tooltip>;
}

export default function PubblicaAnnuncio(props: PubblicaAnnuncioProps) {
	const [visit, setVisit] = useState(0);
	useLayoutEffect(() => {
		const resetVisit = () => setVisit((previous) => previous + 1);
		const restoreVisit = (event: PageTransitionEvent) => {
			if (event.persisted) resetVisit();
		};
		window.addEventListener("pageshow", restoreVisit);
		return () => {
			window.removeEventListener("pageshow", restoreVisit);
			// Also runs when Next hides a cached route through Activity.
			resetVisit();
		};
	}, []);
	return <PublishAnnouncementForm key={`${props.profileContext?.profileId ?? props.initialEmail}:${props.registered}:${visit}`} {...props} />;
}

function PublishAnnouncementForm({
	authenticated,
	registered,
	initialEmail,
	profileContext,
}: PubblicaAnnuncioProps) {
	const [step, setStep] = useState(1);
	const [profileType, setProfileType] = useState<PublishableProfileType | "">("");
	const [teamSubtype, setTeamSubtype] = useState<TeamAnnouncementSubtype | null>(null);
	const [profileDrafts, setProfileDrafts] = useState<ProfileDrafts>(() => (
		registered && profileContext ? cloneProfileDrafts(profileContext.drafts) : createProfileDrafts()
	));
	const [profileLocations, setProfileLocations] = useState<ProfileLocations>(() => (
		registered && profileContext ? cloneProfileLocations(profileContext.locations) : createProfileLocations()
	));
	const [profileSocialLinks, setProfileSocialLinks] = useState(() => (
		registered && profileContext ? cloneProfileSocialLinks(profileContext.socialLinks) : createProfileSocialLinks()
	));
	const [announcementDrafts, setAnnouncementDrafts] = useState(createAnnouncementDetailsDrafts);
	const [announcementTitle, setAnnouncementTitle] = useState("");
	const [announcementLocations, setAnnouncementLocations] = useState<ProfileLocationDraft[]>([]);
	const [contacts, setContacts] = useState<AnnouncementContacts>({email: registered ? initialEmail : "", phone: "", contactRole: ""});
	const [extras, setExtras] = useState<AnnouncementExtras>({genericLink: ""});
	const [announcementImage, setAnnouncementImage] = useState<File | null>(null);
	const [announcementImagePreviewUrl, setAnnouncementImagePreviewUrl] = useState<string | null>(null);
	const announcementImagePreviewUrlRef = useRef<string | null>(null);
	const [profileUnlocked, setProfileUnlocked] = useState(false);
	const [submissionId, setSubmissionId] = useState(() => globalThis.crypto.randomUUID());
	const [profileValidationVisible, setProfileValidationVisible] = useState(false);
	const [announcementValidationVisible, setAnnouncementValidationVisible] = useState(false);
	const profileLocationSnapshot = useRef<string | null>(null);
	const enabledProfileTypes = registered ? profileContext?.enabledProfileTypes ?? [] : [];
	const authorizedRestrictedProfileTypes = registered ? profileContext?.authorizedRestrictedProfileTypes ?? [] : [];
	const profileDirty = Boolean(
		registered
		&& profileContext
		&& profileType
		&& JSON.stringify({
			draft: profileDrafts[profileType],
			locations: profileLocations[profileType],
			socialLinks: profileSocialLinks[profileType],
		}) !== JSON.stringify({
			draft: profileContext.drafts[profileType],
			locations: profileContext.locations[profileType],
			socialLinks: profileContext.socialLinks[profileType],
		}),
	);
	const imageError = getAnnouncementImageError(announcementImage);

	const professionalRegions = profileContext?.professionalRegions ?? [];
	const allProfileValidationErrors = profileType
		? getProfileValidationErrors(profileType, profileDrafts, profileLocations)
		: {};
	const profileValidationErrors = registered && (!profileUnlocked || !profileDirty)
		? {...allProfileValidationErrors, nationality: undefined}
		: allProfileValidationErrors;
	if (profileType === "servizi-consulenze" && !professionalLocationsAllowed(profileLocations[profileType], professionalRegions)) {
		profileValidationErrors.locations = professionalRegions.length === 0 ? PROFESSIONAL_REGIONS_EMPTY_MESSAGE : PROFESSIONAL_AREA_ERROR;
	}
	const profileValidationMessage = profileType
		? Object.values(profileValidationErrors).find(Boolean) ?? null
		: "Seleziona una tipologia di profilo.";
	const announcementValidationErrors = profileType
		? getAnnouncementValidationErrors(profileType, teamSubtype, announcementDrafts, announcementLocations, contacts, extras, announcementTitle, registered)
		: {};
	const allowedAnnouncementRegions = profileType === "servizi-consulenze"
		? professionalRegions
		: undefined;
	if (allowedAnnouncementRegions && !announcementRegionsAllowed(announcementLocations, allowedAnnouncementRegions)) {
		announcementValidationErrors.locations = PROFESSIONAL_AREA_ERROR;
	}
	const announcementValidationMessage = profileType
		? Object.values(announcementValidationErrors).find(Boolean) ?? null
		: "Seleziona una tipologia di profilo.";
	const step1Valid = profileType !== "" && (profileType !== "squadra" || teamSubtype !== null);
	const step2Valid = step1Valid && profileValidationMessage === null;
	const step3Valid = step2Valid && announcementValidationMessage === null && imageError === null;
	const tooltipResetKey = `${profileType}:${teamSubtype ?? ""}`;

	const payload = useMemo<PublishAnnouncementPayload | null>(() => {
		if (!profileType) return null;
		const announcementType = getDatabaseAnnouncementType(profileType, teamSubtype);
		const draftDetail = getAnnouncementDetail(profileType, teamSubtype, announcementDrafts);
		const detail = draftDetail && profileType === "creators"
			? {...draftDetail, titolo_post: announcementTitle.trim() || "Annuncio creator"}
			: draftDetail;
		if (!announcementType || !detail) return null;
		return {
			version: PUBLISH_PAYLOAD_VERSION,
			submissionId,
			visibility: "gratuito",
			profileType,
			teamSubtype,
			anonymousProfile: registered ? null : {
				type: profileType,
				draft: profileDrafts[profileType],
				locations: profileLocations[profileType],
				socialLinks: profileSocialLinks[profileType],
			},
			profileUpdate: registered && profileUnlocked && profileDirty ? {
				type: profileType,
				draft: profileDrafts[profileType],
				locations: profileLocations[profileType],
				socialLinks: profileSocialLinks[profileType],
			} : null,
			announcement: {
				type: announcementType,
				title: announcementTitle,
				detail,
				locations: profileType === "squadra" && teamSubtype === "cerca-sponsor" ? [] : announcementLocations,
				contacts,
				extras,
			},
			consents: {dataConfirmed: false, termsAccepted: false, privacyAccepted: false, newsletterSubscribed: false},
		};
	}, [announcementDrafts, announcementLocations, announcementTitle, contacts, extras, profileDirty, profileDrafts, profileLocations, profileSocialLinks, profileType, profileUnlocked, registered, submissionId, teamSubtype]);

	const scrollToTop = () => window.scrollTo({top: 0, behavior: "smooth"});
	const updateAnnouncementImage = (image: File | null) => {
		if (announcementImagePreviewUrlRef.current) URL.revokeObjectURL(announcementImagePreviewUrlRef.current);
		const nextPreviewUrl = image ? URL.createObjectURL(image) : null;
		announcementImagePreviewUrlRef.current = nextPreviewUrl;
		setAnnouncementImagePreviewUrl(nextPreviewUrl);
		setAnnouncementImage(image);
	};

	useEffect(() => () => {
		if (announcementImagePreviewUrlRef.current) URL.revokeObjectURL(announcementImagePreviewUrlRef.current);
	}, []);

	const goToStep = (nextStep: number) => {
		setStep(nextStep);
		scrollToTop();
	};

	const handleTabChange = (value: string) => {
		const targetStep = Number(value.replace("tab-", ""));
		if (targetStep === 2 && !step1Valid) return;
		if (targetStep === 3 && !step2Valid) return;
		if (targetStep === 4 && !step3Valid) return;
		goToStep(targetStep);
	};

	const handleProfileTypeChange = (value: string) => {
		if (!isPublishableProfileType(value)) return;
		if (registered && !enabledProfileTypes.includes(value)) return;
		if (value === profileType) return;
		resetCompilation();
		setProfileType(value);
		setTeamSubtype(null);
	};

	const resetCompilation = () => {
		setProfileDrafts(registered && profileContext ? cloneProfileDrafts(profileContext.drafts) : createProfileDrafts());
		setProfileLocations(registered && profileContext ? cloneProfileLocations(profileContext.locations) : createProfileLocations());
		setProfileSocialLinks(registered && profileContext ? cloneProfileSocialLinks(profileContext.socialLinks) : createProfileSocialLinks());
		setAnnouncementDrafts(createAnnouncementDetailsDrafts());
		setAnnouncementTitle("");
		setContacts({email: registered ? initialEmail : "", phone: "", contactRole: ""});
		setExtras({genericLink: ""});
		updateAnnouncementImage(null);
		setSubmissionId(globalThis.crypto.randomUUID());
		setStep(1);
		setProfileValidationVisible(false);
		setAnnouncementValidationVisible(false);
		setProfileUnlocked(false);
		setAnnouncementLocations([]);
		profileLocationSnapshot.current = null;
	};

	const updateProfileDraft: ProfileDraftUpdater = (type, field, value) => {
		setProfileDrafts((previous) => ({
			...previous,
			[type]: {...previous[type], [field]: value},
		}) as ProfileDrafts);
	};

	const updateProfileLocations = (type: PublishableProfileType, value: ProfileLocationDraft[]) => {
		setProfileLocations((previous) => ({...previous, [type]: value}));
	};

	const updateProfileSocialLinks = (type: PublishableProfileType, platform: ProfileSocialPlatform, value: string) => {
		setProfileSocialLinks((previous) => ({
			...previous,
			[type]: {...previous[type], [platform]: value},
		}));
	};

	const prepareAnnouncementStep = () => {
		if (!profileType || profileValidationMessage) {
			setProfileValidationVisible(true);
			return;
		}

		const sourceLocations = profileType === "campi-impianti-sportivi"
			? profileLocations[profileType].slice(0, 1)
			: profileLocations[profileType];
		const nextSnapshot = JSON.stringify(sourceLocations);
		if (profileLocationSnapshot.current !== nextSnapshot) {
			if (profileType !== "servizi-consulenze" || profileLocationSnapshot.current === null) {
				setAnnouncementLocations(structuredClone(sourceLocations));
			}
			profileLocationSnapshot.current = nextSnapshot;
		}

		setAnnouncementDrafts((previous) => {
			if (profileType === "giocatore" && previous.giocatore.categorie_ricercate.length === 0) {
				return {
					...previous,
					giocatore: {
						...previous.giocatore,
						categorie_ricercate: [...(profileDrafts.giocatore.categorie_ricercate ?? [])],
					},
				};
			}
			if (profileType === "torneo-evento" && previous.torneoEvento.tipologie_sport.length === 0) {
				return {
					...previous,
					torneoEvento: {...previous.torneoEvento, tipologie_sport: [...(profileDrafts["torneo-evento"].tipologie_sport ?? [])]},
				};
			}
			if (profileType === "campi-impianti-sportivi") {
				const facility = profileDrafts["campi-impianti-sportivi"];
				const openingHours = normalizeFacilityOpeningHours(facility.orari);
				return {
					...previous,
					campoImpianto: {
						...previous.campoImpianto,
						tipologie_sport: previous.campoImpianto.tipologie_sport.length === 0 ? [...(facility.tipologie_sport ?? []).slice(0, 1)] : previous.campoImpianto.tipologie_sport,
						orari: previous.campoImpianto.orari.length === 0 && openingHours ? openingHours : previous.campoImpianto.orari,
						costo_partenza: previous.campoImpianto.costo_partenza || (facility.costo_partenza === null ? "" : String(facility.costo_partenza)),
						servizi_inclusi: previous.campoImpianto.servizi_inclusi || facility.servizi_inclusi || "",
						indirizzo: previous.campoImpianto.indirizzo || facility.indirizzo || "",
					},
				};
			}
			return previous;
		});
		setProfileValidationVisible(false);
		goToStep(3);
	};

	const continueToConfirmation = () => {
		if (announcementValidationMessage || imageError) {
			setAnnouncementValidationVisible(true);
			return;
		}
		setAnnouncementValidationVisible(false);
		goToStep(4);
	};

	return (
		<GradientBackground className="min-h-screen bg-muted/30 py-16">
			<div className="relative z-10 mx-auto max-w-4xl px-4">
				<section className="mx-auto mb-4 max-w-3xl text-center sm:mb-8" aria-labelledby="publish-title">
					<div className="flex items-center justify-center gap-2">
						<ClipboardPenIcon className="size-7" />
						<h1 id="publish-title" className="text-2xl sm:text-4xl font-semibold tracking-tight text-foreground">Pubblica un annuncio</h1>
					</div>
					<p className="mt-3 text-base text-muted-foreground">
						Scegli la categoria, inserisci le informazioni e pubblica il tuo annuncio.</p>
				</section>

				{registered && enabledProfileTypes.length === 0 && (
					<Alert variant="destructive" className="mb-10">
						<AlertTitle>Nessun sottoprofilo disponibile</AlertTitle>
						<AlertDescription>Abilita o completa un sottoprofilo da <Link href="/il-tuo-profilo?sezione=profilo">Il tuo profilo</Link> prima di pubblicare.</AlertDescription>
					</Alert>
				)}

				<Tabs value={`tab-${step}`} onValueChange={handleTabChange}>
					<TabsList variant="line" className="grid w-full grid-cols-4">
						<TabsTrigger value="tab-1">
							<span className="hidden sm:block">1. Tipo annuncio</span>
							<span className="sm:hidden">Tipo</span>
						</TabsTrigger>
						<PublishStepTab value="tab-2" locked={!step1Valid} reason="Seleziona prima il tipo di annuncio." resetKey={tooltipResetKey}>
							<span className="hidden sm:block">2. Dati profilo</span>
							<span className="sm:hidden">Profilo</span>
						</PublishStepTab>
						<PublishStepTab value="tab-3" locked={!step2Valid} reason="Completa i dati essenziali del profilo." resetKey={tooltipResetKey}>
							<span className="hidden sm:block">3. Dati annuncio</span>
							<span className="sm:hidden">Annuncio</span>
						</PublishStepTab>
						<PublishStepTab value="tab-4" locked={!step3Valid} reason="Completa i dati dell’annuncio." resetKey={tooltipResetKey}>
							<span className="hidden sm:block">4. Conferma e invia</span>
							<span className="sm:hidden">Invia</span>
						</PublishStepTab>
					</TabsList>

					<TabsContent value="tab-1">
						<Card className="my-4 pt-4">
							<CardContent>
								{
									!registered && (
										<div className="mx-auto mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
											<MailCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
											<p>
												<strong>Pubblicazione senza profilo:</strong> prima dell’invio,
												verificheremo il tuo indirizzo email con un codice monouso. Senza
												profilo, è possibile pubblicare <b>massimo 1 annuncio</b> ogni 24 ore: {" "}
												<Link
													href={"/registrati"}
													className={"text-violet-800 underline decoration-violet-400 underline-offset-2"}
												>
													registrati per accedere a tutti i vantaggi!
												</Link>
											</p>
										</div>
									)
								}
								<SelezionaTipologiaAnnuncio
									tipologia={profileType}
									sottotipologia={teamSubtype ?? ""}
									onTipologiaChangeAction={handleProfileTypeChange}
									onSottotipologiaChangeAction={(value) => {
										if (!isTeamAnnouncementSubtype(value) || value === teamSubtype) return;
										resetCompilation();
										setTeamSubtype(value);
									}}
									onContinueAction={() => goToStep(2)}
									registered={registered}
										enabledProfileTypes={enabledProfileTypes}
										authorizedRestrictedProfileTypes={authorizedRestrictedProfileTypes}
								/>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="tab-2">
						<Card className="my-4 pt-6">
							<CardContent className="grid gap-8">
								{profileType && (
									<PublishProfileStep
										key={submissionId}
										profileType={profileType}
										registered={registered}
										unlocked={profileUnlocked}
										onUnlock={() => setProfileUnlocked(true)}
										drafts={profileDrafts}
										locations={profileLocations}
										professionalRegions={professionalRegions}
										onChange={updateProfileDraft}
										onLocationsChange={updateProfileLocations}
										socialLinks={profileSocialLinks[profileType]}
										onSocialLinksChange={(platform, value) => updateProfileSocialLinks(profileType, platform, value)}
										errors={profileValidationVisible ? profileValidationErrors : {}}
									/>
								)}
								<div className="flex justify-between gap-3">
									<Button variant="outline" onClick={() => goToStep(1)}>Indietro</Button>
									<Button onClick={prepareAnnouncementStep}>Avanti</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="tab-3">
						<Card className="my-4 pt-6">
							<CardContent className="grid gap-8">
								{profileType && (
									<AnnouncementDetailsForm
										key={submissionId}
										allowedRegions={allowedAnnouncementRegions}
										profileType={profileType}
										teamSubtype={teamSubtype}
										announcementTitle={announcementTitle}
										onAnnouncementTitleChange={setAnnouncementTitle}
										drafts={announcementDrafts}
										onDraftsChange={setAnnouncementDrafts}
										locations={announcementLocations}
										onLocationsChange={setAnnouncementLocations}
										contacts={contacts}
										onContactsChange={setContacts}
										registered={registered}
										showMinorContactNotice={getMinorContactNotice(profileType, profileDrafts)}
										extras={extras}
										onExtrasChange={setExtras}
										image={announcementImage}
										onImageChange={updateAnnouncementImage}
										errors={announcementValidationVisible ? announcementValidationErrors : {}}
									/>
								)}
								<div className="flex justify-between gap-3">
									<Button variant="outline" onClick={() => goToStep(2)}>Indietro</Button>
									<Button onClick={continueToConfirmation}>Avanti</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="tab-4">
						<Card className="my-4 pt-6">
							<CardContent>
								{payload && profileType && <ConfermaInvioAnnuncio key={submissionId} payload={payload} image={announcementImage} imagePreviewUrl={announcementImagePreviewUrl} profileDrafts={profileDrafts} authenticated={authenticated} registered={registered} onEditStep={goToStep} />}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</GradientBackground>
	);
}
