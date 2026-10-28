import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import type {ProfileLocationDraft} from "@/features/profilo/profile-model";

export const PROFESSIONAL_REGIONS_EMPTY_MESSAGE = "Nessuna regione abilitata per questo profilo. Contatta l’amministratore.";
export const PROFESSIONAL_REGIONS_ERROR = "Seleziona solo regioni abilitate dall’amministratore per questo profilo.";
export const PROFESSIONAL_REGIONS_SUSPENDED_MESSAGE = "Visibilità pubblica sospesa: non sono presenti zone di pubblicazione abilitate.";

export function professionalAllowedRegions(regions: readonly string[] | null | undefined): string[] {
    const selected = new Set(regions ?? []);
    return REGIONI_ITALIANE.map(({nome}) => nome).filter(region => selected.has(region));
}

export function professionalLocationsAllowed(locations: readonly ProfileLocationDraft[], regions: readonly string[]): boolean {
    return locations.length > 0 && locations.every(({regione}) => regions.includes(regione));
}
