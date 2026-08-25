import {useEffect, useRef, type Dispatch, type SetStateAction} from "react";

import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import type {ProfileLocationDraft} from "@/features/profilo/profile-model";
import RegioniInteresseField, {
	type CittaComuniPerRegione,
} from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";

interface ProfileLocationsFieldProps {
	idPrefix: string;
	value: ProfileLocationDraft[];
	onValueChange: (value: ProfileLocationDraft[]) => void;
	required?: boolean;
	error?: string | null;
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
}: ProfileLocationsFieldProps) {
	const regions = locationsToRegions(value);
	const citiesByRegion = locationsToCities(value);
	const currentSelection = useRef({regions, citiesByRegion});

	useEffect(() => {
		currentSelection.current = {regions, citiesByRegion};
	}, [citiesByRegion, regions]);

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
			regioniInteressate={regions}
			setRegioniInteressate={setRegions}
			cittaComuniPerRegione={citiesByRegion}
			setCittaComuniPerRegione={setCitiesByRegion}
			required={required}
			error={error}
		/>
	);
}
