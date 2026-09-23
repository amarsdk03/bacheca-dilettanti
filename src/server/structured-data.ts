import "server-only";

import type {ArticleMetadata} from "@/lib/articles";
import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import type {ProfileDetail} from "@/features/dettagli-profilo/profile-detail-model";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import {publicProfileLocationLabel} from "@/features/profilo/public-profile-locations";
import {getSiteUrl, metadataDescription, SITE_NAME} from "@/server/metadata";

export function profileTypeLabel(type: ProfileType) {
	return PROFILE_OPTIONS.find(({value}) => value === type)?.label ?? "Profilo";
}

function publicUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
	} catch {
		return null;
	}
}

export function profileMetadataDescription(profile: ProfileDetail) {
	const presentation = profile.type === "giocatore"
		? profile.player.presentation
		: [...profile.primaryFields, ...profile.fields]
			.find(({label, value}) => label === "Presentazione" && value !== "Non specificato")?.value;
	const location = publicProfileLocationLabel(profile.locations);
	return metadataDescription(
		presentation,
		`${profileTypeLabel(profile.type)}${location ? ` a ${location}` : ""} su ${SITE_NAME}.`,
	);
}

function profileSchemaType(type: ProfileType) {
	if (["giocatore", "staff-sportivo", "professionisti-studi", "arbitro"].includes(type)) return "Person";
	if (type === "squadra") return "SportsTeam";
	if (type === "campi-impianti-sportivi") return "SportsActivityLocation";
	return "Organization";
}

export function profileStructuredData(profile: ProfileDetail, path: string) {
	const locations = profile.locations.map(({city, region}) => ({
		"@type": "PostalAddress",
		addressLocality: city || undefined,
		addressRegion: region,
		addressCountry: "IT",
	}));
	const sameAs = Object.values(profile.socialLinks).flatMap((value) => publicUrl(value) ?? []);
	return {
		"@context": "https://schema.org",
		"@type": "ProfilePage",
		url: getSiteUrl(path),
		name: `${profile.title} - ${profileTypeLabel(profile.type)}`,
		description: profileMetadataDescription(profile),
		mainEntity: {
			"@type": profileSchemaType(profile.type),
			name: profile.title,
			...(profile.imageUrl ? {image: profile.imageUrl} : {}),
			...(locations.length === 1 ? {address: locations[0]} : {}),
			...(locations.length > 1 ? {areaServed: locations} : {}),
			...(sameAs.length ? {sameAs} : {}),
		},
	};
}

export function announcementMetadataDescription(announcement: AnnouncementDetail) {
	return metadataDescription(
		announcement.description,
		`${announcement.typeLabel}${announcement.location ? ` a ${announcement.location}` : ""} su ${SITE_NAME}.`,
	);
}

export function announcementStructuredData(announcement: AnnouncementDetail, path: string) {
	const author = announcement.author.kind === "registered"
		? {"@type": "Person", name: announcement.author.title}
		: {"@type": "Organization", name: SITE_NAME};
	return {
		"@context": "https://schema.org",
		"@type": "ItemPage",
		url: getSiteUrl(path),
		name: announcement.title,
		description: announcementMetadataDescription(announcement),
		dateCreated: announcement.createdAt || undefined,
		mainEntity: {
			"@type": "CreativeWork",
			name: announcement.title,
			description: announcementMetadataDescription(announcement),
			genre: announcement.typeLabel,
			author,
			...(announcement.shareImageUrl ? {image: getSiteUrl(announcement.shareImageUrl)} : {}),
		},
	};
}

export function articleStructuredData(article: ArticleMetadata, path: string, coverImage: string) {
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		mainEntityOfPage: getSiteUrl(path),
		headline: article.title,
		description: article.description,
		image: getSiteUrl(coverImage),
		datePublished: article.date,
		author: {"@type": "Person", name: article.author},
		publisher: {
			"@type": "Organization",
			name: SITE_NAME,
			logo: {"@type": "ImageObject", url: getSiteUrl("/logo.png")},
		},
		articleSection: article.category,
		keywords: article.tags.join(", "),
	};
}
