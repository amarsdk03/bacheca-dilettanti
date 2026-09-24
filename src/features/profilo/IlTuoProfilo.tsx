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
	LoaderCircleIcon,
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
				answer: "Puoi configurare fino a cinque sottoprofili attivi, uno per ciascuna tipologia, e scegliere quello che rappresenta il tuo profilo principale.",
			},
			{
				value: "profile-manage",
				question: "Come abilito o modifico un sottoprofilo?",
				answer: "Nella sezione Il tuo profilo seleziona Abilita su una tipologia non attiva oppure Modifica su un sottoprofilo già configurato.",
			},
			{
				value: "profile-remove",
				question: "Cosa succede se rimuovo un sottoprofilo?",
				answer: "Deve rimanere attivo almeno un sottoprofilo. Se rimuovi quello principale, un altro sottoprofilo attivo verrà promosso automaticamente; gli annunci già pubblicati resteranno disponibili.",
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
				answer: "L’annuncio viene inviato gratuitamente in revisione. Puoi controllarne lo stato nella sezione I tuoi annunci.",
			},
			{
				value: "announcement-edit",
				question: "Posso modificare un annuncio pubblicato?",
				answer: "No. Puoi nasconderlo temporaneamente oppure eliminarlo. Per cambiare i contenuti devi pubblicare un nuovo annuncio.",
			},
			{
				value: "announcement-visibility",
				question: "Cosa succede quando nascondo un annuncio?",
				answer: "L’annuncio resta nella tua area personale e viene escluso dalla bacheca e dalle ricerche. Chiunque abbia il link può ancora consultarlo, inclusi i contatti. Puoi mostrarlo nuovamente in qualsiasi momento.",
			},
		],
	},
	{
		id: "account",
		title: "Account e assistenza",
		description: "Accesso, cancellazione dei dati e richieste allo staff.",
		items: [
			{
				value: "password",
				question: "Come cambio la password?",
				answer: "Apri Impostazioni e richiedi il link di ripristino. Riceverai un’email all’indirizzo associato al tuo account.",
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
						Scrivi a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> oppure usa uno dei canali nella <Link href="/contatti">pagina Contatti</Link>. Indica il link interessato e descrivi il problema senza inviare password o altri dati sensibili.
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
			{pending ? "Uscita in corso…" : "Esci"}
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

function AccountOverview({viewer, imageUrl, hasMainImage, profiles}: {
	viewer: ViewerDTO;
	imageUrl: string | null;
	hasMainImage: boolean;
	profiles: ManagedProfile[];
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
						description="Questa foto rappresenta il tuo account e viene usata come fallback per i sottoprofili senza una foto dedicata."
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
					<span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{profiles.length}/{MAX_PROFILE_COUNT}</span> sottoprofili attivi</span>
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
		<Card className="profile-dashboard-card profile-dashboard-interactive-card h-full" style={{"--profile-accent": accent} as CSSProperties}>
			<CardHeader className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<ProfileImageEditor
						scope={profile.type}
						imageUrl={profile.imageUrl}
						hasCustomImage={profile.hasCustomImage}
						fallback={<ProfilePngIcon type={profile.type} color={accent} className="size-7" />}
						title={`Foto profilo ${option?.label ?? "sottoprofilo"}`}
						description="Puoi usare una foto diversa da quella principale per questa tipologia di profilo."
						alt={`Foto del profilo ${option?.label ?? profile.type}`}
						avatarClassName="size-12"
					/>
					<div className="min-w-0">
						<CardTitle className="wrap-anywhere">{option?.label}</CardTitle>
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
									Gli annunci pubblicati resteranno disponibili. Se questo è il profilo principale, il prossimo sottoprofilo attivo verrà promosso automaticamente.
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
	onEnable,
}: {
	type: ProfileType;
	disabled: boolean;
	onEnable: () => void;
}) {
	const option = PROFILE_OPTIONS.find(({value}) => value === type);
	if (!option) return null;

	const accent = getProfileAccent(type);
	const comingSoon = isComingSoonProfileType(type);

	return (
		<Card size="sm" className="profile-dashboard-card profile-dashboard-interactive-card profile-dashboard-available-card h-full" style={{"--profile-accent": accent} as CSSProperties} data-limit-reached={disabled || comingSoon || undefined}>
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
				{comingSoon ? <ComingSoonBadge /> : <Badge variant="outline">Non attivo</Badge>}
				{!comingSoon && (
					<Button type="button" variant="outline" size="sm" onClick={onEnable} disabled={disabled} aria-label={`Abilita il profilo ${option.label}`}>
						<PlusIcon data-icon="inline-start" aria-hidden="true" />
						Abilita
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

function ProfilesSection({
	profiles,
	drafts,
	locations,
	onEnable,
	onEdit,
	onMakePrimary,
	onRemove,
}: {
	profiles: ManagedProfile[];
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onEnable: (type: ProfileType) => void;
	onEdit: (type: ProfileType) => void;
	onMakePrimary: (type: ProfileType) => Promise<ProfileMutationResult>;
	onRemove: (type: ProfileType) => Promise<ProfileMutationResult>;
}) {
	const limitReached = profiles.length >= MAX_PROFILE_COUNT;

	return (
		<div className="grid gap-8">
			<section aria-labelledby="profiles-heading" className="grid gap-5">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<h2 id="profiles-heading" className="text-xl font-semibold tracking-tight">Sottoprofili attivi</h2>
						<Badge variant="secondary">{profiles.length}/{MAX_PROFILE_COUNT}</Badge>
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
					<p className="text-sm leading-6 text-muted-foreground">Aggiungi una nuova tipologia: puoi attivare fino a {MAX_PROFILE_COUNT} sottoprofili, uno per categoria.</p>
				</div>

				{limitReached && (
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
							disabled={limitReached}
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
							<Badge variant="secondary" className="profile-dashboard-type-badge">{announcement.type}</Badge>
							<Badge variant="outline">{announcement.subtype}</Badge>
							<Badge variant={moderationVariant(announcement.moderationStatus)}>{moderationLabel(announcement.moderationStatus)}</Badge>
							{announcement.level === "prioritario" && <Badge variant="secondary"><StarIcon data-icon="inline-start" aria-hidden="true" /> Prioritario</Badge>}
						</div>
						<CardTitle className="wrap-anywhere">{announcement.title}</CardTitle>
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
						<CardTitle>Notizie e newsletter</CardTitle>
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
								<FieldLabel htmlFor="settings-newsletter" className="font-normal">Ricevi notizie e newsletter</FieldLabel>
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
