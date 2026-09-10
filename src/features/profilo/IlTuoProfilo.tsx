"use client";

import {useActionState, useState, useTransition} from "react";
import {useFormStatus} from "react-dom";
import Link from "next/link";
import {
	BadgeCheckIcon, CheckIcon,
	CircleHelpIcon,
	CirclePlusIcon,
	EyeIcon,
	EyeOffIcon,
	FileTextIcon,
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
} from "lucide-react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
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
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {toast} from "@/components/ui/toast";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import GradientBackground from "@/components/styling/GradientBackground";
import {requestCurrentUserPasswordReset, signOut} from "@/features/auth/server/actions";
import {
	createProfileDrafts,
	isLimitedProfileType,
	MAX_PROFILE_COUNT,
	PROFILE_OPTIONS,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";
import {INITIAL_AUTH_STATE, type ViewerDTO} from "@/features/auth/types";
import ProfileEditorDialog from "@/features/profilo/ProfileEditorDialog";
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
import {Separator} from "@base-ui/react";

const DASHBOARD_ITEMS = [
	{value: "profilo", label: "Il tuo profilo", icon: UserRoundIcon},
	{value: "annunci", label: "Lista annunci", icon: ListChecksIcon},
	{value: "impostazioni", label: "Impostazioni", icon: SettingsIcon},
	{value: "info", label: "Info varie", icon: CircleHelpIcon},
] as const;

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
	if (value === "in_revisione") return "In revisione";
	if (value === "pubblicato") return "Pubblicato";
	if (value === "rifiutato") return "Non approvato";
	return value ? value.replaceAll("_", " ") : "Stato non disponibile";
}

function moderationVariant(value: string | null): "default" | "secondary" | "destructive" | "outline" {
	if (value === "pubblicato") return "default";
	if (value === "rifiutato") return "destructive";
	if (value === "in_revisione") return "secondary";
	return "outline";
}

