import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import {type AnnouncementPreviewData, formatPreviewStatus} from "@/features/pubblica-annuncio/announcement-preview";
import AnnouncementPreviewCard from "@/features/pubblica-annuncio/components/AnnouncementPreviewCard";

export function announcementDetailPreview(announcement: AnnouncementDetail): AnnouncementPreviewData {
	const author = announcement.author.kind === "registered" ? announcement.author.title : announcement.anonymousAuthorInfo?.name ?? announcement.author.label;
	return {
		id: announcement.id, announcementType: announcement.type, profileType: announcement.profileType,
		title: announcement.title, typeLabel: announcement.typeLabel, author,
		description: announcement.description, locations: announcement.locations,
		// Public contacts remain exclusively in the authenticated sidebar.
		contacts: [], facts: announcement.facts, fields: announcement.fields, playerRoles: announcement.playerRoles ?? null,
		genericLink: announcement.announcementLink, imageUrl: announcement.shareImageUrl, imageLabel: null,
		status: formatPreviewStatus(announcement.moderationStatus), statusInfo: null,
		linkedTeams: announcement.linkedTeams, summarySections: announcement.summarySections,
	};
}

export default function AnnouncementDetailsRecap({announcement}: {announcement: AnnouncementDetail}) {
	return <AnnouncementPreviewCard preview={announcementDetailPreview(announcement)} />;
}
