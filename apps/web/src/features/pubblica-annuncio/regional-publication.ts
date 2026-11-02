import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {isValidAnnouncementId} from "@/features/annunci/announcement-model";

export interface RegionalAnnouncementReference {id: string; region: string | null; status?: string}
export interface RegionalPublication {publicationId: string; announcementId: string; announcements: RegionalAnnouncementReference[]}

/** Only validated server receipts become navigation targets or confirmation links. */
export function parseRegionalPublication(value: unknown): RegionalPublication | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const result = value as Record<string, unknown>;
	if (result.status !== "success" || !isValidAnnouncementId(result.publicationId) || !isValidAnnouncementId(result.announcementId) || !Array.isArray(result.announcements) || result.announcements.length < 1 || result.announcements.length > REGIONI_ITALIANE.length) return null;
	const items: RegionalAnnouncementReference[] = [];
	for (const raw of result.announcements) {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
		const item = raw as Record<string, unknown>;
		if (!isValidAnnouncementId(item.id) || !(item.region === null || typeof item.region === "string" && REGIONI_ITALIANE.some(region => region.nome === item.region))) return null;
		items.push({id: item.id, region: item.region, ...(typeof item.status === "string" ? {status: item.status} : {})});
	}
	if (new Set(items.map(item => item.id)).size !== items.length || new Set(items.map(item => item.region)).size !== items.length || !items.some(item => item.id === result.announcementId)) return null;
	return {publicationId: result.publicationId, announcementId: result.announcementId, announcements: items};
}
