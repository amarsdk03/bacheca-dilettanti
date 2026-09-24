"use client";

import {useEffect, useMemo, useRef, useState} from "react";
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
import {createProfileSocialLinks, type ProfileSocialPlatform,} from "@/features/profilo/profile-social-links";
import AnnouncementDetailsForm from "@/features/pubblica-annuncio/components/AnnouncementDetailsForm";
import ConfermaInvioAnnuncio from "@/features/pubblica-annuncio/components/ConfermaInvioAnnuncio";
import PublishProfileStep from "@/features/pubblica-annuncio/components/PublishProfileStep";
import SelezionaTipologiaAnnuncio from "@/features/pubblica-annuncio/components/SelezionaTipologiaAnnuncio";
import {
	type AnnouncementContacts,
	type AnnouncementExtras,
	cloneProfileDrafts,
	cloneProfileLocations,
	cloneProfileSocialLinks,
	createAnnouncementDetailsDrafts,
	getAnnouncementDetail,
	getAnnouncementValidationErrors,
	getAnnouncementValidationMessage,
	getDatabaseAnnouncementType,
	getProfileValidationErrors,
	getProfileValidationMessage,
	isPublishableProfileType,
	isTeamAnnouncementSubtype,
	PUBLISH_PAYLOAD_VERSION,
	type PublishableProfileType,
	type PublishAnnouncementPayload,
	type PublishProfileContext,
	type TeamAnnouncementSubtype,
} from "@/features/pubblica-annuncio/publish-model";
import {getAnnouncementImageError} from "@/features/pubblica-annuncio/types/announcementExtras";

interface PubblicaAnnuncioProps {
	authenticated: boolean;
	registered: boolean;
	profileContext: PublishProfileContext | null;
}

