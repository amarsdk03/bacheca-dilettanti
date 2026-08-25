import Link from "next/link";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CalendarDaysIcon,
	InfoIcon,
	ListChecksIcon,
	MapPinIcon,
	SearchIcon,
	SlidersHorizontalIcon,
} from "lucide-react";

import GradientBackground from "@/components/styling/GradientBackground";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button, buttonVariants} from "@/components/ui/button";
import {
	Card,
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
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {Separator} from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import AnnouncementAuthorHoverCard from "@/features/annunci/AnnouncementAuthorHoverCard";
import AnnouncementFiltersResetButton from "@/features/annunci/AnnouncementFiltersResetButton";
import {
	ANNOUNCEMENT_FILTER_OPTIONS,
	ANNOUNCEMENT_TEAM_SEARCH_OPTIONS,
	announcementDirectoryOption,
	announcementOption,
	buildAnnouncementsHref,
	createEmptyAnnouncementFilters,
	getActiveAnnouncementFilterCount,
	getAnnouncementFiltersForDirectoryType,
	getAnnouncementFilterEntries,
	type AnnouncementDirectoryItem,
	type AnnouncementDirectoryQuery,
	type AnnouncementDirectoryResult,
	type AnnouncementDirectoryType,
} from "@/features/annunci/announcement-model";
import AnnouncementTypeSelector from "@/features/annunci/AnnouncementTypeSelector";
import {cn} from "@/lib/utils";
import Image from "next/image";

interface AnnunciProps {
	query: AnnouncementDirectoryQuery;
	result: AnnouncementDirectoryResult;
}

interface FilterSelectOption {
	value: string;
	label: string;
}

type AnnouncementFilterParam = keyof AnnouncementDirectoryQuery["filters"];

const ANNOUNCEMENT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "short",
	timeZone: "Europe/Rome",
	year: "numeric",
});

function formatAnnouncementDate(value: string | null) {
	if (!value) return "Data non disponibile";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Data non disponibile"
		: ANNOUNCEMENT_DATE_FORMATTER.format(date);
}

function humanizeValue(value: string) {
	const normalized = value.trim().replaceAll("_", " ").replaceAll("-", " ");
	return normalized
		? normalized.charAt(0).toLocaleUpperCase("it-IT") + normalized.slice(1)
		: value;
}

function AnnouncementQueryHiddenFields({
	query,
	includeQuery,
}: {
	query: AnnouncementDirectoryQuery;
	includeQuery: boolean;
}) {
	return (
		<>
			{includeQuery && query.q && <input type="hidden" name="q" value={query.q} />}
			{query.types.map((type) => <input key={type} type="hidden" name="type" value={type} />)}
			{getAnnouncementFilterEntries(query.filters).map(([key, value]) => (
				<input key={key} type="hidden" name={key} value={value} />
			))}
		</>
	);
}

function AnnouncementSearch({query}: {query: AnnouncementDirectoryQuery}) {
	return (
		<div className="flex items-end gap-2">
			<form action="/annunci" method="get" role="search" className="min-w-0 flex-1">
				<AnnouncementQueryHiddenFields query={query} includeQuery={false} />
				<Field>
					<FieldLabel htmlFor="announcement-search" className="sr-only">
						Cerca tra gli annunci
					</FieldLabel>
					<InputGroup className="h-12 rounded-xl bg-background px-1 shadow-sm">
						<InputGroupInput
							key={query.q}
							id="announcement-search"
							name="q"
							defaultValue={query.q}
							placeholder="Cerca per ruolo, località, categoria o opportunità…"
							maxLength={100}
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton type="submit" size="icon-sm" aria-label="Cerca">
								<SearchIcon aria-hidden="true" />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</Field>
			</form>
			<AnnouncementFiltersSheet query={query} />
		</div>
	);
}

