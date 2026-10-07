"use client";

import {type CSSProperties, type ReactNode, useActionState, useState, useTransition} from "react";
import {useFormStatus} from "react-dom";
import Link from "next/link";
import {
	ArrowRightIcon,
	BadgeCheckIcon,
	CheckIcon,
	CircleHelpIcon,
	ClipboardPenIcon,
	EyeIcon,
	EyeOffIcon,
	FileTextIcon,
	HeartIcon,
	InfoIcon,
	KeyRoundIcon,
	ListChecksIcon,
	LoaderCircleIcon, LockIcon,
	LogOutIcon,
	MailIcon,
	MapPinIcon,
	PencilIcon,
	PlusIcon,
	SettingsIcon,
	ShieldCheckIcon,
	StarIcon,
	Trash2Icon,
	UserRoundIcon,
	UsersIcon,
} from "lucide-react";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger,} from "@/components/ui/accordion";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Badge} from "@/components/ui/badge";
import {Button, buttonVariants} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldContent, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import AnnouncementViewLink from "@/features/annunci/AnnouncementViewLink";
import {isAnnouncementListed} from "@/features/annunci/announcement-visibility";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,} from "@/components/ui/empty";
import {Separator} from "@/components/ui/separator";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {toast} from "@/components/ui/toast";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Progress, ProgressLabel, ProgressValue} from "@/components/ui/progress";
import GradientBackground from "@/components/styling/GradientBackground";
import ProfileSectionNavigation from "@/components/navigation/ProfileSectionNavigation";
import {CONTACT_EMAIL} from "@/const/contactConstants";
import {announcementOption} from "@/features/annunci/announcement-model";
import {requestCurrentUserPasswordReset, signOut} from "@/features/auth/server/actions";
import {
	isComingSoonProfileType,
	isRestrictedProfileType,
	MAX_PROFILE_COUNT,
	PROFILE_OPTIONS,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";
import {getProfileCompletion} from "@/features/profilo/profile-completion";
import ComingSoonBadge from "@/features/profilo/ComingSoonBadge";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {INITIAL_AUTH_STATE, type ViewerDTO} from "@/features/auth/types";
import ProfileEditorDialog from "@/features/profilo/ProfileEditorDialog";
import ProfileImageEditor from "@/features/profilo/ProfileImageEditor";
import {
	removeAnnouncement,
	removeProfile,
	saveProfile,
	setAnnouncementVisibility,
	setNewsletterSubscription,
	setPrimaryProfile,
} from "@/features/profilo/server/actions";
import type {
	AnnouncementFilter,
	ManagedAnnouncement,
	ManagedProfile,
	ProfileDashboardData,
	ProfileDashboardSection,
	ProfileEditorSavePayload,
	ProfileMutationResult,
} from "@/features/profilo/types";
import {RelationshipsSection, SavedAnnouncementsSection} from "@/features/interazioni/DashboardSections";
import InviteFriendDialog from "@/features/inviti/InviteFriendDialog";

const DASHBOARD_ITEMS = [
	{value: "profilo", label: "Il tuo profilo", icon: UserRoundIcon},
	{value: "annunci", label: "I tuoi annunci", icon: ListChecksIcon},
	{value: "salvati", label: "Annunci salvati", icon: HeartIcon},
	{value: "relazioni", label: "Follower e seguiti", icon: UsersIcon},
	{value: "impostazioni", label: "Impostazioni", icon: SettingsIcon},
	{value: "info", label: "FAQ", icon: CircleHelpIcon},
] as const;

interface FaqItem {
	value: string;
	question: string;
	answer: ReactNode;
}

interface FaqGroup {
	id: string;
	title: string;
	description: string;
	items: readonly FaqItem[];
}

const FAQ_GROUPS = [
	{
		id: "profiles",
		title: "Profili e sottoprofili",
		description: "Gestione delle diverse identità con cui puoi presentarti sulla piattaforma.",
		items: [
			{
				value: "profile-count",
				question: "Quanti sottoprofili posso creare?",
				answer: "Puoi configurare fino a cinque sottoprofili ordinari, uno per ciascuna tipologia. Servizi e consulenze e Creators sono due profili riservati che possono aggiungersi a questo limite, se abilitati dall’admin: puoi quindi arrivare a sette sottoprofili complessivi. Puoi scegliere quale rendere principale.",
			},
			{
				value: "profile-manage",
				question: "Come abilito o modifico un sottoprofilo?",
				answer: "Nella sezione Il tuo profilo seleziona Abilita su una tipologia disponibile oppure Modifica su un sottoprofilo già configurato. Per un profilo riservato autorizzato dall’admin, usa Completa profilo. Compila i campi obbligatori e salva le modifiche; puoi aggiungere in seguito le informazioni facoltative, come esperienze, qualifiche e tipologie calcio quando previste.",
			},
			{
				value: "restricted-profiles",
				question: "Perché Servizi e consulenze e Creators mostrano Accesso limitato?",
				answer: (
					<>
						Queste tipologie possono essere abilitate soltanto dall’admin e non sono selezionabili durante la registrazione. Se vuoi richiedere l’accesso, scrivici dalla <Link href="/contatti">pagina Contatti</Link>. Dopo l’abilitazione puoi completare il sottoprofilo e pubblicare i relativi annunci, anche se hai già cinque sottoprofili ordinari.
					</>
				),
			},
			{
				value: "profile-remove",
				question: "Cosa succede se rimuovo un sottoprofilo?",
				answer: "Deve rimanere attivo almeno un sottoprofilo ordinario. Se rimuovi quello principale, un altro sottoprofilo attivo verrà promosso automaticamente; gli annunci già pubblicati resteranno disponibili. Se elimini Servizi e consulenze o Creators, viene revocata anche l’abilitazione: per ricrearlo servirà un nuovo intervento dell’admin.",
			},
			{
				value: "profile-completion",
				question: "A cosa serve la percentuale di completamento?",
				answer: "Indica quanto sono complete le informazioni del sottoprofilo in base alla sua tipologia. Usa Modifica per aggiungere i dati mancanti. Nella directory Profili vengono mostrati prima i sottoprofili più completi; a parità di completamento, quelli con attività significativa più recente, come modifiche delle informazioni o pubblicazione e aggiornamento degli annunci. Il semplice accesso non influisce sull’ordinamento.",
			},
			{
				value: "profile-images-social",
				question: "Posso personalizzare foto e link Social dei sottoprofili?",
				answer: "Sì. Puoi impostare una foto per l’account e una foto dedicata per ciascun sottoprofilo, oppure scegliere l’avatar predefinito per quel sottoprofilo. Nel form di modifica puoi aggiungere sito web, Instagram, Facebook, YouTube e LinkedIn. Inserisci link completi dei canali che vuoi condividere.",
			},
		],
	},
	{
		id: "announcements",
		title: "Annunci",
		description: "Pubblicazione, revisione e gestione delle opportunità in bacheca.",
		items: [
			{
				value: "profile-vs-announcement",
				question: "Qual è la differenza tra profilo e annuncio?",
				answer: "Il profilo presenta in modo stabile la tua identità, esperienza e disponibilità. Un annuncio descrive invece una singola opportunità, ricerca o proposta pubblicata nella bacheca con dettagli e contatti dedicati.",
			},
			{
				value: "announcement-review",
				question: "Cosa succede dopo aver inviato un annuncio?",
				answer: "L’annuncio viene inviato gratuitamente in revisione. Puoi controllarne lo stato nella sezione I tuoi annunci. Comparirà nella bacheca pubblica dopo l’approvazione.",
			},
			{
				value: "announcement-profile-update",
				question: "Posso aggiornare il profilo mentre pubblico un annuncio?",
				answer: "Sì. Nella fase Dati profilo vengono caricate le informazioni del sottoprofilo selezionato. Premi Sblocca campi per modificarle: le modifiche saranno salvate insieme all’invio finale dell’annuncio. Per aggiornarle senza pubblicare, usa Modifica nell’area personale.",
			},
			{
				value: "announcement-limits",
				question: "Quali limiti ci sono per la pubblicazione?",
				answer: "Per pubblicare dal tuo account devi avere un sottoprofilo attivo della tipologia scelta. Servizi e consulenze e Creators richiedono l’abilitazione admin e consentono pubblicazioni illimitate. Come ospite puoi pubblicare al massimo un annuncio ogni 24 ore, verificando l’indirizzo email con un codice monouso; i due profili riservati sono disponibili soltanto per account registrati abilitati.",
			},
			{
				value: "announcement-priority",
				question: "La pubblicazione è gratuita? Posso scegliere un annuncio prioritario?",
				answer: "La pubblicazione è gratuita. Al momento non è possibile acquistare nuovi annunci prioritari. Il pagamento resta disponibile soltanto per eventuali bozze prioritarie create prima della sospensione di questa opzione.",
			},
			{
				value: "announcement-edit",
				question: "Posso modificare un annuncio pubblicato?",
				answer: "No. Puoi nasconderlo temporaneamente oppure eliminarlo. Per cambiare i contenuti devi pubblicare un nuovo annuncio. Le modifiche successive al sottoprofilo non sostituiscono i dati dell’annuncio già inviato.",
			},
			{
				value: "announcement-visibility",
				question: "Cosa succede quando nascondo un annuncio?",
				answer: "L’annuncio resta nella tua area personale e viene escluso dalla bacheca e dalle ricerche. Il link resta consultabile, ma i recapiti sono visibili solo agli utenti autenticati. Puoi mostrarlo nuovamente in qualsiasi momento.",
			},
		],
	},
	{
		id: "discovery",
		title: "Ricerca e interazioni",
		description: "Trova opportunità, salva annunci e segui i profili che ti interessano.",
		items: [
			{
				value: "search-filters",
				question: "Come cerco annunci e profili adatti a me?",
				answer: "Apri Annunci o Profili, cerca per parole chiave e seleziona una tipologia. Il pulsante Filtri apre le opzioni dedicate a quella tipologia, per esempio regione, ruolo o tipologia calcio. I filtri specifici richiedono una sola tipologia selezionata. Negli annunci Giocatore puoi filtrare anche per genere, categorie ricercate e intervallo di annate.",
			},
			{
				value: "saved-announcements",
				question: "Dove ritrovo gli annunci salvati?",
				answer: "Da un annuncio usa il pulsante per salvarlo. Lo ritroverai nella sezione Salvati dell’area personale, da cui puoi anche rimuoverlo dall’elenco. Salvare un annuncio non invia una candidatura o un messaggio all’autore.",
			},
			{
				value: "profile-followers",
				question: "Come seguo un profilo e dove vedo i follower?",
				answer: "Apri il dettaglio del sottoprofilo e premi Segui profilo. Se hai più sottoprofili disponibili, scegli con quale seguire; se ne hai uno solo, il Follow è immediato. Puoi effettuare al massimo 30 nuovi Follow al giorno per account e seguire ciascun sottoprofilo con una sola identità. Nella sezione Follower e seguiti puoi vedere chi ti segue, chi segui e con quale sottoprofilo, e interrompere il Follow quando vuoi.",
			},
			{
				value: "private-follower-count",
				question: "Perché non vedo il numero di follower?",
				answer: "Al lancio il conteggio resterà privato, anche se la funzione Follow sarà già attiva. Verrà reso pubblico più avanti, quando la community sarà sufficientemente ampia da rendere il dato significativo.",
			},
			{
				value: "contacts-author",
				question: "Come contatto l’autore di un annuncio?",
				answer: "Accedi al tuo account e consulta i recapiti nella sezione Contatti del dettaglio annuncio. Puoi usare l’email o il telefono indicati dall’autore. Apri profilo permette di conoscere il suo sottoprofilo; per gli annunci pubblicati come ospite trovi invece Info autore. Anche i link Social nei dettagli dei profili sono accessibili agli utenti autenticati.",
			},
		],
	},
	{
		id: "account",
		title: "Account e assistenza",
		description: "Accesso, preferenze di comunicazione e richieste allo staff.",
		items: [
			{
				value: "password",
				question: "Come cambio la password?",
				answer: "Apri Impostazioni e richiedi il link di ripristino. Riceverai un’email all’indirizzo associato al tuo account.",
			},
			{
				value: "newsletter-preferences",
				question: "Come cambio la preferenza per newsletter e comunicazioni promozionali?",
				answer: "Apri Impostazioni e usa la spunta nella card Notizie e comunicazioni. La scelta è facoltativa e viene salvata quando la modifichi. Puoi attivarla o disattivarla in qualsiasi momento.",
			},
			{
				value: "profile-verification",
				question: "Cosa distingue Utente registrato da Profilo verificato ufficialmente?",
				answer: "Il badge Utente registrato indica che l’indirizzo email dell’account è stato verificato. La spunta di verifica ufficiale è un riconoscimento distinto, assegnato dall’amministrazione, e non si ottiene automaticamente registrandosi o completando il profilo.",
			},
			{
				value: "account-removal",
				question: "Come posso eliminare il mio account e i miei dati?",
				answer: (
					<>
						La cancellazione completa viene gestita dallo staff. Apri la <Link href="/contatti">pagina Contatti</Link> e scrivici tramite Instagram o WhatsApp: ti indicheremo i passaggi necessari per completare la richiesta.
					</>
				),
			},
			{
				value: "report-content",
				question: "Come segnalo un problema o un contenuto inappropriato?",
				answer: (
					<>
						Per un annuncio o un profilo usa Segnala nella pagina di dettaglio: puoi aggiungere una motivazione facoltativa e la segnalazione verrà valutata dal team. Per problemi tecnici scrivi a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> oppure usa la <Link href="/contatti">pagina Contatti</Link>, indicando il link e una descrizione del problema.
					</>
				),
			},
		],
	},
] as const satisfies readonly FaqGroup[];

const DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "2-digit",
	month: "long",
	year: "numeric",
	timeZone: "Europe/Rome",
});

