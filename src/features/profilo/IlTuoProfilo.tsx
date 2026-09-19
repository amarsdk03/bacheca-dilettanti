"use client";

import {type ReactNode, useActionState, useState, useTransition} from "react";
import {useFormStatus} from "react-dom";
import Link from "next/link";
import {
	BadgeCheckIcon,
	CheckIcon,
	CircleHelpIcon,
	CirclePlusIcon,
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
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,} from "@/components/ui/empty";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {toast} from "@/components/ui/toast";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Progress} from "@/components/ui/progress";
import GradientBackground from "@/components/styling/GradientBackground";
import {CONTACT_EMAIL} from "@/const/contactConstants";
import {announcementOption} from "@/features/annunci/announcement-model";
import {requestCurrentUserPasswordReset, signOut} from "@/features/auth/server/actions";
import {
	MAX_PROFILE_COUNT,
	PROFILE_OPTIONS,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";
import {getProfileCompletion} from "@/features/profilo/profile-completion";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {INITIAL_AUTH_STATE, type ViewerDTO} from "@/features/auth/types";
import ProfileEditorDialog from "@/features/profilo/ProfileEditorDialog";
import ProfileImageEditor from "@/features/profilo/ProfileImageEditor";
import {
	removeAnnouncement,
	removeProfile,
	saveProfile,
	setAnnouncementVisibility,
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
import {cn} from "@/lib/utils";
import {RelationshipsSection, SavedAnnouncementsSection} from "@/features/interazioni/DashboardSections";
import {Separator} from "@base-ui/react";

const DASHBOARD_ITEMS = [
	{value: "profilo", label: "Il tuo profilo", icon: UserRoundIcon},
	{value: "annunci", label: "I miei annunci", icon: ListChecksIcon},
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
				answer: "Un annuncio gratuito entra direttamente in revisione. Per un annuncio prioritario devi prima completare il pagamento: dopo l’approvazione avrà priorità per sette giorni. Puoi controllarne lo stato nella sezione I miei annunci.",
			},
			{
				value: "announcement-edit",
				question: "Posso modificare un annuncio pubblicato?",
				answer: "No. Puoi nasconderlo temporaneamente oppure eliminarlo. Per cambiare i contenuti devi pubblicare un nuovo annuncio.",
			},
			{
				value: "announcement-visibility",
				question: "Cosa succede quando nascondo un annuncio?",
				answer: "L’annuncio resta nella tua area personale ma non è visibile nella bacheca pubblica. Puoi mostrarlo nuovamente in qualsiasi momento.",
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

const MOBILE_DASHBOARD_ITEMS = DASHBOARD_ITEMS.map(({value, label}) => ({value, label}));
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

function LogoutButton({compact = false}: {compact?: boolean}) {
	const {pending} = useFormStatus();

	return (
		<Button
			type="submit"
			variant="ghost"
			size={compact ? "icon" : "default"}
			className={compact ? "text-destructive" : "w-full justify-start text-destructive"}
			disabled={pending}
			aria-label={compact ? "Logout" : undefined}
		>
			{pending ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : <LogOutIcon aria-hidden="true" />}
			{!compact && (pending ? "Uscita in corso…" : "Logout")}
		</Button>
	);
}

function DashboardNavigation() {
	return (
		<Card className="sticky top-24">
			<CardHeader className="px-6 pt-1">
				<CardTitle>Area personale</CardTitle>
				<CardDescription>Gestisci profili e annunci</CardDescription>
			</CardHeader>
			<CardContent>
				<TabsList variant="line" className="w-full items-stretch gap-1 p-0">
					{DASHBOARD_ITEMS.map(({value, label, icon: Icon}) => (
						<TabsTrigger key={value} value={value} className="min-h-9">
							<Icon aria-hidden="true" />
							{label}
						</TabsTrigger>
					))}
				</TabsList>
			</CardContent>
			<CardFooter>
				<form action={signOut} className="w-full">
					<LogoutButton />
				</form>
			</CardFooter>
		</Card>
	);
}

function MobileDashboardNavigation({section, onSectionChange}: {
	section: ProfileDashboardSection;
	onSectionChange: (section: ProfileDashboardSection) => void;
}) {
	return (
		<Card size="sm">
			<CardContent className="flex items-center gap-2">
				<Select
					items={MOBILE_DASHBOARD_ITEMS}
					value={section}
					onValueChange={(value) => isDashboardSection(value) && onSectionChange(value)}
				>
					<SelectTrigger className="w-full" aria-label="Sezione dell'area personale">
						<SelectValue />
					</SelectTrigger>
					<SelectContent align="start">
						<SelectGroup>
							{DASHBOARD_ITEMS.map(({value, label, icon: Icon}) => (
								<SelectItem key={value} value={value}>
									<Icon aria-hidden="true" />
									{label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<form action={signOut}>
					<LogoutButton compact />
				</form>
			</CardContent>
		</Card>
	);
}

function AccountOverview({viewer, imageUrl, hasMainImage}: {
	viewer: ViewerDTO;
	imageUrl: string | null;
	hasMainImage: boolean;
}) {
	return (
		<Card>
			<CardContent className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
				<ProfileImageEditor
					scope="main"
					imageUrl={imageUrl ?? viewer.avatarUrl}
					hasCustomImage={hasMainImage}
					fallback={<span className="text-lg">{viewer.initials}</span>}
					title="Foto profilo principale"
					description="Questa foto rappresenta il tuo account e viene usata come fallback per i sottoprofili senza una foto dedicata."
					alt={`Foto profilo di ${viewer.fullName}`}
					avatarClassName="size-16 text-lg"
				/>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="truncate text-xl font-semibold tracking-tight">{viewer.fullName}</h2>
						<Badge variant="secondary"><ShieldCheckIcon aria-hidden="true" /> Account autenticato</Badge>
					</div>
					<p className="mt-1 truncate text-muted-foreground">{viewer.email}</p>
				</div>
			</CardContent>
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
		<Card className="h-full">
			<CardHeader className="flex justify-between items-center pb-3 border-b-2 border-neutral-100">
				<div className="flex min-w-0 items-center gap-3">
					<ProfileImageEditor
							scope={profile.type}
							imageUrl={profile.imageUrl}
							hasCustomImage={profile.hasCustomImage}
						fallback={<ProfilePngIcon type={profile.type} color={accent} className="size-7" />}
						title={`Foto profilo ${option?.label ?? "sottoprofilo"}`}
						description="Puoi usare una foto diversa da quella principale per questa tipologia di profilo."
						alt={`Foto del profilo ${option?.label ?? profile.type}`}
						avatarClassName="size-10"
					/>
					<div className="min-w-0">
						<CardTitle className="truncate">{option?.label}</CardTitle>
					</div>
				</div>
				{
					profile.isPrimary ? (
						<Badge className="border-0" style={{backgroundColor: `${accent}18`, color: accent}}><StarIcon aria-hidden="true" /> Principale</Badge>
					) : (
						<Badge variant="outline" style={{borderColor: accent, color: accent}}><CheckIcon aria-hidden="true" /> Attivato</Badge>
					)
				}
			</CardHeader>
			<CardContent className="grid gap-4">
				<p className="leading-6 text-muted-foreground">
					{option?.description}
				</p>
				<Card size="sm" className="border-black/8 bg-muted/30 shadow-none">
					<CardHeader className="gap-2">
						<div className="flex items-center justify-between gap-3">
							<CardTitle className="text-sm">{profileCompletion.percentage}% completamento</CardTitle>
							<span className="text-xs text-muted-foreground">
								{profileCompletion.completed}/{profileCompletion.total}
							</span>
						</div>
						<Progress
							value={profileCompletion.percentage}
							aria-label={`Completamento profilo: ${profileCompletion.percentage}%`}
							indicatorStyle={{backgroundColor: accent}}
						/>
						<CardDescription className="text-xs">
							{profileCompletion.percentage === 100
								? "Profilo completo: ben fatto!"
								: "Hai più possibilità di essere visto se completi il tuo profilo!"}
						</CardDescription>
					</CardHeader>
				</Card>
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
						>
							{pending && pendingAction === "primary"
								? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />
								: <StarIcon data-icon="inline-start" aria-hidden="true" />}
						</Button>
					)}
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					<Button type="button" variant="outline" onClick={onEdit} disabled={pending}>
						<PencilIcon data-icon="inline-start" aria-hidden="true" /> Aggiorna
					</Button>
					<AlertDialog open={removeOpen} onOpenChange={(open) => !pending && setRemoveOpen(open)}>
						<AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={pending} />}>
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

	return (
		<Card className="h-full">
			<CardHeader className="flex justify-between items-center pb-3 border-b-2 border-neutral-100">
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{backgroundColor: `${accent}14`}}>
						<ProfilePngIcon type={type} color={accent} className="size-7" />
					</div>
					<div className="min-w-0">
						<CardTitle>{option.label}</CardTitle>
					</div>
				</div>
				<Badge className="border-0" style={{backgroundColor: `${accent}18`, color: accent}}>Non attivato</Badge>
			</CardHeader>
			<CardContent>
				<p className="leading-6 text-muted-foreground">{option.description}</p>
			</CardContent>
			<CardFooter className="mt-auto justify-end">
				<Button type="button" onClick={onEnable} disabled={disabled}>
					<PlusIcon data-icon="inline-start" aria-hidden="true" />
					Abilita
				</Button>
			</CardFooter>
		</Card>
	);
}

function ProfilesSection({
	viewer,
	mainImageUrl,
	hasMainImage,
	profiles,
	drafts,
	locations,
	onEnable,
	onEdit,
	onMakePrimary,
	onRemove,
}: {
	viewer: ViewerDTO;
	mainImageUrl: string | null;
	hasMainImage: boolean;
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
		<section aria-labelledby="profiles-heading" className="grid gap-6">
			<AccountOverview viewer={viewer} imageUrl={mainImageUrl} hasMainImage={hasMainImage} />

			<div className={"mt-2"}>
				<div className="flex items-center gap-2">
					<h2 id="profiles-heading" className="text-2xl font-semibold tracking-tight">Sottoprofili attivi</h2>
					<Badge variant="secondary">{profiles.length}/{MAX_PROFILE_COUNT}</Badge>
				</div>
				<p className="mt-1 text-muted-foreground">Un solo sottoprofilo per tipologia, fino a un massimo di cinque.</p>
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

			<Separator className={"mt-8 border-b"} />
			
			<div className={"mt-4"}>
				<div className="flex items-center gap-2">
					<h2 id="profiles-heading" className="text-2xl font-semibold tracking-tight">Sottoprofili non attivi</h2>
				</div>

				{limitReached && (
					<Alert className={"mt-2"}>
						<InfoIcon aria-hidden="true" />
						<AlertTitle>Hai raggiunto il limite di sottoprofili</AlertTitle>
						<AlertDescription>Rimuovine uno per configurare una nuova tipologia.</AlertDescription>
					</Alert>
				)}
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{PROFILE_OPTIONS.filter(({value}) => !profiles.find(({type}) => type === value)).map(({value}) => {
					return (
						<InactiveProfileCard
							key={value}
							type={value}
							disabled={limitReached}
							onEnable={() => onEnable(value)}
						/>
					);
				})}
			</div>
		</section>
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
		<Card className={cn("relative overflow-hidden border-black/8", isHidden && !paymentPending && "opacity-75")}>
			<span className="absolute inset-x-0 top-0 h-1" style={{backgroundColor: accent}} aria-hidden="true" />
			<CardHeader className="border-b border-black/8 pt-2">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex min-w-0 gap-3">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor: `${accent}14`, color: accent}}>
							<TypeIcon className="size-5" aria-hidden="true" />
						</span>
						<div className="min-w-0">
							<div className="mb-2 flex flex-wrap gap-1.5">
								<Badge className="border-0" style={{backgroundColor: `${accent}18`, color: accent}}>{announcement.type}</Badge>
								<Badge variant="outline">{announcement.subtype}</Badge>
								<Badge variant={moderationVariant(announcement.moderationStatus)}>{moderationLabel(announcement.moderationStatus)}</Badge>
								{announcement.level === "prioritario" && <Badge variant="secondary">Prioritario</Badge>}
								{isHidden && !paymentPending && <Badge variant="secondary"><EyeOffIcon aria-hidden="true" /> Nascosto</Badge>}
							</div>
							<CardTitle className="wrap-anywhere text-lg leading-snug">{announcement.title}</CardTitle>
						</div>
					</div>
					<span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{formatDate(announcement.createdAt)}</span>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<p className="leading-6 text-muted-foreground">{announcement.description}</p>
				{announcement.moderationInfo && (
					<p className="rounded-xl border px-3 py-2.5 text-sm leading-6 text-foreground" style={{backgroundColor: `${accent}0d`, borderColor: `${accent}28`}}>
						{announcement.moderationInfo}
					</p>
				)}
				<dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
					<div className="rounded-xl border border-black/7 bg-muted/25 px-3 py-2.5">
						<dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">Stato</dt>
						<dd className="mt-1 text-sm font-medium">{moderationLabel(announcement.moderationStatus)}</dd>
					</div>
					<div className="rounded-xl border border-black/7 bg-muted/25 px-3 py-2.5">
						<dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">Visibilità</dt>
						<dd className="mt-1 text-sm font-medium">{isHidden ? "Nascosto" : "Visibile"}</dd>
					</div>
					<div className="min-w-0 rounded-xl border border-black/7 bg-muted/25 px-3 py-2.5">
						<dt className="flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground"><MapPinIcon className="size-3.5" style={{color: accent}} aria-hidden="true" />Località</dt>
						<dd className="mt-1 truncate text-sm font-medium" title={announcement.location}>{announcement.location}</dd>
					</div>
					<div className="rounded-xl border border-black/7 bg-muted/25 px-3 py-2.5">
						<dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">Pubblicato</dt>
						<dd className="mt-1 text-sm font-medium">{formatDate(announcement.createdAt)}</dd>
					</div>
				</dl>
			</CardContent>
			<CardFooter className="flex flex-wrap justify-end gap-2">
				{paymentPending ? (
					<Button render={<Link href={`/pubblica-annuncio/pagamento?id=${encodeURIComponent(announcement.id)}`} />} nativeButton={false}>
						Completa pagamento
					</Button>
				) : (
					<Button
						type="button"
						variant="outline"
						onClick={() => runMutation("visibility", onToggleVisibility)}
						disabled={pending}
					>
						{pending && pendingAction === "visibility"
							? <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
							: isHidden ? <EyeIcon aria-hidden="true" /> : <EyeOffIcon aria-hidden="true" />}
						{isHidden ? "Mostra" : "Nascondi"}
					</Button>
				)}
				<AlertDialog open={removeOpen} onOpenChange={(open) => !pending && setRemoveOpen(open)}>
					<AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={pending} />}>
						<Trash2Icon aria-hidden="true" /> Elimina
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
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 id="announcements-heading" className="text-xl font-semibold tracking-tight">I miei annunci</h2>
					<p className="mt-1 text-muted-foreground">Puoi gestirne la visibilità o eliminarli; la modifica non è disponibile.</p>
				</div>
				<Button render={<Link href="/pubblica-annuncio" />} nativeButton={false}>
					<CirclePlusIcon aria-hidden="true" /> Pubblica annuncio
				</Button>
			</div>

			<ToggleGroup
				value={[filter]}
				onValueChange={(values) => {
					const nextValue = values.find((value) => value !== filter) ?? values[0];
					if (nextValue && isAnnouncementFilter(nextValue)) setFilter(nextValue);
				}}
				variant="outline"
				spacing={1}
				className="w-full justify-start overflow-x-auto"
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
				<Empty className="border bg-card py-12">
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
		<Button type="submit" disabled={pending}>
			{pending ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : <KeyRoundIcon aria-hidden="true" />}
			{pending ? "Invio in corso…" : "Invia link di ripristino"}
		</Button>
	);
}

function SettingsSection({viewer, passwordUpdated}: {viewer: ViewerDTO; passwordUpdated: boolean}) {
	const [state, formAction] = useActionState(requestCurrentUserPasswordReset, INITIAL_AUTH_STATE);

	return (
		<section aria-labelledby="settings-heading" className="grid gap-6">
			<div>
				<h2 id="settings-heading" className="text-xl font-semibold tracking-tight">Impostazioni</h2>
				<p className="mt-1 text-muted-foreground">Controlla i dati di accesso e la sicurezza dell’account.</p>
			</div>

			{passwordUpdated && (
				<Alert aria-live="polite">
					<BadgeCheckIcon aria-hidden="true" />
					<AlertTitle>Password aggiornata</AlertTitle>
					<AlertDescription>La nuova password è attiva. Da ora puoi utilizzarla per i prossimi accessi.</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader className="border-b">
					<CardTitle>Informazioni di accesso</CardTitle>
					<CardDescription>Dati forniti dal tuo account autenticato.</CardDescription>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-4 sm:grid-cols-2">
						<div className="rounded-lg border p-3"><dt className="text-xs font-medium text-muted-foreground">Email</dt><dd className="mt-1 break-all font-medium">{viewer.email}</dd></div>
						<div className="rounded-lg border p-3"><dt className="text-xs font-medium text-muted-foreground">Metodo di accesso</dt><dd className="mt-1 font-medium">{viewer.authMethod}</dd></div>
						<div className="rounded-lg border p-3"><dt className="text-xs font-medium text-muted-foreground">Stato email</dt><dd className="mt-1 font-medium">{viewer.emailConfirmedAt ? `Verificata il ${formatDate(viewer.emailConfirmedAt)}` : "Da verificare"}</dd></div>
						<div className="rounded-lg border p-3"><dt className="text-xs font-medium text-muted-foreground">Ultimo accesso</dt><dd className="mt-1 font-medium">{formatDate(viewer.lastSignInAt)}</dd></div>
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="border-b">
					<CardTitle>Sicurezza</CardTitle>
					<CardDescription>Ricevi via email un link sicuro per scegliere una nuova password.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
						<MailIcon className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
						<p className="text-sm text-muted-foreground">Il link verrà inviato all’indirizzo autenticato <span className="font-medium text-foreground">{viewer.email}</span>.</p>
					</div>
					{state.message && (
						<Alert variant={state.status === "error" ? "destructive" : "default"} aria-live="polite">
							{state.status === "success" ? <BadgeCheckIcon aria-hidden="true" /> : <InfoIcon aria-hidden="true" />}
							<AlertTitle>{state.status === "success" ? "Email inviata" : "Invio non riuscito"}</AlertTitle>
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}
					<form action={formAction}><PasswordResetButton /></form>
				</CardContent>
			</Card>
		</section>
	);
}

function FaqSection() {
	return (
		<section aria-labelledby="faq-heading" className="grid gap-6">
			<div>
				<h2 id="faq-heading" className="text-xl font-semibold tracking-tight">Domande frequenti</h2>
				<p className="mt-1 text-muted-foreground">Le informazioni utili per gestire profili, annunci e richieste di assistenza.</p>
			</div>
			<div className="grid gap-4">
				{FAQ_GROUPS.map((group) => (
					<Card key={group.id}>
						<CardHeader className="border-b">
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
		<GradientBackground className="min-h-screen py-10 sm:py-12">
			<main className="relative mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:px-8">
				<header className="max-w-3xl">
					<p className="text-sm font-medium text-primary">Area personale</p>
					<h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Bentornato, {viewer.fullName}!</h1>
					<p className="mt-2 text-base leading-7 text-muted-foreground">Gestisci la tua presenza su Bacheca Dilettanti da un unico spazio.</p>
				</header>

				<Tabs
					orientation="vertical"
					value={section}
					onValueChange={(value) => isDashboardSection(value) && setSection(value)}
					className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
				>
					<div className="lg:hidden"><MobileDashboardNavigation section={section} onSectionChange={setSection} /></div>
					<aside className="hidden lg:block"><DashboardNavigation /></aside>
					<div className="min-w-0">
						<TabsContent value="profilo">
							<ProfilesSection
								viewer={viewer}
								mainImageUrl={mainImageUrl}
								hasMainImage={hasMainImage}
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
						<TabsContent value="impostazioni"><SettingsSection viewer={viewer} passwordUpdated={passwordUpdated} /></TabsContent>
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