function FilterSelect({
	id,
	name,
	label,
	value,
	allLabel,
	options,
}: {
	id: string;
	name: string;
	label: string;
	value: string;
	allLabel: string;
	options: FilterSelectOption[];
}) {
	const items: Array<{value: string | null; label: string}> = [
		{value: null, label: allLabel},
		...options,
	];

	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select key={`${name}:${value}`} items={items} name={name} defaultValue={value || null}>
				<SelectTrigger id={id} className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false} side="bottom">
					<SelectGroup>
						{items.map((item) => (
							<SelectItem key={item.value ?? "all"} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</Field>
	);
}

function hasFilter(
	filters: readonly AnnouncementFilterParam[],
	filter: AnnouncementFilterParam,
) {
	return filters.includes(filter);
}

function AnnouncementFiltersForm({
	query,
	type,
	idPrefix,
}: {
	query: AnnouncementDirectoryQuery;
	type: AnnouncementDirectoryType;
	idPrefix: string;
}) {
	const availableFilters = getAnnouncementFiltersForDirectoryType(type, query.filters.ricercaSquadra);
	const resetHref = buildAnnouncementsHref(query, {
		page: 1,
		filters: createEmptyAnnouncementFilters(),
	});

	return (
		<form action="/annunci" method="get" className="flex flex-col gap-5">
			<AnnouncementQueryHiddenFields
				query={{...query, filters: createEmptyAnnouncementFilters()}}
				includeQuery
			/>
			<FieldGroup className="gap-4">
				{hasFilter(availableFilters, "ricercaSquadra") && (
					<FilterSelect
						id={`${idPrefix}-ricerca-squadra`}
						name="ricercaSquadra"
						label="Tipo di ricerca"
						value={query.filters.ricercaSquadra}
						allLabel="Tutte le ricerche"
						options={ANNOUNCEMENT_TEAM_SEARCH_OPTIONS.map(({value, label}) => ({value, label}))}
					/>
				)}

				{hasFilter(availableFilters, "regione") && (
					<FilterSelect
						id={`${idPrefix}-regione`}
						name="regione"
						label="Regione"
						value={query.filters.regione}
						allLabel="Tutte le regioni"
						options={ANNOUNCEMENT_FILTER_OPTIONS.regioni.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "tipologia") && (
					<FilterSelect
						id={`${idPrefix}-tipologia`}
						name="tipologia"
						label="Tipologia di calcio"
						value={query.filters.tipologia}
						allLabel="Tutte le tipologie"
						options={ANNOUNCEMENT_FILTER_OPTIONS.tipologie.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "ruolo") && (
					<FilterSelect
						id={`${idPrefix}-ruolo`}
						name="ruolo"
						label="Ruolo"
						value={query.filters.ruolo}
						allLabel="Tutti i ruoli"
						options={ANNOUNCEMENT_FILTER_OPTIONS.ruoli.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "figura") && (
					<FilterSelect
						id={`${idPrefix}-figura`}
						name="figura"
						label="Figura professionale"
						value={query.filters.figura}
						allLabel="Tutte le figure"
						options={ANNOUNCEMENT_FILTER_OPTIONS.figure.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "categoria") && (
					<FilterSelect
						id={`${idPrefix}-categoria`}
						name="categoria"
						label="Categoria"
						value={query.filters.categoria}
						allLabel="Tutte le categorie"
						options={ANNOUNCEMENT_FILTER_OPTIONS.categorie.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "automunito") && (
					<FilterSelect
						id={`${idPrefix}-automunito`}
						name="automunito"
						label="Automunito"
						value={query.filters.automunito}
						allLabel="Qualsiasi opzione"
						options={[...ANNOUNCEMENT_FILTER_OPTIONS.automunito]}
					/>
				)}

				{hasFilter(availableFilters, "costoMax") && (
					<FilterNumber
						id={`${idPrefix}-costo-massimo`}
						name="costoMax"
						label="Costo massimo"
						value={query.filters.costoMax}
					/>
				)}

				{hasFilter(availableFilters, "compensoMin") && (
					<FilterNumber
						id={`${idPrefix}-compenso-minimo`}
						name="compensoMin"
						label="Compenso minimo mensile"
						value={query.filters.compensoMin}
					/>
				)}
			</FieldGroup>

			<div className="flex gap-2">
				<Button type="submit" className="flex-1">Applica filtri</Button>
				<AnnouncementFiltersResetButton href={resetHref} />
			</div>
		</form>
	);
}

function FilterNumber({
	id,
	name,
	label,
	value,
}: {
	id: string;
	name: "costoMax" | "compensoMin";
	label: string;
	value: number | null;
}) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<InputGroup>
				<InputGroupInput
					key={value ?? "no-limit"}
					id={id}
					name={name}
					type="number"
					min={0}
					max={1_000_000}
					step="0.01"
					defaultValue={value ?? ""}
					placeholder={name === "compensoMin" ? "Nessun minimo" : "Nessun limite"}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupText>€</InputGroupText>
				</InputGroupAddon>
			</InputGroup>
		</Field>
	);
}

function FiltersUnavailable({selectedCount}: {selectedCount: number}) {
	const multiple = selectedCount > 1;
	return (
		<Alert>
			<InfoIcon aria-hidden="true" />
			<AlertTitle>{multiple ? "Filtri specifici disattivati" : "Scegli una tipologia"}</AlertTitle>
			<AlertDescription>
				{multiple
					? "Mantieni un solo tipo di annuncio selezionato per attivare i filtri dedicati. La ricerca testuale resta disponibile."
					: "Seleziona un solo tipo di annuncio per visualizzare i filtri più utili per quella categoria."}
			</AlertDescription>
		</Alert>
	);
}

function AnnouncementFiltersSheet({query}: {query: AnnouncementDirectoryQuery}) {
	const selectedType = query.types.length === 1 ? query.types[0] : null;
	const activeCount = getActiveAnnouncementFilterCount(query.filters);
	const triggerLabel = activeCount > 0
		? `Apri i filtri degli annunci, ${activeCount} ${activeCount === 1 ? "attivo" : "attivi"}`
		: "Apri i filtri degli annunci";

	return (
		<Sheet>
			<SheetTrigger
				render={<Button type="button" variant="outline" size="lg" className="h-12 shrink-0" />}
				aria-label={triggerLabel}
			>
				<SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
				<span className="hidden sm:inline">Filtri</span>
				{activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
			</SheetTrigger>
			<SheetContent side="left">
				<SheetHeader>
					<SheetTitle>Filtra gli annunci</SheetTitle>
					<SheetDescription>
						{selectedType
							? `Opzioni dedicate a “${announcementDirectoryOption(selectedType).label}”.`
							: "I filtri specifici richiedono una sola tipologia selezionata."}
					</SheetDescription>
				</SheetHeader>
				<div className="overflow-y-auto px-4 pb-6">
					{selectedType
						? <AnnouncementFiltersForm query={query} type={selectedType} idPrefix="sheet-filter" />
						: <FiltersUnavailable selectedCount={query.types.length} />}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function AnnouncementCard({announcement}: {announcement: AnnouncementDirectoryItem}) {
	const option = announcementOption(announcement.type);
	const TypeIcon = option.icon;
	const detailParams = new URLSearchParams({id: announcement.id});
	const detailHref = `/dettagli-annuncio?${detailParams.toString()}`;
	const formattedDate = formatAnnouncementDate(announcement.createdAt);
	const hasLocationFact = announcement.facts.some(({kind}) => kind === "location");

	return (
		<Card className="group relative h-full transition duration-200 focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:ring-fuchsia-300 hover:shadow-lg">
			<Link
				href={detailHref}
				className="absolute inset-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				aria-label={`Apri l'annuncio: ${announcement.title}`}
			/>
			<CardHeader className="pointer-events-none relative">
				<div className="mb-1 flex flex-wrap items-center gap-1.5">
					<Badge variant="outline" className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700">
						<TypeIcon data-icon="inline-start" aria-hidden="true" />
						{announcement.typeLabel}
					</Badge>
					{announcement.level && (
						<Badge variant="secondary">{humanizeValue(announcement.level)}</Badge>
					)}
				</div>
				<CardTitle className="text-lg"><h3>{announcement.title}</h3></CardTitle>
				<CardDescription className="mt-1 min-h-10 line-clamp-3">
					{announcement.description ?? "Informazioni aggiuntive non disponibili"}
				</CardDescription>
			</CardHeader>

			<CardContent className="pointer-events-none relative mt-auto">
				<dl className="grid grid-cols-2 gap-2 text-sm">
					{announcement.facts.slice(0, 4).map(({kind, label, value}) => (
						<div key={`${kind}:${label}`} className="min-w-0 rounded-lg bg-muted/50 p-3">
							<dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-3.5">
								<ListChecksIcon aria-hidden="true" />
								<span>{label}</span>
							</dt>
							<dd className="mt-1 truncate font-medium text-foreground" title={value}>{value}</dd>
						</div>
					))}
				</dl>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground [&_svg]:size-3.5">
					{!hasLocationFact && (
						<span className="flex items-center gap-1.5">
							<MapPinIcon aria-hidden="true" />
							<span className="line-clamp-1">{announcement.location}</span>
						</span>
					)}
					{announcement.createdAt ? (
						<time dateTime={announcement.createdAt} className="flex items-center gap-1.5">
							<CalendarDaysIcon aria-hidden="true" />
							{formattedDate}
						</time>
					) : (
						<span className="flex items-center gap-1.5">
							<CalendarDaysIcon aria-hidden="true" />
							{formattedDate}
						</span>
					)}
				</div>
			</CardContent>

			<CardFooter className="pointer-events-none relative justify-between gap-3">
				<div className="pointer-events-auto min-w-0 flex-1">
					<AnnouncementAuthorHoverCard author={announcement.author} />
				</div>
				<span className={cn(buttonVariants({size: "sm", variant: "outline"}), "pointer-events-none")}>
					Apri
					<ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
				</span>
			</CardFooter>
		</Card>
	);
}

function DirectoryPagination({query, result}: AnnunciProps) {
	if (result.totalPages <= 1) return null;
	const previousPage = Math.max(1, result.currentPage - 1);
	const nextPage = Math.min(result.totalPages, result.currentPage + 1);

	return (
		<nav aria-label="Paginazione degli annunci" className="flex flex-wrap items-center justify-between gap-3">
			<div>
				{result.currentPage > 1 && (
					<Link href={buildAnnouncementsHref(query, {page: previousPage})} className={buttonVariants({variant: "outline"})}>
						<ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
						Precedente
					</Link>
				)}
			</div>
			<p className="text-sm text-muted-foreground">Pagina {result.currentPage} di {result.totalPages}</p>
			<div>
				{result.currentPage < result.totalPages && (
					<Link href={buildAnnouncementsHref(query, {page: nextPage})} className={buttonVariants({variant: "outline"})}>
						Successiva
						<ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
					</Link>
				)}
			</div>
		</nav>
	);
}

function EmptyDirectory({query}: {query: AnnouncementDirectoryQuery}) {
	const resetHref = buildAnnouncementsHref(query, {
		q: "",
		page: 1,
		filters: createEmptyAnnouncementFilters(),
	});

	return (
		<Empty className="min-h-72 border bg-card">
			<EmptyHeader>
				<EmptyMedia variant="icon"><SearchIcon aria-hidden="true" /></EmptyMedia>
				<EmptyTitle>Nessun annuncio trovato</EmptyTitle>
				<EmptyDescription>
					Prova a cambiare la ricerca, rimuovere qualche filtro o selezionare altre tipologie.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Link href={resetHref} className={buttonVariants({variant: "outline"})}>
					Azzera ricerca e filtri
				</Link>
			</EmptyContent>
		</Empty>
	);
}

function showAllHref(query: AnnouncementDirectoryQuery) {
	const params = new URLSearchParams();
	if (query.q) params.set("q", query.q);
	const suffix = params.toString();
	return suffix ? `/annunci?${suffix}` : "/annunci";
}

export default function Annunci({query, result}: AnnunciProps) {
	const resultLabel = result.total === 1 ? "1 annuncio trovato" : `${result.total} annunci trovati`;

	return (
		<GradientBackground className="min-h-[calc(100vh-4rem)]">
			<div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
				<header className="max-w-3xl">
					<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Annunci</h1>
					<p className="mt-1 text-base leading-7 text-muted-foreground sm:text-lg">
						Scopri opportunità, ricerche e iniziative del calcio dilettantistico.
					</p>
				</header>

				<div className="mt-7">
					<AnnouncementSearch query={query} />
				</div>

				<section aria-labelledby="announcement-types-title" className="mt-1">
					<h2 id="announcement-types-title" className="sr-only">Tipologie di annuncio</h2>
					<div className="mt-3 flex items-center justify-between gap-4">
						{query.types.length > 0 && (
							<Link
								href={showAllHref(query)}
								className="mt-1 mb-2 text-sm font-medium text-fuchsia-700 underline-offset-4 hover:underline"
							>
								Mostra tutti
							</Link>
						)}
					</div>
					<AnnouncementTypeSelector selectedTypes={query.types} />
				</section>

				<Separator className="mt-4" />

				<div className={"w-full flex items-center justify-between mt-8"}>
					<Image
						src="/banner-pubblicita/placeholder.png"
						width={3840/10}
						height={1080/10}
						alt="Pubblicita per sponsor qui!"
					/>
					<Image
						src="/banner-pubblicita/placeholder.png"
						width={3840/10}
						height={1080/10}
						alt="Pubblicita per sponsor qui!"
					/>
					<Image
						src="/banner-pubblicita/placeholder.png"
						width={3840/10}
						height={1080/10}
						alt="Pubblicita per sponsor qui!"
					/>
				</div>

				<section aria-labelledby="announcements-results-title" className="mt-8 min-w-0">
					<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
						<h2 id="announcements-results-title" className="text-lg font-semibold tracking-tight">
							{resultLabel}
						</h2>
					</div>

					{result.error && (
						<Alert variant="destructive" className="mb-5">
							<InfoIcon aria-hidden="true" />
							<AlertTitle>Annunci temporaneamente non disponibili</AlertTitle>
							<AlertDescription>Riprova tra poco. La ricerca non ha modificato alcun dato.</AlertDescription>
						</Alert>
					)}

					{result.announcements.length > 0 ? (
						<div className="flex flex-col gap-6">
							<ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{result.announcements.map((announcement) => (
									<li key={announcement.id} className="h-full">
										<AnnouncementCard announcement={announcement} />
									</li>
								))}
							</ul>
							<DirectoryPagination query={query} result={result} />
						</div>
					) : !result.error && <EmptyDirectory query={query} />}
				</section>
			</div>
		</GradientBackground>
	);
}
