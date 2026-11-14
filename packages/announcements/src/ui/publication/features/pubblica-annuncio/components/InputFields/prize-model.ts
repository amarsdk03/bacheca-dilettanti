import type {TournamentPrize} from '@bacheca/announcements/features/pubblica-annuncio/publish-model';
export type PremioTrofeo = TournamentPrize;
export const MAX_PREMI_TROFEI = 20;
export const createPremioTrofeo = (): PremioTrofeo => ({id: crypto.randomUUID(), posto: '', titoloPremio: ''});
