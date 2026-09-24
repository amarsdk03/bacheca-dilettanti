import Link from "next/link";
import {Suspense} from "react";
import ProfileCard from "@/features/profili/components/cards/ProfileCard";
import {ArrowLeftIcon, ArrowRightIcon, InfoIcon, SearchIcon, SlidersHorizontalIcon,} from "lucide-react";

import GradientBackground from "@/components/styling/GradientBackground";
import {DirectoryResultsSkeleton} from "@/components/loading/PageSkeletons";
import {DirectoryFilterSubmitButton, DirectoryGetForm, DirectorySearchButton} from "@/components/navigation/DirectoryGetForm";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Button, buttonVariants} from "@/components/ui/button";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,} from "@/components/ui/empty";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,} from "@/components/ui/sheet";
import {
	buildProfilesHref,
	createEmptyProfileFilters,
	getActiveProfileFilterCount,
	getProfileFilterEntries,
	PROFILE_FILTER_OPTIONS,
	PROFILE_FILTERS_BY_TYPE,
	type ProfileDirectoryQuery,
	type ProfileDirectoryResult,
	type ProfileFilterParam,
} from "@/features/profili/profile-directory-model";
import ProfileTypeSelector from "@/features/profili/ProfileTypeSelector";
import ProfileFiltersResetButton from "@/features/profili/ProfileFiltersResetButton";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import {Separator} from "@/components/ui/separator";
import Image from "next/image";

interface ProfiliProps {
	query: ProfileDirectoryQuery;
	result: Promise<ProfileDirectoryResult>;
}

interface FilterSelectOption {
	value: string;
	label: string;
}

function profileTypeOption(type: ProfileType) {
	return PROFILE_OPTIONS.find(({value}) => value === type) ?? PROFILE_OPTIONS[0];
}

function ProfileQueryHiddenFields({query, includeQuery}: {
	query: ProfileDirectoryQuery;
	includeQuery: boolean;
}) {
	return (
		<>
			{includeQuery && query.q && <input type="hidden" name="q" value={query.q} />}
			{query.types.map((type) => <input key={type} type="hidden" name="type" value={type} />)}
			{getProfileFilterEntries(query.filters).map(([key, value]) => (
				<input key={key} type="hidden" name={key} value={value} />
			))}
		</>
	);
}