type ProfileEditorState =
	| {mode: "add"; profileType: ProfileType}
	| {mode: "edit"; profileType: ProfileType};

interface IlTuoProfiloProps {
	viewer: ViewerDTO;
	data: ProfileDashboardData;
	passwordUpdated: boolean;
	initialSection: ProfileDashboardSection;
}

function isDashboardSection(value: string | null): value is ProfileDashboardSection {
	return DASHBOARD_ITEMS.some((item) => item.value === value);
}

function isAnnouncementFilter(value: string): value is AnnouncementFilter {
	return value === "all" || value === "visible" || value === "hidden";
}

function formatDate(value: string | null) {
	if (!value) return "Non disponibile";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "Non disponibile" : DATE_FORMATTER.format(date);
}

function moderationLabel(value: string | null) {
	if (value === "in_attesa_pagamento") return "Pagamento da completare";
	if (value === "in_revisione") return "In revisione";
	if (value === "pubblicato") return "Pubblicato";
	if (value === "rifiutato") return "Non approvato";
	return value ? value.replaceAll("_", " ") : "Stato non disponibile";
}

function moderationVariant(value: string | null): "default" | "secondary" | "destructive" | "outline" {
	if (value === "pubblicato") return "default";
	if (value === "rifiutato") return "destructive";
	if (value === "in_revisione") return "secondary";
	if (value === "in_attesa_pagamento") return "outline";
	return "outline";
}

