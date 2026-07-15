import type {Metadata} from "next";

const defaultName = "Bacheca Dilettanti";
const defaultDescription = "Cerca, pubblica e rendi visibile il tuo profilo calcistico online, facile e veloce";
const defaultLogoUrl = "/logo.png";

export function dynamicMetadata(
	title?: string | null,
	description?: string | null,
	url?: string | null,
	image?: string | null,
) : Metadata {
	return {
		metadataBase: new URL(
			process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
		),
		title: title ? `${title} - ${defaultName}` : defaultName,
		applicationName: defaultName,
		description: description || defaultDescription,
		icons: [
			{
				url: defaultLogoUrl,
				sizes: "192x192",
				type: "image/png"
			},
			{
				url: defaultLogoUrl,
				sizes: "320x320",
				type: "image/png"
			}
		],
		manifest: "/manifest.json",
		alternates: {
			canonical: url || '/',
		},
		openGraph: {
			title: title ? `${title} - ${defaultName}` : defaultName,
			description: description || defaultDescription,
			siteName: defaultName,
			url: url || `/`,
			locale: 'it_IT',
			type: 'website',
			images: [
				{
					url: image ?? defaultLogoUrl,
					width: 320,
					height: 320,
					alt: `Logo ${defaultName}`,
				},
			],
		},
		twitter: {
			card: "summary",
			title: title ? `${title} - ${defaultName}` : defaultName,
			description: description || defaultDescription,
		},
		appleWebApp: {
			capable: true,
			title: defaultName,
			statusBarStyle: 'default',
		},
		robots: {
			index: true,
			follow: true,
		},
	};
}