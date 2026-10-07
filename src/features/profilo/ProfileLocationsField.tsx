import {type Dispatch, type SetStateAction, useEffect, useRef} from "react";

import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {PROFESSIONAL_REGIONS_EMPTY_MESSAGE} from "@/features/profilo/professional-regions";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type {ProfileLocationDraft} from "@/features/profilo/profile-model";
import FieldRequirementIndicator from "@/features/pubblica-annuncio/components/InputFields/FieldRequirementIndicator";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import RegioniInteresseField, {
	type CittaComuniPerRegione,
} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";

interface ProfileLocationsFieldProps {
	idPrefix: string;
	value: ProfileLocationDraft[];
	onValueChange: (value: ProfileLocationDraft[]) => void;
	required?: boolean;
	error?: string | null;
	mode?: "single" | "multiple";
	label?: string;
	allowedRegions?: readonly string[];
}

function locationsToRegions(value: readonly ProfileLocationDraft[]) {
	const selectedRegions = new Set(value.map((location) => location.regione));
	return REGIONI_ITALIANE
		.map((region) => region.nome)
		.filter((region) => selectedRegions.has(region));
}

function locationsToCities(value: readonly ProfileLocationDraft[]) {
	return value.reduce<CittaComuniPerRegione>((citiesByRegion, location) => {
		if (!location.citta) return citiesByRegion;
		citiesByRegion[location.regione] = [
			...(citiesByRegion[location.regione] ?? []),
			location.citta,
		];
		return citiesByRegion;
	}, {});
}

function selectionToLocations(
	regions: readonly string[],
	citiesByRegion: CittaComuniPerRegione,
): ProfileLocationDraft[] {
	return regions.flatMap<ProfileLocationDraft>((region) => {
		const cities = citiesByRegion[region] ?? [];
		return cities.length > 0
			? cities.map((city) => ({regione: region, citta: city}))
			: [{regione: region, citta: null}];
	});
}

export default function ProfileLocationsField({
	idPrefix,
	value,
	onValueChange,
	required = false,
	error,
	mode = "multiple",
	label = "Regioni interessate",
	allowedRegions,
}: ProfileLocationsFieldProps) {
	const regions = locationsToRegions(value);
	const citiesByRegion = locationsToCities(value);
	const currentSelection = useRef({regions, citiesByRegion});

	useEffect(() => {
		currentSelection.current = {regions, citiesByRegion};
	}, [citiesByRegion, regions]);

	if (allowedRegions?.length === 0) {
		return <FieldSet>
			<FieldLegend variant="label" className="field-legend-title">{label} <FieldRequirementIndicator required={required} /></FieldLegend>
			<FieldDescription>{PROFESSIONAL_REGIONS_EMPTY_MESSAGE}</FieldDescription>
		</FieldSet>;
	}

	if (mode === "single") {
		const first = value[0];
		const region = first?.regione ?? "";
		return (
			<FieldSet>
				<FieldLegend variant="label" className="field-legend-title">{label}</FieldLegend>
				<FieldGroup className="grid gap-4 sm:grid-cols-2">
					<Field data-invalid={Boolean(error)}>
						<FieldLabel htmlFor={`${idPrefix}-regione`}>Regione <FieldRequirementIndicator required={required} /></FieldLabel>
						<Select value={region || null} onValueChange={(selected) => onValueChange(selected ? [{regione: selected, citta: null}] : [])}>
							<SelectTrigger id={`${idPrefix}-regione`} className="w-full" aria-required={required} aria-invalid={Boolean(error)}><SelectValue placeholder="Seleziona una regione" /></SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{REGIONI_ITALIANE.filter(({nome}) => allowedRegions === undefined || allowedRegions.includes(nome)).map(({nome}) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}
								</SelectGroup>
							</SelectContent>
						</Select>
						{error && <FieldError>{error}</FieldError>}
					</Field>
					<Field>
						<FieldLabel htmlFor={`${idPrefix}-citta`}>Città/comune <OptionalLabel /></FieldLabel>
						<Input id={`${idPrefix}-citta`} value={first?.citta ?? ""} onChange={(event) => onValueChange([{regione: region, citta: event.target.value || null}])} disabled={!region} maxLength={120} placeholder="Es. Roma" />
					</Field>
				</FieldGroup>
			</FieldSet>
		);
	}
	const setRegions: Dispatch<SetStateAction<string[]>> = (nextRegions) => {
		const resolvedRegions = typeof nextRegions === "function"
			? nextRegions(currentSelection.current.regions)
			: nextRegions;
		const nextSelection = {
			regions: resolvedRegions,
			citiesByRegion: currentSelection.current.citiesByRegion,
		};
		currentSelection.current = nextSelection;
		onValueChange(selectionToLocations(nextSelection.regions, nextSelection.citiesByRegion));
	};

	const setCitiesByRegion: Dispatch<SetStateAction<CittaComuniPerRegione>> = (nextCities) => {
		const resolvedCities = typeof nextCities === "function"
			? nextCities(currentSelection.current.citiesByRegion)
			: nextCities;
		const nextSelection = {
			regions: currentSelection.current.regions,
			citiesByRegion: resolvedCities,
		};
		currentSelection.current = nextSelection;
		onValueChange(selectionToLocations(nextSelection.regions, nextSelection.citiesByRegion));
	};

	return (
		<RegioniInteresseField
			idPrefix={idPrefix}
			label={label}
			allowedRegions={allowedRegions}
			regioniInteressate={regions}
			setRegioniInteressate={setRegions}
			cittaComuniPerRegione={citiesByRegion}
			setCittaComuniPerRegione={setCitiesByRegion}
			required={required}
			error={error}
		/>
	);
}
