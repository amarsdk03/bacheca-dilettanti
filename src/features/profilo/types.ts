import type {ProfileDraft, ProfileDrafts, ProfileLocations, ProfileType,} from "@/features/profilo/profile-model";
import type {ProfileSocialLinks, ProfileSocialLinksByType} from "@/features/profilo/profile-social-links";
import type {AnnouncementType} from "@/features/annunci/announcement-model";
import type {DashboardInteractions} from "@/features/interazioni/interaction-model";

export type ProfileDashboardSection = "profilo" | "annunci" | "relazioni" | "salvati" | "impostazioni" | "info";

export interface ManagedProfile {
	id: string;
	profileId: string;
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
	isPrivate: boolean;
	moderationStatus: string | null;
	moderationInfo: string | null;
}

export interface ProfileEditorSavePayload {
	type: ProfileType;
	draft: ProfileDraft;
	locations: ProfileLocations[ProfileType];
	socialLinks: ProfileSocialLinks;
}

export interface ProfileDashboardData {
	interactions: DashboardInteractions;
	newsletterSubscribed: boolean;
	mainImageUrl: string | null;
	hasMainImage: boolean;
	profiles: ManagedProfile[];
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	socialLinks: ProfileSocialLinksByType;
	announcements: ManagedAnnouncement[];
}

export type ProfileMutationResult =
	| {status: "success"; message: string}
	| {status: "error"; message: string};

export type ProfileImageMutationResult =
	| {status: "success"; message: string; imageUrl: string | null}
	| {status: "error"; message: string};