export default function PubblicaAnnuncio({
	authenticated,
	registered,
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
	const [announcementLocations, setAnnouncementLocations] = useState<ProfileLocationDraft[]>([]);
	const [contacts, setContacts] = useState<AnnouncementContacts>({email: "", phone: ""});
	const [extras, setExtras] = useState<AnnouncementExtras>({genericLink: "", videoHighlights: ""});
	const [announcementImage, setAnnouncementImage] = useState<File | null>(null);
	const [announcementImagePreviewUrl, setAnnouncementImagePreviewUrl] = useState<string | null>(null);
	const announcementImagePreviewUrlRef = useRef<string | null>(null);
	const [profileUnlocked, setProfileUnlocked] = useState(false);
	const [submissionId] = useState(() => globalThis.crypto.randomUUID());
	const [profileValidationVisible, setProfileValidationVisible] = useState(false);
	const [announcementValidationVisible, setAnnouncementValidationVisible] = useState(false);
	const profileLocationSnapshot = useRef<string | null>(null);
	const enabledProfileTypes = registered ? profileContext?.enabledProfileTypes ?? [] : [];
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

	const profileValidationErrors = profileType
		? getProfileValidationErrors(profileType, profileDrafts, profileLocations)
		: {};
	const profileValidationMessage = profileType
		? getProfileValidationMessage(profileType, profileDrafts, profileLocations)
		: "Seleziona una tipologia di profilo.";
	const announcementValidationErrors = profileType
		? getAnnouncementValidationErrors(profileType, teamSubtype, announcementDrafts, announcementLocations, contacts, extras)
		: {};
	const announcementValidationMessage = profileType
		? getAnnouncementValidationMessage(profileType, teamSubtype, announcementDrafts, announcementLocations, contacts, extras)
		: "Seleziona una tipologia di profilo.";
	const step1Valid = profileType !== "" && (profileType !== "squadra" || teamSubtype !== null);
	const step2Valid = step1Valid && profileValidationMessage === null;
	const step3Valid = step2Valid && announcementValidationMessage === null && imageError === null;

	const payload = useMemo<PublishAnnouncementPayload | null>(() => {
		if (!profileType) return null;
		const announcementType = getDatabaseAnnouncementType(profileType, teamSubtype);
		const detail = getAnnouncementDetail(profileType, teamSubtype, announcementDrafts);
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
				detail,
				locations: announcementLocations,
				contacts,
				extras,
			},
			consents: {dataConfirmed: false, termsAccepted: false, privacyAccepted: false},
		};
	}, [announcementDrafts, announcementLocations, contacts, extras, profileDirty, profileDrafts, profileLocations, profileSocialLinks, profileType, profileUnlocked, registered, submissionId, teamSubtype]);

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
		setProfileType(value);
		setTeamSubtype(null);
		setProfileValidationVisible(false);
		setAnnouncementValidationVisible(false);
		setProfileUnlocked(false);
		if (value !== "giocatore") {
			setExtras((previous) => ({...previous, videoHighlights: ""}));
		}
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

		const sourceLocations = profileLocations[profileType];
		const nextSnapshot = JSON.stringify(sourceLocations);
		if (profileLocationSnapshot.current !== nextSnapshot) {
			setAnnouncementLocations(structuredClone(sourceLocations));
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
			if (profileType === "campi-impianti-sportivi" && previous.campoImpianto.tipologie_sport.length === 0) {
				const facility = profileDrafts["campi-impianti-sportivi"];
				return {
					...previous,
					campoImpianto: {
						...previous.campoImpianto,
						tipologie_sport: [...(facility.tipologie_sport ?? [])],
						costo_partenza: facility.costo_partenza === null ? "" : String(facility.costo_partenza),
						servizi_inclusi: facility.servizi_inclusi ?? "",
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
						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-2" disabled={!step1Valid} className="w-full">
									<span className="hidden sm:block">2. Dati profilo</span>
									<span className="sm:hidden">Profilo</span>
								</TabsTrigger>
							</TooltipTrigger>
							{!step1Valid && <TooltipContent><p>Seleziona prima il tipo di annuncio.</p></TooltipContent>}
						</Tooltip>
						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-3" disabled={!step2Valid} className="w-full">
									<span className="hidden sm:block">3. Dati annuncio</span>
									<span className="sm:hidden">Annuncio</span>
								</TabsTrigger>
							</TooltipTrigger>
							{!step2Valid && <TooltipContent><p>Completa i dati essenziali del profilo.</p></TooltipContent>}
						</Tooltip>
						<Tooltip>
							<TooltipTrigger render={<span className="w-full" />}>
								<TabsTrigger value="tab-4" disabled={!step3Valid} className="w-full">
									<span className="hidden sm:block">4. Conferma e invia</span>
									<span className="sm:hidden">Invia</span>
								</TabsTrigger>
							</TooltipTrigger>
							{!step3Valid && <TooltipContent><p>Completa i dati dell’annuncio.</p></TooltipContent>}
						</Tooltip>
					</TabsList>

					<TabsContent value="tab-1">
						<Card className="my-4 pt-4">
							<CardContent>
								{
									!registered && (
										<div className="mx-auto mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
											<MailCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
											<p>
												<strong>Pubblicazione senza profilo:</strong> prima dell’invio, verificheremo il tuo indirizzo
												email con un codice monouso. Senza profilo, è possibile pubblicare <b>massimo 1 annuncio</b> ogni 24 ore.
											</p>
										</div>
									)
								}
								<SelezionaTipologiaAnnuncio
									tipologia={profileType}
									sottotipologia={teamSubtype ?? ""}
									onTipologiaChangeAction={handleProfileTypeChange}
									onSottotipologiaChangeAction={(value) => isTeamAnnouncementSubtype(value) && setTeamSubtype(value)}
									onContinueAction={() => goToStep(2)}
									registered={registered}
									enabledProfileTypes={enabledProfileTypes}
								/>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="tab-2">
						<Card className="my-4 pt-6">
							<CardContent className="grid gap-8">
								{profileType && (
									<PublishProfileStep
										profileType={profileType}
										registered={registered}
										unlocked={profileUnlocked}
										onUnlock={() => setProfileUnlocked(true)}
										drafts={profileDrafts}
										locations={profileLocations}
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
										profileType={profileType}
										teamSubtype={teamSubtype}
										drafts={announcementDrafts}
										onDraftsChange={setAnnouncementDrafts}
										locations={announcementLocations}
										onLocationsChange={setAnnouncementLocations}
										contacts={contacts}
										onContactsChange={setContacts}
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
								{payload && profileType && <ConfermaInvioAnnuncio payload={payload} image={announcementImage} imagePreviewUrl={announcementImagePreviewUrl} profileDrafts={profileDrafts} authenticated={authenticated} onEditStep={goToStep} />}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</GradientBackground>
	);
}
