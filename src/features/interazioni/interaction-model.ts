import type {AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import type {ProfileType} from "@/features/profilo/profile-model";

export type InteractionTarget = {kind: "profilo" | "annuncio"; id: string};
export type InteractionState =
	| {status: "ready"; active: boolean}
	| {status: "guest" | "registration-required" | "own-profile" | "error"};

export type InteractionResult =
	| {status: "success"; active: boolean}
	| {status: "error"; message: string}
	| {status: "guest" | "registration-required"};

export interface RelationshipProfile {
	id: string;
	type: ProfileType;
	title: string;
	imageUrl: string | null;
	followedAt: string;
}

export interface SavedAnnouncement {
	announcement: AnnouncementDirectoryItem;
	savedAt: string;
}

export type InteractionList<T> = {status: "success"; items: T[]} | {status: "error"};

export interface DashboardInteractions {
	followers: InteractionList<RelationshipProfile>;
	following: InteractionList<RelationshipProfile>;
	savedAnnouncements: InteractionList<SavedAnnouncement>;
}

export function isInteractionId(value: unknown): value is string {
	return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const SAVED_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
	day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
});

export function formatSavedDate(value: string) {
	return SAVED_DATE_FORMATTER.format(new Date(value));
}

// Hydration may omit unavailable content or return rows in another order.
// Always walk the saved rows, already ordered by the database, to preserve dates.
export function resolveSavedAnnouncements(
	rows: readonly {uuid_annuncio: string; salvato_il: string}[],
	announcements: readonly AnnouncementDirectoryItem[],
): SavedAnnouncement[] {
	const byId = new Map(announcements.map((item) => [item.id, item]));
	return rows.flatMap((row) => {
		const announcement = byId.get(row.uuid_annuncio);
		return announcement ? [{announcement, savedAt: row.salvato_il}] : [];
	});
}