function LogoutButton() {
	const {pending} = useFormStatus();

	return (
		<Button
			type="submit"
			variant="ghost"
			size="sm"
			disabled={pending}
		>
			{pending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" /> : <LogOutIcon data-icon="inline-start" aria-hidden="true" />}
			{pending ? "Logout in corso…" : "Logout"}
		</Button>
	);
}

function DashboardNavigation({section}: {section: ProfileDashboardSection}) {
	return (
		<ProfileSectionNavigation activeValue={section} className="profile-dashboard-navigation">
			<TabsList variant="line" className="profile-dashboard-tab-list profile-section-tab-list" aria-label="Sezioni dell’area personale">
				{DASHBOARD_ITEMS.map(({value, label, icon: Icon}) => (
					<TabsTrigger key={value} value={value} data-dashboard-section={value} className="profile-dashboard-tab profile-section-tab">
						<Icon data-icon="inline-start" aria-hidden="true" />
						{label}
					</TabsTrigger>
				))}
			</TabsList>
		</ProfileSectionNavigation>
	);
}

function AccountOverview({viewer, imageUrl, hasMainImage, profiles, invitationCode, confirmedInvitations}: {
	viewer: ViewerDTO;
	imageUrl: string | null;
	hasMainImage: boolean;
	profiles: ManagedProfile[];
	invitationCode: string;
	confirmedInvitations: number;
}) {
	const primaryProfile = profiles.find(({isPrimary}) => isPrimary);
	const primaryLabel = PROFILE_OPTIONS.find(({value}) => value === primaryProfile?.type)?.label;

	return (
		<Card className="profile-dashboard-card profile-dashboard-overview">
			<CardHeader className="gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
				<div className="flex min-w-0 items-center gap-4 sm:gap-5">
					<ProfileImageEditor
						scope="main"
						imageUrl={imageUrl ?? viewer.avatarUrl}
						hasCustomImage={hasMainImage}
						fallback={<span>{viewer.initials}</span>}
						title="Foto profilo principale"
						description="Questa foto rappresenta il tuo account e può essere usata anche dai sottoprofili senza foto dedicata."
						alt={`Foto profilo di ${viewer.fullName}`}
						avatarClassName="size-16 text-lg sm:size-20 sm:text-xl"
					/>
					<div className="flex min-w-0 flex-col gap-1.5">
						<p className="profile-dashboard-eyebrow">Area personale</p>
						<h1 className="wrap-anywhere text-2xl font-semibold tracking-tight sm:text-3xl">{viewer.fullName}</h1>
						<CardDescription className="break-all">{viewer.email}</CardDescription>
					</div>
				</div>
				<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
					<Button variant={"outline"} render={<Link href="/pubblica-annuncio" />} nativeButton={false} className="min-h-11 px-5">
						<ClipboardPenIcon data-icon="inline-start" className="ms-3" aria-hidden="true" />
						Pubblica annuncio
					</Button>
					<InviteFriendDialog code={invitationCode} confirmedCount={confirmedInvitations} />
				</div>
			</CardHeader>
			<CardFooter className="flex-wrap gap-x-3 gap-y-2">
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
					<Badge variant="secondary"><ShieldCheckIcon data-icon="inline-start" aria-hidden="true" /> Account autenticato</Badge>
					{primaryLabel && (
						<Badge variant="outline" className="max-w-full" title={`Profilo principale: ${primaryLabel}`}>
							<StarIcon data-icon="inline-start" aria-hidden="true" /><span className="truncate">Principale: {primaryLabel}</span>
						</Badge>
					)}
					<span className="text-xs text-muted-foreground ms-2 mt-0.5"><span className="font-medium text-foreground">{profiles.filter(({type}) => !isRestrictedProfileType(type)).length}/{MAX_PROFILE_COUNT}</span> sottoprofili ordinari{profiles.some(({type}) => isRestrictedProfileType(type)) && ` · ${profiles.filter(({type}) => isRestrictedProfileType(type)).length} riservati`}</span>
				</div>
				<form action={signOut} className="ml-auto"><LogoutButton /></form>
			</CardFooter>
		</Card>
	);
}

function ProfileCard({
	profile,
	drafts,
	locations,
	onEdit,
	onMakePrimary,
	onRemove,
}: {
	profile: ManagedProfile;
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onEdit: () => void;
	onMakePrimary: () => Promise<ProfileMutationResult>;
	onRemove: () => Promise<ProfileMutationResult>;
}) {
	const option = PROFILE_OPTIONS.find(({value}) => value === profile.type);
	const accent = getProfileAccent(profile.type);
	const profileCompletion = getProfileCompletion(profile.type, drafts, locations);
	const [removeOpen, setRemoveOpen] = useState(false);
	const [pendingAction, setPendingAction] = useState<"primary" | "remove" | null>(null);
	const [pending, startTransition] = useTransition();

	const runMutation = (
		action: "primary" | "remove",
		mutation: () => Promise<ProfileMutationResult>,
	) => {
		setPendingAction(action);
		startTransition(async () => {
			try {
				const result = await mutation();
				toast.add({
					title: result.status === "success"
						? action === "primary" ? "Profilo principale aggiornato" : "Profilo rimosso"
						: "Modifica non riuscita",
					description: result.message,
					type: result.status,
				});
				if (result.status === "success" && action === "remove") {
					setRemoveOpen(false);
				}
			} catch {
				toast.add({
					title: "Modifica non riuscita",
					description: "La richiesta non è stata completata. Riprova.",
					type: "error",
				});
			} finally {
				setPendingAction(null);
			}
		});
	};

	return (
		<Card className="profile-dashboard-card profile-dashboard-interactive-card profile-dashboard-subprofile-card h-full" style={{"--profile-accent": accent} as CSSProperties}>
			<CardHeader className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<ProfileImageEditor
						scope={profile.type}
						imageUrl={profile.imageUrl}
						hasCustomImage={profile.hasCustomImage}
						fallback={<ProfilePngIcon type={profile.type} color={accent} className="size-7" />}
						title={`Foto profilo ${option?.label ?? "sottoprofilo"}`}
						description="Puoi usare una foto dedicata o mostrare l’avatar predefinito solo per questo sottoprofilo."
						alt={`Foto del profilo ${option?.label ?? profile.type}`}
						avatarClassName="size-12"
					/>
					<div className="min-w-0">
						<CardTitle className="wrap-anywhere">{option?.label}</CardTitle>
						{isRestrictedProfileType(profile.type) && <Badge variant="outline" className="mt-1">
                            <LockIcon /> Accesso limitato
						</Badge>}
					</div>
				</div>
				{
					profile.isPrimary ? (
						<Badge variant="secondary" className="profile-dashboard-type-badge"><StarIcon data-icon="inline-start" aria-hidden="true" /> Principale</Badge>
					) : (
						<Badge variant="outline"><CheckIcon data-icon="inline-start" aria-hidden="true" /> Attivo</Badge>
					)
				}
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-5">
				<p className="leading-6 text-muted-foreground">
					{option?.description}
				</p>
				<div className="mt-auto flex flex-col gap-2">
					<Progress value={profileCompletion.percentage} indicatorStyle={{backgroundColor: accent}}>
						<ProgressLabel>Completamento profilo</ProgressLabel>
						<ProgressValue />
					</Progress>
					<p className="text-xs leading-5 text-muted-foreground">
						{profileCompletion.percentage === 100
							? "Profilo completo: ben fatto!"
							: `${profileCompletion.completed} di ${profileCompletion.total} informazioni completate. Arricchisci il profilo per farti conoscere meglio.`}
					</p>
				</div>
			</CardContent>
			<CardFooter className="flex flex-wrap justify-between gap-2">
				<div>
					{!profile.isPrimary && (
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => runMutation("primary", onMakePrimary)}
							disabled={pending}
							aria-label={`Imposta ${option?.label ?? profile.type} come profilo principale`}
							title="Imposta come principale"
						>
							{pending && pendingAction === "primary"
								? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />
								: <StarIcon data-icon="inline-start" aria-hidden="true" />}
						</Button>
					)}
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					<Tooltip>
						<TooltipTrigger render={<Link
							href={`/dettagli-profilo?${new URLSearchParams({id: profile.profileId, type: profile.type})}`}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonVariants({variant: "outline", size: "icon"})}
							aria-label={`Visualizza il profilo ${option?.label ?? profile.type} (si apre in una nuova scheda)`}
						/>}>
							<EyeIcon aria-hidden="true" />
						</TooltipTrigger>
						<TooltipContent>Visualizza profilo</TooltipContent>
					</Tooltip>
					<Button type="button" variant="outline" onClick={onEdit} disabled={pending} aria-label={`Aggiorna il profilo ${option?.label ?? profile.type}`}>
						<PencilIcon data-icon="inline-start" aria-hidden="true" /> Aggiorna
					</Button>
					<AlertDialog open={removeOpen} onOpenChange={(open) => !pending && setRemoveOpen(open)}>
						<AlertDialogTrigger render={<Button type="button" variant="destructive" size="icon" disabled={pending} />} aria-label={`Rimuovi il profilo ${option?.label ?? profile.type}`} title="Rimuovi sottoprofilo">
							<Trash2Icon data-icon="inline-start" aria-hidden="true" />
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogMedia><Trash2Icon aria-hidden="true" /></AlertDialogMedia>
								<AlertDialogTitle>Rimuovere questo sottoprofilo?</AlertDialogTitle>
								<AlertDialogDescription>
									Gli annunci pubblicati resteranno disponibili. <br />
									Se questo è il profilo principale, il prossimo sottoprofilo attivo verrà promosso
									automaticamente.
									{isRestrictedProfileType(profile.type) && (
										<>
											<br />
											<br />
											<span className={"font-medium"}>
												<span className={"font-semibold text-red-900"}>Attenzione:</span> per ricreare questo sottoprofilo servirà una nuova
												abilitazione da parte dell’admin!
											</span>
										</>
									)}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
								<AlertDialogAction
									variant="destructive"
									onClick={() => runMutation("remove", onRemove)}
									disabled={pending}
								>
									{pending && pendingAction === "remove" && (
										<LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />
									)}
									Rimuovi profilo
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</CardFooter>
		</Card>
	);
}

