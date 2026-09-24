import React from "react";
import "./globals.css";

import type {Metadata} from "next";
import {dynamicMetadata, getSiteUrl, SITE_DESCRIPTION, SITE_NAME} from "@/server/metadata";
import {Analytics} from "@vercel/analytics/next";
import {SpeedInsights} from "@vercel/speed-insights/next"

import {TooltipProvider} from "@/components/ui/tooltip";
import {Toaster} from "@/components/ui/toast";
import {interFont, latoFont, oswaldFont} from "@/app/fonts";
import JsonLd from "@/components/seo/JsonLd";
import SupportBubble from "@/components/support/SupportBubble";

export const metadata: Metadata = dynamicMetadata();

const websiteStructuredData = [
	{
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": `${getSiteUrl()}#organization`,
		name: SITE_NAME,
		url: getSiteUrl(),
		logo: getSiteUrl("/logo.png"),
	},
	{
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${getSiteUrl()}#website`,
		name: SITE_NAME,
		description: SITE_DESCRIPTION,
		url: getSiteUrl(),
		inLanguage: "it-IT",
		publisher: {"@id": `${getSiteUrl()}#organization`},
	},
];

export default function RootLayout(
	{
		children,
	} : Readonly<{
		children: React.ReactNode;
	}>
) {
	// noinspection HtmlRequiredTitleElement
	return (
		<html
			lang="it"
			className={`${interFont.variable} ${oswaldFont.variable} ${latoFont.variable} font-sans`}
		>
			<body className="min-h-full flex flex-col">
				<JsonLd data={websiteStructuredData} />
				<TooltipProvider>
					<main>{children}</main>
				</TooltipProvider>
				<Toaster />
				<React.Suspense fallback={null}><SupportBubble /></React.Suspense>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
