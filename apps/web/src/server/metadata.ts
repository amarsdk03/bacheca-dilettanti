import type {Metadata} from "next";

export const SITE_NAME = "Bacheca Dilettanti";
export const SITE_DESCRIPTION = "Cerca, pubblica e rendi visibile il tuo profilo calcistico online, facile e veloce";
export const SITE_LOCALE = "it_IT";
export const DEFAULT_SOCIAL_IMAGE = "/banner.png";

const DEVELOPMENT_SITE_URL = "http://localhost:3000";

export interface MetadataImageOptions {
	url: string;
	alt: string;
	width?: number;
	height?: number;
}

export interface PageMetadataOptions {
	title?: string | null;
	description?: string | null;
	canonicalPath?: string | null;
	openGraphPath?: string | null;
	image?: MetadataImageOptions | null;
	openGraphType?: "website" | "article" | "profile";
	twitterCard?: "summary" | "summary_large_image";
	index?: boolean;
	follow?: boolean;
	keywords?: string[];
}

export function getSiteUrl(path = "/") {
	return new URL(path, process.env.NEXT_PUBLIC_SITE_URL || DEVELOPMENT_SITE_URL).toString();
}

export function metadataDescription(...values: Array<string | null | undefined>) {
	const normalized = values
		.map((value) => value?.replace(/\s+/g, " ").trim())
		.find((value): value is string => Boolean(value));
	if (!normalized) return SITE_DESCRIPTION;
	if (normalized.length <= 180) return normalized;

	const shortened = normalized.slice(0, 177);
	const lastSpace = shortened.lastIndexOf(" ");
	return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 177).trimEnd()}…`;
}

/** Builds complete metadata for static and dynamic pages. */
export function dynamicMetadata(options: PageMetadataOptions = {}): Metadata {
	const pageTitle = options.title?.trim();
	const title = pageTitle ? `${pageTitle} - ${SITE_NAME}` : SITE_NAME;
	const pageDescription = metadataDescription(options.description);
	const canonicalPath = options.canonicalPath || "/";
	const openGraphPath = options.openGraphPath || canonicalPath;
	const image = options.image ?? {
		url: DEFAULT_SOCIAL_IMAGE,
		alt: "Bacheca Dilettanti, il punto d'incontro del calcio dilettantistico",
		width: 1254,
		height: 627,
	};
	const socialImage = {
		url: image.url,
		alt: image.alt,
		...(image.width ? {width: image.width} : {}),
		...(image.height ? {height: image.height} : {}),
	};

	return {
		metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || DEVELOPMENT_SITE_URL),
		title,
		applicationName: SITE_NAME,
		description: pageDescription,
		creator: SITE_NAME,
		publisher: SITE_NAME,
		category: "sport",
		keywords: options.keywords,
		formatDetection: {address: false, email: false, telephone: false},
		icons: {
			icon: [
				{url: "/favicon.ico"},
				{url: "/favicon-32x32.png", sizes: "32x32", type: "image/png"},
				{url: "/favicon-16x16.png", sizes: "16x16", type: "image/png"},
			],
			apple: [{url: "/apple-touch-icon.png"}],
		},
		manifest: "/manifest.json",
		alternates: {canonical: canonicalPath},
		openGraph: {
			title,
			description: pageDescription,
			siteName: SITE_NAME,
			url: openGraphPath,
			locale: SITE_LOCALE,
			type: options.openGraphType ?? "website",
			images: [socialImage],
		},
		twitter: {
			card: options.twitterCard ?? "summary_large_image",
			title,
			description: pageDescription,
			images: [socialImage],
		},
		appleWebApp: {capable: true, title: SITE_NAME, statusBarStyle: "default"},
		robots: {
			index: options.index ?? true,
			follow: options.follow ?? true,
			googleBot: {
				index: options.index ?? true,
				follow: options.follow ?? true,
				"max-image-preview": "large",
				"max-snippet": -1,
				"max-video-preview": -1,
			},
		},
	};
}