function stringList(value: unknown) {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function firstRole(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const roles = value as {principali?: unknown};
	return stringList(roles.principali)[0] ?? null;
}

function displayValue(value: unknown, fallback = "Non specificato") {
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getLocationLabel(type: ProfileType, locations: ProfileLocations) {
	const location = locations[type][0];
	if (!location) return "Località non specificata";
	return [location.citta, location.regione].filter(Boolean).join(", ");
}

function getProfilePresentation(type: ProfileType, drafts: ProfileDrafts) {
	return displayValue(drafts[type].presentazione, "Aggiungi una presentazione per rendere il profilo più completo.");
}

function getProfileTitle(type: ProfileType, drafts: ProfileDrafts) {
	switch (type) {
		case "giocatore":
			return displayValue(`${drafts.giocatore.nome} ${drafts.giocatore.cognome}`.trim(), "Profilo giocatore");
		case "squadra":
			return displayValue(drafts.squadra.nome_societa, "Profilo squadra");
		case "staff-sportivo":
			return displayValue(`${drafts["staff-sportivo"].nome} ${drafts["staff-sportivo"].cognome}`.trim(), "Profilo staff sportivo");
		case "professionisti-studi":
			return displayValue(`${drafts["professionisti-studi"].nome} ${drafts["professionisti-studi"].cognome}`.trim(), "Profilo professionista");
		case "arbitro":
			return displayValue(`${drafts.arbitro.nome} ${drafts.arbitro.cognome}`.trim(), "Profilo arbitro");
		case "creators":
			return displayValue(drafts.creators.nome_creator, "Profilo creator");
		case "torneo-evento":
			return displayValue(drafts["torneo-evento"].nome_organizzazione, "Profilo torneo / evento");
		case "campi-impianti-sportivi":
			return displayValue(drafts["campi-impianti-sportivi"].nome_organizzazione, "Profilo campo / impianto");
	}
}

function getProfileFacts(type: ProfileType, drafts: ProfileDrafts, locations: ProfileLocations) {
	const location = getLocationLabel(type, locations);

	switch (type) {
		case "giocatore":
			return [displayValue(drafts.giocatore.sport_principale), firstRole(drafts.giocatore.ruoli_sport) ?? "Ruolo non specificato", location];
		case "squadra":
			return [displayValue(drafts.squadra.sport_principale), displayValue(drafts.squadra.sede_principale, location), location];
		case "staff-sportivo":
			return [displayValue(drafts["staff-sportivo"].sport_principale), stringList(drafts["staff-sportivo"].figure_professionali)[0] ?? "Figura non specificata", location];
		case "professionisti-studi":
			return [displayValue(drafts["professionisti-studi"].sport_principale), stringList(drafts["professionisti-studi"].figure_professionali)[0] ?? "Specializzazione non specificata", location];
		case "arbitro":
			return [displayValue(drafts.arbitro.sport_principale), "Attività arbitrale", location];
		case "creators":
			return [displayValue(drafts.creators.sport_principale), displayValue(drafts.creators.tipologia_contenuti, "Contenuti non specificati"), location];
		case "torneo-evento":
			return [displayValue(drafts["torneo-evento"].sport_principale), displayValue(drafts["torneo-evento"].sede_principale, location), location];
		case "campi-impianti-sportivi":
			return [displayValue(drafts["campi-impianti-sportivi"].sport_principale), displayValue(drafts["campi-impianti-sportivi"].sede_principale, location), location];
	}
}

function hasProfileDetails(type: ProfileType, drafts: ProfileDrafts, locations: ProfileLocations) {
	const emptyDraft = createProfileDrafts()[type];
	return locations[type].length > 0 || JSON.stringify(drafts[type]) !== JSON.stringify(emptyDraft);
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

function AccountOverview({viewer}: {viewer: ViewerDTO}) {
	return (
		<Card>
			<CardContent className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
				<Avatar className="size-16 text-lg">
					{viewer.avatarUrl && <AvatarImage src={viewer.avatarUrl} alt="" referrerPolicy="no-referrer" />}
					<AvatarFallback className="text-lg">{viewer.initials}</AvatarFallback>
				</Avatar>
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
	const Icon = option?.icon ?? UserRoundIcon;
	const facts = getProfileFacts(profile.type, drafts, locations);
	const hasDetails = hasProfileDetails(profile.type, drafts, locations);
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
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						<Icon aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<CardTitle className="truncate">{option?.label}</CardTitle>
					</div>
				</div>
				{
					profile.isPrimary ? (
						<Badge><StarIcon aria-hidden="true" /> Principale</Badge>
					) : (
						<Badge variant="outline"><CheckIcon aria-hidden="true" /> Attivato</Badge>
					)
				}
			</CardHeader>
			<CardContent>
				<p className="leading-6 text-muted-foreground">
					{option?.description}
				</p>
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

	const Icon = option.icon;
	const unavailable = isLimitedProfileType(type);

	return (
		<Card className="h-full">
			<CardHeader className="flex justify-between items-center pb-3 border-b-2 border-neutral-100">
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						<Icon aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<CardTitle>{option.label}</CardTitle>
					</div>
				</div>
				<Badge variant="secondary">
					{unavailable ? "Non disponibile" : "Non attivato"}
				</Badge>
			</CardHeader>
			<CardContent>
				<p className="leading-6 text-muted-foreground">
					{option.description}
					{unavailable && "."}
					{unavailable && (
						<>
							<br/><br/>
							<span className="text-xs text-muted-foreground">
								Questa tipologia non può essere abilitata al momento.
							</span>
						</>
					)}
				</p>
			</CardContent>
			<CardFooter className="mt-auto justify-end">
				<Button type="button" onClick={onEnable} disabled={disabled || unavailable}>
					<PlusIcon data-icon="inline-start" aria-hidden="true" />
					Abilita
				</Button>
			</CardFooter>
		</Card>
	);
}

function ProfilesSection({
	viewer,
	profiles,
	drafts,
	locations,
	onEnable,
	onEdit,
	onMakePrimary,
	onRemove,
}: {
	viewer: ViewerDTO;
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
			<AccountOverview viewer={viewer} />

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
	const isHidden = announcement.visibility === "hidden";
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
		<Card className={isHidden ? "opacity-75" : undefined}>
			<CardHeader className="border-b">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<div className="mb-2 flex flex-wrap gap-2">
							<Badge>{announcement.type}</Badge>
							<Badge variant="outline">{announcement.subtype}</Badge>
							<Badge variant={moderationVariant(announcement.moderationStatus)}>{moderationLabel(announcement.moderationStatus)}</Badge>
							{isHidden && <Badge variant="secondary"><EyeOffIcon aria-hidden="true" /> Nascosto</Badge>}
						</div>
						<CardTitle className="text-lg">{announcement.title}</CardTitle>
					</div>
					<span className="shrink-0 text-xs text-muted-foreground">{formatDate(announcement.createdAt)}</span>
				</div>
			</CardHeader>
			<CardContent className="grid gap-3">
				<p className="leading-6 text-muted-foreground">{announcement.description}</p>
				{announcement.moderationInfo && <p className="text-sm text-muted-foreground">{announcement.moderationInfo}</p>}
				<div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPinIcon aria-hidden="true" />{announcement.location}</div>
			</CardContent>
			<CardFooter className="flex flex-wrap justify-end gap-2">
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
					<h2 id="announcements-heading" className="text-xl font-semibold tracking-tight">Lista annunci</h2>
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

function InfoSection() {
	return (
		<section aria-labelledby="info-heading" className="grid gap-6">
			<div>
				<h2 id="info-heading" className="text-xl font-semibold tracking-tight">Info varie</h2>
				<p className="mt-1 text-muted-foreground">Le risposte rapide alle domande più comuni.</p>
			</div>
			<Card>
				<CardHeader className="border-b">
					<CardTitle>Come funziona Bacheca Dilettanti</CardTitle>
					<CardDescription>Profili, annunci e sicurezza del tuo account.</CardDescription>
				</CardHeader>
				<CardContent>
					<Accordion defaultValue={["profiles"]}>
						<AccordionItem value="profiles">
							<AccordionTrigger>Quanti sottoprofili posso creare?</AccordionTrigger>
							<AccordionContent className="text-muted-foreground">Puoi configurare fino a cinque sottoprofili, uno per ciascuna tipologia. Puoi anche indicare quale rappresenta il tuo profilo principale.</AccordionContent>
						</AccordionItem>
						<AccordionItem value="enable-profile">
							<AccordionTrigger>Come abilito un’altra tipologia?</AccordionTrigger>
							<AccordionContent className="text-muted-foreground">Tutte le tipologie restano visibili nella griglia. Seleziona Abilita, compila i dettagli che desideri e salva il sottoprofilo.</AccordionContent>
						</AccordionItem>
						<AccordionItem value="announcements">
							<AccordionTrigger>Posso modificare un annuncio pubblicato?</AccordionTrigger>
							<AccordionContent className="text-muted-foreground">No. Puoi nasconderlo temporaneamente o eliminarlo. Per cambiare i contenuti dovrai pubblicare un nuovo annuncio.</AccordionContent>
						</AccordionItem>
						<AccordionItem value="visibility">
							<AccordionTrigger>Cosa succede quando nascondo un annuncio?</AccordionTrigger>
							<AccordionContent className="text-muted-foreground">L’annuncio resta nella tua area personale ma non è visibile nella bacheca pubblica. Puoi mostrarlo nuovamente in qualsiasi momento.</AccordionContent>
						</AccordionItem>
						<AccordionItem value="password">
							<AccordionTrigger>Come cambio la password?</AccordionTrigger>
							<AccordionContent className="text-muted-foreground">Apri Impostazioni e richiedi il link di ripristino. Riceverai un’email all’indirizzo associato al tuo account.</AccordionContent>
						</AccordionItem>
					</Accordion>
				</CardContent>
			</Card>
		</section>
	);
}

export default function IlTuoProfilo({
	viewer,
	data,
	passwordUpdated,
	initialSection,
}: IlTuoProfiloProps) {
	const {profiles, drafts, locations, announcements} = data;
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
						<TabsContent value="impostazioni"><SettingsSection viewer={viewer} passwordUpdated={passwordUpdated} /></TabsContent>
						<TabsContent value="info"><InfoSection /></TabsContent>
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
					onClose={() => setEditor(null)}
					onSave={handleSaveProfile}
				/>
			)}
		</GradientBackground>
	);
}