function ProfileSearch({query}: {query: ProfileDirectoryQuery}) {
	return (
		<div className="flex items-end gap-2">
			<DirectoryGetForm action="/profili" role="search" className="min-w-0 flex-1">
				<ProfileQueryHiddenFields query={query} includeQuery={false} />
				<Field>
					<FieldLabel htmlFor="profile-search" className="sr-only">Cerca tra i profili</FieldLabel>
					<InputGroup className="h-12 rounded-xl bg-background px-1 shadow-sm">
						<InputGroupInput
							key={query.q}
							id="profile-search"
							name="q"
							defaultValue={query.q}
							placeholder="Cerca per nome, ruolo, località o specializzazione…"
							maxLength={100}
						/>
						<InputGroupAddon align="inline-end">
						<DirectorySearchButton />
						</InputGroupAddon>
					</InputGroup>
				</Field>
			</DirectoryGetForm>
			<ProfileFiltersSheet query={query} />
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

function hasFilter(filters: readonly ProfileFilterParam[], filter: ProfileFilterParam) {
	return filters.includes(filter);
}

function ProfileFiltersForm({query, type, idPrefix}: {
	query: ProfileDirectoryQuery;
	type: ProfileType;
	idPrefix: string;
}) {
	const availableFilters = PROFILE_FILTERS_BY_TYPE[type] as readonly ProfileFilterParam[];
	const resetHref = buildProfilesHref(query, {
		page: 1,
		filters: createEmptyProfileFilters(),
	});

	return (
		<DirectoryGetForm action="/profili" className="flex flex-col gap-5">
			<ProfileQueryHiddenFields
				query={{...query, filters: createEmptyProfileFilters()}}
				includeQuery
			/>
			<FieldGroup className="gap-4">
				{hasFilter(availableFilters, "regione") && (
					<FilterSelect
						id={`${idPrefix}-regione`}
						name="regione"
						label="Regione"
						value={query.filters.regione}
						allLabel="Tutte le regioni"
						options={PROFILE_FILTER_OPTIONS.regioni.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "tipologia") && (
					<FilterSelect
						id={`${idPrefix}-tipologia`}
						name="tipologia"
						label="Tipologia di calcio"
						value={query.filters.tipologia}
						allLabel="Tutte le tipologie"
						options={PROFILE_FILTER_OPTIONS.tipologie.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "ruolo") && (
					<FilterSelect
						id={`${idPrefix}-ruolo`}
						name="ruolo"
						label="Ruolo principale"
						value={query.filters.ruolo}
						allLabel="Tutti i ruoli"
						options={PROFILE_FILTER_OPTIONS.ruoli.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "figura") && (
					<FilterSelect
						id={`${idPrefix}-figura`}
						name="figura"
						label="Figura professionale"
						value={query.filters.figura}
						allLabel="Tutte le figure"
						options={PROFILE_FILTER_OPTIONS.figure.map((value) => ({value, label: value}))}
					/>
				)}

				{hasFilter(availableFilters, "disponibilita") && (
					<FilterSelect
						id={`${idPrefix}-disponibilita`}
						name="disponibilita"
						label="Disponibilità"
						value={query.filters.disponibilita}
						allLabel="Qualsiasi disponibilità"
						options={[...PROFILE_FILTER_OPTIONS.disponibilita]}
					/>
				)}

				{hasFilter(availableFilters, "automunito") && (
					<FilterSelect
						id={`${idPrefix}-automunito`}
						name="automunito"
						label="Automunito"
						value={query.filters.automunito}
						allLabel="Qualsiasi opzione"
						options={[...PROFILE_FILTER_OPTIONS.automunito]}
					/>
				)}

				{hasFilter(availableFilters, "costoMax") && (
					<Field>
						<FieldLabel htmlFor={`${idPrefix}-costo-massimo`}>Costo massimo di partenza</FieldLabel>
						<InputGroup>
							<InputGroupInput
								key={query.filters.costoMax ?? "no-limit"}
								id={`${idPrefix}-costo-massimo`}
								name="costoMax"
								type="number"
								min={0}
								max={1_000_000}
								step="0.01"
								defaultValue={query.filters.costoMax ?? ""}
								placeholder="Nessun limite"
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>€</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</Field>
				)}
			</FieldGroup>

			<div className="flex gap-2">
				<DirectoryFilterSubmitButton />
				<ProfileFiltersResetButton href={resetHref} />
			</div>
		</DirectoryGetForm>
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
					? "Mantieni un solo tipo di profilo selezionato per attivare i filtri dedicati. La ricerca testuale resta disponibile."
					: "Seleziona un solo tipo di profilo per visualizzare i filtri più utili per quella categoria."}
			</AlertDescription>
		</Alert>
	);
}

function ProfileFiltersSheet({query}: {query: ProfileDirectoryQuery}) {
	const selectedType = query.types.length === 1 ? query.types[0] : null;
	const activeCount = getActiveProfileFilterCount(query.filters);
	const triggerLabel = activeCount > 0
		? `Apri i filtri dei profili, ${activeCount} ${activeCount === 1 ? "attivo" : "attivi"}`
		: "Apri i filtri dei profili";

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
					<SheetTitle>Filtra i profili</SheetTitle>
					<SheetDescription>
						{selectedType
							? `Opzioni dedicate a “${profileTypeOption(selectedType).label}”.`
							: "I filtri specifici richiedono una sola tipologia selezionata."}
					</SheetDescription>
				</SheetHeader>
				<div className="overflow-y-auto px-4 pb-6">
					{selectedType
						? <ProfileFiltersForm query={query} type={selectedType} idPrefix="sheet-filter" />
						: <FiltersUnavailable selectedCount={query.types.length} />}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function DirectoryPagination({query, result}: {query: ProfileDirectoryQuery; result: ProfileDirectoryResult}) {
	if (result.totalPages <= 1) return null;
	const previousPage = Math.max(1, result.currentPage - 1);
	const nextPage = Math.min(result.totalPages, result.currentPage + 1);

	return (
		<nav aria-label="Paginazione dei profili" className="flex flex-wrap items-center justify-between gap-3">
			<div>
				{result.currentPage > 1 && (
					<Link href={buildProfilesHref(query, {page: previousPage})} className={buttonVariants({variant: "outline"})}>
						<ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
						Precedente
					</Link>
				)}
			</div>
			<p className="text-sm text-muted-foreground">Pagina {result.currentPage} di {result.totalPages}</p>
			<div>
				{result.currentPage < result.totalPages && (
					<Link href={buildProfilesHref(query, {page: nextPage})} className={buttonVariants({variant: "outline"})}>
						Successiva
						<ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
					</Link>
				)}
			</div>
		</nav>
	);
}

function EmptyDirectory({query}: {query: ProfileDirectoryQuery}) {
	const resetHref = buildProfilesHref(query, {
		q: "",
		page: 1,
		filters: createEmptyProfileFilters(),
	});
	return (
		<Empty className="min-h-72 border bg-card">
			<EmptyHeader>
				<EmptyMedia variant="icon"><SearchIcon aria-hidden="true" /></EmptyMedia>
				<EmptyTitle>Nessun profilo trovato</EmptyTitle>
				<EmptyDescription>
					Prova a cambiare la ricerca, rimuovere qualche filtro o selezionare altre tipologie.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Link href={resetHref} className={buttonVariants({variant: "outline"})}>Azzera ricerca e filtri</Link>
			</EmptyContent>
		</Empty>
	);
}

async function ProfileResults({query, result: resultPromise}: ProfiliProps) {
	const result = await resultPromise;
	const resultLabel = result.total === 1 ? "1 profilo trovato" : `${result.total} profili trovati`;

	return (
		<>
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<h2 id="profiles-results-title" className="text-lg font-semibold tracking-tight">{resultLabel}</h2>
			</div>
			{result.error && (
				<Alert variant="destructive" className="mb-5">
					<InfoIcon aria-hidden="true" />
					<AlertTitle>Profili temporaneamente non disponibili</AlertTitle>
					<AlertDescription>Riprova tra poco. La ricerca non ha modificato alcun dato.</AlertDescription>
				</Alert>
			)}
			{result.profiles.length > 0 ? (
				<div className="flex flex-col gap-6">
					<ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{result.profiles.map((profile) => (
							<li key={`${profile.id}:${profile.type}`} className="h-full"><ProfileCard profile={profile} /></li>
						))}
					</ul>
					<DirectoryPagination query={query} result={result} />
				</div>
			) : !result.error && <EmptyDirectory query={query} />}
		</>
	);
}

export default function Profili({query, result}: ProfiliProps) {
	return (
		<GradientBackground className="min-h-[calc(100vh-4rem)]">
			<div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
				<header className="max-w-3xl">
					<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Profili</h1>
					<p className="mt-1 text-base leading-7 text-muted-foreground sm:text-lg">
						Scopri giocatori, squadre, staff e realtà del calcio dilettantistico.
					</p>
				</header>

				<div className="mt-3 sm:mt-6">
					<ProfileSearch query={query} />
				</div>

				<section aria-labelledby="profile-types-title" className="mt-1">
					<h2 id="profile-types-title" className="sr-only">Tipologie di profilo</h2>
					<div className="mt-3 flex items-center justify-between gap-4">
						{
							query.types.length > 0 && (
								<Link href={buildProfilesHref({...query, types: [], filters: createEmptyProfileFilters(), page: 1})} className="mb-3 ms-1 text-sm font-medium text-brand-indigo underline-offset-4 hover:underline">
									Mostra tutti
								</Link>
							)
						}
					</div>
					<ProfileTypeSelector selectedTypes={query.types} />
				</section>

				<Separator className="mt-4" />

				<div className={"w-full flex items-center justify-between mt-8"}>
					<Image
						src={"/banner-pubblicita/placeholder.png"}
						width={3840/10}
						height={1080/10}
						alt={"Pubblicita per sponsor qui!"}
						loading={"eager"}
					/>
					<Image
						src={"/banner-pubblicita/placeholder.png"}
						width={3840/10}
						height={1080/10}
						alt={"Pubblicita per sponsor qui!"}
						loading={"eager"}
					/>
					<Image
						src={"/banner-pubblicita/placeholder.png"}
						width={3840/10}
						height={1080/10}
						alt={"Pubblicita per sponsor qui!"}
						loading={"eager"}
					/>
				</div>

				<section aria-labelledby="profiles-results-title" className="mt-8 min-w-0">
					<Suspense key={buildProfilesHref(query)} fallback={<DirectoryResultsSkeleton kind="profili" />}>
						<ProfileResults query={query} result={result} />
					</Suspense>
				</section>
			</div>
		</GradientBackground>
	);
}
