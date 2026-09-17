import type {
	ProfileDraft,
	ProfileLocations,
	ProfileType,
	ProfileDrafts,
} from "@/features/profilo/profile-model";
import type {AnnouncementType} from "@/features/annunci/announcement-model";

export type ProfileDashboardSection = "profilo" | "annunci" | "impostazioni" | "info";

export interface ManagedProfile {
	id: string;
	type: ProfileType;
	isPrimary: boolean;
	imageUrl: string | null;
	hasCustomImage: boolean;
}

export type AnnouncementVisibility = "visible" | "hidden";
export type AnnouncementFilter = "all" | AnnouncementVisibility;

export interface ManagedAnnouncement {
	id: string;
	announcementType: AnnouncementType | null;
	profileType: ProfileType;
	type: string;
	subtype: string;
	title: string;
	description: string;
	location: string;
	createdAt: string | null;
	level: string | null;
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
	mainImageUrl: string | null;
	hasMainImage: boolean;
	profiles: ManagedProfile[];
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	announcements: ManagedAnnouncement[];
}

export type ProfileMutationResult =
	| {status: "success"; message: string}
	| {status: "error"; message: string};

export type ProfileImageMutationResult =
	| {status: "success"; message: string; imageUrl: string | null}
	| {status: "error"; message: string};