function InactiveProfileCard({
	type,
	disabled,
	authorized,
	onEnable,
}: {
	type: ProfileType;
	disabled: boolean;
	authorized: boolean;
	onEnable: () => void;
}) {
	const option = PROFILE_OPTIONS.find(({value}) => value === type);
	if (!option) return null;

	const accent = getProfileAccent(type);
	const restricted = isRestrictedProfileType(type);
	const comingSoon = !restricted && isComingSoonProfileType(type);

	return (
		<Card size="sm" className="profile-dashboard-card profile-dashboard-interactive-card profile-dashboard-available-card profile-dashboard-subprofile-card h-full" style={{"--profile-accent": accent} as CSSProperties} data-limit-reached={disabled || comingSoon || (restricted && !authorized) || undefined}>
			<CardHeader>
				<div className="flex min-w-0 items-center gap-3">
					<div className="profile-dashboard-type-icon flex size-10 shrink-0 items-center justify-center rounded-xl">
						<ProfilePngIcon type={type} color={accent} className="size-6" />
					</div>
					<div className="min-w-0">
						<CardTitle className="wrap-anywhere">{option.label}</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<p className="leading-6 text-muted-foreground">{option.description}</p>
			</CardContent>
			<CardFooter className="mt-auto flex-wrap justify-between gap-2">
				{restricted ? <Badge variant="outline"><LockIcon /> Accesso limitato</Badge> : comingSoon ? <ComingSoonBadge /> : <Badge variant="outline">Non attivo</Badge>}
				{!comingSoon && (!restricted || authorized) && (
					<Button type="button" variant="outline" size="sm" onClick={onEnable} disabled={disabled} aria-label={`Abilita il profilo ${option.label}`}>
						<PlusIcon data-icon="inline-start" aria-hidden="true" />
						{restricted ? "Completa profilo" : "Abilita"}
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

function ProfilesSection({
	profiles,
	restrictedProfileAccess,
	drafts,
	locations,
	onEnable,
	onEdit,
	onMakePrimary,
	onRemove,
}: {
	profiles: ManagedProfile[];
	restrictedProfileAccess: ProfileDashboardData["restrictedProfileAccess"];
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onEnable: (type: ProfileType) => void;
	onEdit: (type: ProfileType) => void;
	onMakePrimary: (type: ProfileType) => Promise<ProfileMutationResult>;
	onRemove: (type: ProfileType) => Promise<ProfileMutationResult>;
}) {
	const ordinaryCount = profiles.filter(({type}) => !isRestrictedProfileType(type)).length;
	const limitReached = ordinaryCount >= MAX_PROFILE_COUNT;

	return (
		<div className="grid gap-8">
			<section aria-labelledby="profiles-heading" className="grid gap-5">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<h2 id="profiles-heading" className="text-xl font-semibold tracking-tight">Sottoprofili attivi</h2>
						<Badge variant="secondary">{ordinaryCount}/{MAX_PROFILE_COUNT} ordinari</Badge>
						{profiles.some(({type}) => isRestrictedProfileType(type)) && <Badge variant="outline">{profiles.filter(({type}) => isRestrictedProfileType(type)).length} riservati</Badge>}
					</div>
					<p className="text-sm leading-6 text-muted-foreground">Le identità con cui ti presenti su Bacheca. Aggiorna le informazioni e scegli il tuo profilo principale.</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					{profiles.map((profile) => (
						<ProfileCard
							key={profile.type}
							profile={profile}
							drafts={drafts}
							locations={locations}
							onEdit={() => onEdit(profile.type)}
							onMakePrimary={() => onMakePrimary(profile.type)}
							onRemove={() => onRemove(profile.type)}
						/>
					))}
				</div>
			</section>
			<Separator />

			<section aria-labelledby="available-profiles-heading" className="grid gap-5">
				<div className="flex flex-col gap-1.5">
					<h2 id="available-profiles-heading" className="text-xl font-semibold tracking-tight">Altri sottoprofili</h2>
					<p className="text-sm leading-6 text-muted-foreground">Aggiungi fino a {MAX_PROFILE_COUNT} sottoprofili ordinari. Servizi e consulenze e Creators richiedono l’abilitazione dell’admin.</p>
				</div>

				{limitReached && PROFILE_OPTIONS.some(({value}) => !isRestrictedProfileType(value) && !profiles.some(({type}) => type === value)) && (
					<Alert>
						<InfoIcon aria-hidden="true" />
						<AlertTitle>Hai raggiunto il limite di sottoprofili</AlertTitle>
						<AlertDescription>Rimuovine uno per configurare una nuova tipologia.</AlertDescription>
					</Alert>
				)}

				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{PROFILE_OPTIONS.filter(({value}) => !profiles.some(({type}) => type === value)).map(({value}) => (
							<InactiveProfileCard
								key={value}
								type={value}
								authorized={restrictedProfileAccess.includes(value as "servizi-consulenze" | "creators")}
								disabled={limitReached && !isRestrictedProfileType(value)}
							onEnable={() => onEnable(value)}
						/>
					))}
				</div>
			</section>
		</div>
	);
}

function AnnouncementCard({announcement, onToggleVisibility, onRemove}: {
	announcement: ManagedAnnouncement;
	onToggleVisibility: () => Promise<ProfileMutationResult>;
	onRemove: () => Promise<ProfileMutationResult>;
}) {
	const accent = getProfileAccent(announcement.profileType);
	const profileOption = PROFILE_OPTIONS.find(({value}) => value === announcement.profileType);
	const TypeIcon = announcement.announcementType
		? announcementOption(announcement.announcementType).icon
		: profileOption?.icon ?? UserRoundIcon;
	const isHidden = announcement.visibility === "hidden";
	const paymentPending = announcement.moderationStatus === "in_attesa_pagamento";
	const [removeOpen, setRemoveOpen] = useState(false);
	const [pendingAction, setPendingAction] = useState<"visibility" | "remove" | null>(null);
	const [pending, startTransition] = useTransition();

	const runMutation = (
		action: "visibility" | "remove",
		mutation: () => Promise<ProfileMutationResult>,
	) => {
		setPendingAction(action);
		startTransition(async () => {
			try {
				const result = await mutation();
				toast.add({
					title: result.status === "success"
						? action === "remove"
							? "Annuncio eliminato"
							: isHidden ? "Annuncio nuovamente visibile" : "Annuncio nascosto"
						: "Modifica non riuscita",
					description: result.message,
					type: result.status,
				});
				if (result.status === "success" && action === "remove") {
					setRemoveOpen(false);
				}
			} catch {
				toast.add({
					title: "Modifica non riuscita",
					description: "La richiesta non è stata completata. Riprova.",
					type: "error",
				});
			} finally {
				setPendingAction(null);
			}
		});
	};

	return (
		<Card className="profile-dashboard-card profile-dashboard-interactive-card" style={{"--profile-accent": accent} as CSSProperties}>
			<CardHeader>
				<div className="flex min-w-0 items-start gap-3">
					<span className="profile-dashboard-type-icon flex size-10 shrink-0 items-center justify-center rounded-xl">
						<TypeIcon className="size-5" aria-hidden="true" />
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex flex-wrap gap-1.5">
							<Badge variant="secondary" className="profile-dashboard-type-badge">{announcement.profileType === "squadra" ? "Squadra" : announcement.type}</Badge>
							{announcement.profileType !== "squadra" && <Badge variant="outline">{announcement.subtype}</Badge>}
							<Badge variant={moderationVariant(announcement.moderationStatus)}>{moderationLabel(announcement.moderationStatus)}</Badge>
							{announcement.level === "prioritario" && <Badge variant="secondary"><StarIcon data-icon="inline-start" aria-hidden="true" /> Prioritario</Badge>}
						</div>
						<CardTitle className={`wrap-anywhere${announcement.title.startsWith("Ricerca ") ? " uppercase" : ""}`}>{announcement.title}</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<p className="wrap-anywhere leading-6 text-muted-foreground">{announcement.description}</p>
				{announcement.moderationInfo && (
					<Alert>
						<InfoIcon aria-hidden="true" />
						<AlertTitle>Nota di moderazione</AlertTitle>
						<AlertDescription className="wrap-anywhere">{announcement.moderationInfo}</AlertDescription>
					</Alert>
				)}
				<Separator />
				<dl className="grid gap-4 sm:grid-cols-3">
					<div className="flex min-w-0 flex-col gap-1">
						<dt className="text-xs text-muted-foreground">Località</dt>
						<dd className="flex items-start gap-1.5 font-medium"><MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="wrap-anywhere">{announcement.location}</span></dd>
					</div>
					<div className="flex flex-col gap-1">
						<dt className="text-xs text-muted-foreground">Creato il</dt>
						<dd className="font-medium">{formatDate(announcement.createdAt)}</dd>
					</div>
					<div className="flex flex-col gap-1">
						<dt className="text-xs text-muted-foreground">Visibilità</dt>
						<dd className="flex items-center gap-1.5 font-medium">{isHidden ? <EyeOffIcon className="size-4 text-muted-foreground" aria-hidden="true" /> : <EyeIcon className="size-4 text-muted-foreground" aria-hidden="true" />}{isHidden ? "Nascosto" : "Visibile"}</dd>
					</div>
				</dl>
			</CardContent>
			<CardFooter className="flex flex-wrap justify-end gap-2">
				<AnnouncementViewLink id={announcement.id} isListed={isAnnouncementListed(announcement.moderationStatus, isHidden, announcement.isPrivate)} />
				{paymentPending ? (
					<Button render={<Link href={`/pubblica-annuncio/pagamento?id=${encodeURIComponent(announcement.id)}`} />} nativeButton={false} className="profile-dashboard-action" disabled={pending}>
						Completa pagamento
						<ArrowRightIcon data-icon="inline-end" className="profile-dashboard-action-arrow" aria-hidden="true" />
					</Button>
				) : (
					<Button
						type="button"
						variant="outline"
						onClick={() => runMutation("visibility", onToggleVisibility)}
						disabled={pending}
					>
						{pending && pendingAction === "visibility"
							? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />
							: isHidden ? <EyeIcon data-icon="inline-start" aria-hidden="true" /> : <EyeOffIcon data-icon="inline-start" aria-hidden="true" />}
						{isHidden ? "Mostra" : "Nascondi"}
					</Button>
				)}
				<AlertDialog open={removeOpen} onOpenChange={(open) => !pending && setRemoveOpen(open)}>
					<AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={pending} />}>
						<Trash2Icon data-icon="inline-start" aria-hidden="true" /> Elimina
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogMedia><Trash2Icon aria-hidden="true" /></AlertDialogMedia>
							<AlertDialogTitle>Eliminare definitivamente l’annuncio?</AlertDialogTitle>
							<AlertDialogDescription>
								“{announcement.title}” verrà eliminato definitivamente insieme ai suoi dettagli. Questa azione non può essere annullata.
								{announcement.level === "prioritario" && announcement.moderationStatus !== "pubblicato" && (
									<> Se il pagamento è già stato completato, il caso verrà registrato per il rimborso manuale.</>
								)}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => runMutation("remove", onRemove)}
								disabled={pending}
							>
								{pending && pendingAction === "remove" && (
									<LoaderCircleIcon className="animate-spin" aria-hidden="true" />
								)}
								Elimina annuncio
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardFooter>
		</Card>
	);
}

function AnnouncementsSection({announcements, onToggleVisibility, onRemove}: {
	announcements: ManagedAnnouncement[];
	onToggleVisibility: (announcement: ManagedAnnouncement) => Promise<ProfileMutationResult>;
	onRemove: (announcement: ManagedAnnouncement) => Promise<ProfileMutationResult>;
}) {
	const [filter, setFilter] = useState<AnnouncementFilter>("all");
	const filteredAnnouncements = announcements.filter((announcement) => filter === "all" || announcement.visibility === filter);
	const counts = {
		all: announcements.length,
		visible: announcements.filter(({visibility}) => visibility === "visible").length,
		hidden: announcements.filter(({visibility}) => visibility === "hidden").length,
	};

	return (
		<section aria-labelledby="announcements-heading" className="grid gap-6">
			<div className="flex flex-col gap-1.5">
				<h2 id="announcements-heading" className="text-xl font-semibold tracking-tight">I tuoi annunci</h2>
				<p className="text-sm leading-6 text-muted-foreground">Controlla lo stato dei tuoi annunci, gestiscine la visibilità o eliminali. Per cambiare i contenuti, pubblica un nuovo annuncio.</p>
			</div>

			<ToggleGroup
				value={[filter]}
				onValueChange={(values) => {
					const nextValue = values.find((value) => value !== filter) ?? values[0];
					if (nextValue && isAnnouncementFilter(nextValue)) setFilter(nextValue);
				}}
				variant="outline"
				spacing={1}
				className="profile-dashboard-filters w-full justify-start overflow-x-auto p-1"
				aria-label="Filtra gli annunci"
			>
				<ToggleGroupItem value="all">Tutti <Badge variant="secondary">{counts.all}</Badge></ToggleGroupItem>
				<ToggleGroupItem value="visible">Visibili <Badge variant="secondary">{counts.visible}</Badge></ToggleGroupItem>
				<ToggleGroupItem value="hidden">Nascosti <Badge variant="secondary">{counts.hidden}</Badge></ToggleGroupItem>
			</ToggleGroup>

			{filteredAnnouncements.length > 0 ? (
				<div className="grid gap-4">
					{filteredAnnouncements.map((announcement) => (
						<AnnouncementCard
							key={announcement.id}
							announcement={announcement}
							onToggleVisibility={() => onToggleVisibility(announcement)}
							onRemove={() => onRemove(announcement)}
						/>
					))}
				</div>
			) : (
				<Empty className="profile-dashboard-empty">
					<EmptyHeader>
						<EmptyMedia variant="icon"><FileTextIcon aria-hidden="true" /></EmptyMedia>
						<EmptyTitle>Nessun annuncio in questa vista</EmptyTitle>
						<EmptyDescription>{announcements.length ? "Prova un filtro diverso." : "Pubblica il tuo primo annuncio per iniziare."}</EmptyDescription>
					</EmptyHeader>
					{announcements.length === 0 && (
						<EmptyContent>
							<Button render={<Link href="/pubblica-annuncio" />} nativeButton={false}><PlusIcon aria-hidden="true" /> Pubblica annuncio</Button>
						</EmptyContent>
					)}
				</Empty>
			)}
		</section>
	);
}

function PasswordResetButton() {
	const {pending} = useFormStatus();

	return (
		<Button type="submit" disabled={pending} className="min-h-10 w-full sm:w-auto">
			{pending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" /> : <KeyRoundIcon data-icon="inline-start" aria-hidden="true" />}
			{pending ? "Invio in corso…" : "Invia link di ripristino"}
		</Button>
	);
}

function SettingsSection({viewer, passwordUpdated, initialNewsletterSubscribed}: {viewer: ViewerDTO; passwordUpdated: boolean; initialNewsletterSubscribed: boolean}) {
	const [state, formAction] = useActionState(requestCurrentUserPasswordReset, INITIAL_AUTH_STATE);
	const [newsletterSubscribed, setNewsletterSubscribed] = useState(initialNewsletterSubscribed);
	const [newsletterPending, startNewsletterTransition] = useTransition();

	const updateNewsletterSubscription = (enabled: boolean) => {
		const previous = newsletterSubscribed;
		setNewsletterSubscribed(enabled);
		startNewsletterTransition(async () => {
			try {
				const result = await setNewsletterSubscription(enabled);
				if (result.status === "error") setNewsletterSubscribed(previous);
				toast.add({
					title: result.status === "success" ? "Preferenza aggiornata" : "Modifica non riuscita",
					description: result.message,
					type: result.status,
				});
			} catch {
				setNewsletterSubscribed(previous);
				toast.add({title: "Modifica non riuscita", description: "La richiesta non è stata completata. Riprova.", type: "error"});
			}
		});
	};

	return (
		<section aria-labelledby="settings-heading" className="grid gap-6">
			<div className="flex flex-col gap-1.5">
				<h2 id="settings-heading" className="text-xl font-semibold tracking-tight">Impostazioni</h2>
				<p className="text-sm leading-6 text-muted-foreground">Controlla i dati di accesso e la sicurezza dell’account.</p>
			</div>

			{passwordUpdated && (
				<Alert aria-live="polite">
					<BadgeCheckIcon aria-hidden="true" />
					<AlertTitle>Password aggiornata</AlertTitle>
					<AlertDescription>La nuova password è attiva. Da ora puoi utilizzarla per i prossimi accessi.</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="profile-dashboard-card">
					<CardHeader className="gap-3">
						<span className="profile-dashboard-emblem flex size-10 items-center justify-center rounded-xl"><UserRoundIcon className="size-5" aria-hidden="true" /></span>
						<CardTitle>Informazioni di accesso</CardTitle>
						<CardDescription>Dati forniti dal tuo account autenticato.</CardDescription>
					</CardHeader>
					<CardContent>
						<dl className="profile-dashboard-account-details grid gap-4 sm:grid-cols-2">
							<div><dt>Email</dt><dd className="break-all">{viewer.email}</dd></div>
							<div><dt>Metodo di accesso</dt><dd className="wrap-anywhere">{viewer.authMethod}</dd></div>
							<div><dt>Stato email</dt><dd>{viewer.emailConfirmedAt ? `Verificata il ${formatDate(viewer.emailConfirmedAt)}` : "Da verificare"}</dd></div>
							<div><dt>Ultimo accesso</dt><dd>{formatDate(viewer.lastSignInAt)}</dd></div>
						</dl>
					</CardContent>
				</Card>

				<Card className="profile-dashboard-card">
					<CardHeader className="gap-3">
						<span className="profile-dashboard-emblem flex size-10 items-center justify-center rounded-xl"><ShieldCheckIcon className="size-5" aria-hidden="true" /></span>
						<CardTitle>Sicurezza</CardTitle>
						<CardDescription>Ricevi via email un link sicuro per scegliere una nuova password.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col gap-4">
						<div className="flex items-start gap-3">
							<MailIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							<p className="min-w-0 text-sm leading-6 text-muted-foreground">Il link verrà inviato all’indirizzo <span className="break-all font-medium text-foreground">{viewer.email}</span>.</p>
						</div>
						{state.message && (
							<Alert variant={state.status === "error" ? "destructive" : "default"} aria-live="polite">
								{state.status === "success" ? <BadgeCheckIcon aria-hidden="true" /> : <InfoIcon aria-hidden="true" />}
								<AlertTitle>{state.status === "success" ? "Email inviata" : "Invio non riuscito"}</AlertTitle>
								<AlertDescription>{state.message}</AlertDescription>
							</Alert>
						)}
					</CardContent>
					<CardFooter><form action={formAction} className="w-full"><PasswordResetButton /></form></CardFooter>
				</Card>

				<Card className="profile-dashboard-card">
					<CardHeader className="gap-3">
						<span className="profile-dashboard-emblem flex size-10 items-center justify-center rounded-xl"><MailIcon className="size-5" aria-hidden="true" /></span>
						<CardTitle>Notizie e comunicazioni</CardTitle>
						<CardDescription>Scegli se ricevere aggiornamenti e comunicazioni dalla piattaforma.</CardDescription>
					</CardHeader>
					<CardContent>
						<Field orientation="horizontal" data-disabled={newsletterPending}>
							<Checkbox
								id="settings-newsletter"
								checked={newsletterSubscribed}
								onCheckedChange={(checked) => updateNewsletterSubscription(Boolean(checked))}
								disabled={newsletterPending}
							/>
							<FieldContent>
								<FieldLabel htmlFor="settings-newsletter" className="font-normal">Ricevi notizie, newsletter e comunicazioni promozionali</FieldLabel>
								<FieldDescription>{newsletterPending ? "Salvataggio in corso…" : "Puoi cambiare questa scelta in qualsiasi momento."}</FieldDescription>
							</FieldContent>
						</Field>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}

function FaqSection() {
	return (
		<section aria-labelledby="faq-heading" className="grid gap-6">
			<div className="flex flex-col gap-1.5">
				<h2 id="faq-heading" className="text-xl font-semibold tracking-tight">Domande frequenti</h2>
				<p className="text-sm leading-6 text-muted-foreground">Le informazioni utili per gestire profili, annunci e richieste di assistenza.</p>
			</div>
			<div className="grid gap-4">
				{FAQ_GROUPS.map((group) => (
					<Card key={group.id} className="profile-dashboard-card profile-dashboard-faq-card lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-0">
						<CardHeader className="gap-2">
							<CardTitle>{group.title}</CardTitle>
							<CardDescription>{group.description}</CardDescription>
						</CardHeader>
						<CardContent>
							<Accordion defaultValue={group.id === "profiles" ? [group.items[0].value] : []}>
								{group.items.map((item) => (
									<AccordionItem key={item.value} value={item.value}>
										<AccordionTrigger>{item.question}</AccordionTrigger>
										<AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}

export default function IlTuoProfilo({
	viewer,
	data,
	passwordUpdated,
	initialSection,
}: IlTuoProfiloProps) {
	const {mainImageUrl, hasMainImage, profiles, drafts, locations, socialLinks, announcements} = data;
	const [section, setSection] = useState<ProfileDashboardSection>(initialSection);
	const [editor, setEditor] = useState<ProfileEditorState | null>(null);

	const handleSaveProfile = (payload: ProfileEditorSavePayload) => saveProfile(payload);
	const handleToggleAnnouncement = (announcement: ManagedAnnouncement) => (
		setAnnouncementVisibility(
			announcement.id,
			announcement.visibility === "visible",
		)
	);
	const handleRemoveAnnouncement = (announcement: ManagedAnnouncement) => (
		removeAnnouncement(announcement.id)
	);

	return (
		<GradientBackground className="profile-dashboard min-h-screen py-6 sm:py-8">
			<main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:gap-8 sm:px-6 lg:px-8">
				<header>
					<AccountOverview
						viewer={viewer}
						imageUrl={mainImageUrl}
						hasMainImage={hasMainImage}
						profiles={profiles}
						invitationCode={data.invitationCode}
						confirmedInvitations={data.confirmedInvitations}
					/>
				</header>

				<Tabs
					orientation="horizontal"
					value={section}
					onValueChange={(value) => isDashboardSection(value) && setSection(value)}
					className="min-w-0 gap-6 sm:gap-8"
				>
					<DashboardNavigation section={section} />
					<div className="min-w-0">
						<TabsContent value="profilo">
							<ProfilesSection
								profiles={profiles}
								restrictedProfileAccess={data.restrictedProfileAccess}
								drafts={drafts}
								locations={locations}
								onEnable={(profileType) => setEditor({mode: "add", profileType})}
								onEdit={(profileType) => setEditor({mode: "edit", profileType})}
								onMakePrimary={setPrimaryProfile}
								onRemove={removeProfile}
							/>
						</TabsContent>
						<TabsContent value="annunci"><AnnouncementsSection announcements={announcements} onToggleVisibility={handleToggleAnnouncement} onRemove={handleRemoveAnnouncement} /></TabsContent>
						<TabsContent value="salvati"><SavedAnnouncementsSection list={data.interactions.savedAnnouncements} /></TabsContent>
						<TabsContent value="relazioni"><RelationshipsSection followers={data.interactions.followers} following={data.interactions.following} /></TabsContent>
						<TabsContent value="impostazioni"><SettingsSection viewer={viewer} passwordUpdated={passwordUpdated} initialNewsletterSubscribed={data.newsletterSubscribed} /></TabsContent>
						<TabsContent value="info"><FaqSection /></TabsContent>
					</div>
				</Tabs>
			</main>

			{editor && (
				<ProfileEditorDialog
					key={`${editor.mode}:${editor.profileType}`}
					mode={editor.mode}
					profileType={editor.profileType}
					drafts={drafts}
					locations={locations}
					socialLinks={socialLinks}
					onClose={() => setEditor(null)}
					onSave={handleSaveProfile}
				/>
			)}
		</GradientBackground>
	);
}
