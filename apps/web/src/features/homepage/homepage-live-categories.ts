import type {AnnouncementDirectoryType} from "@/features/annunci/announcement-model";
import type {ProfileType} from "@/features/profilo/profile-model";

export const HOMEPAGE_LIVE_CATEGORIES = [
	{type: "giocatore", directoryType: "annuncio_giocatore", label: "annunci di giocatori"},
	{type: "squadra", directoryType: "annuncio_squadra", label: "annunci di squadre"},
	{type: "staff-sportivo", directoryType: "annuncio_staff_sportivo", label: "annunci di staff sportivi"},
	{type: "torneo-evento", directoryType: "annuncio_torneo_evento", label: "annunci di tornei/eventi"},
] as const satisfies readonly {type: ProfileType; directoryType: AnnouncementDirectoryType; label: string}[];

export type HomepageLiveType = typeof HOMEPAGE_LIVE_CATEGORIES[number]["type"];
export type HomepageAnnouncementCounts = Record<HomepageLiveType, number | null>;
