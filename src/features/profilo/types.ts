import type {
	ProfileDraft,
	ProfileLocations,
	ProfileType,
	ProfileDrafts,
} from "@/features/profilo/profile-model";

export type ProfileDashboardSection = "profilo" | "annunci" | "impostazioni" | "info";

export interface ManagedProfile {
	id: string;
	type: ProfileType;
	isPrimary: boolean;
}

export type AnnouncementVisibility = "visible" | "hidden";
export type AnnouncementFilter = "all" | AnnouncementVisibility;

export interface ManagedAnnouncement {
	id: string;
	type: string;
	subtype: string;
	title: string;
	description: string;
	location: string;
	createdAt: string | null;
	visibility: AnnouncementVisibility;
	moderationStatus: string | null;
	moderationInfo: string | null;
}

export interface ProfileEditorSavePayload {
	type: ProfileType;
	draft: ProfileDraft;
	locations: ProfileLocations[ProfileType];
}

export interface ProfileDashboardData {
	profiles: ManagedProfile[];
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	announcements: ManagedAnnouncement[];
}

export type ProfileMutationResult =
	| {status: "success"; message: string}
	| {status: "error"; message: string};
