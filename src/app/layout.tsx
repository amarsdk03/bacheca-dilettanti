import React, {Suspense} from "react";
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
import Script from "next/script";

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
				<Suspense fallback={null}>
					<SupportBubble />
				</Suspense>
				<Analytics />
				<SpeedInsights />
				<Script
					type="text/javascript"
					src="https://app.legalblink.it/api/scripts/cmp/loader.js"
					data-license-id="6a96dd034295910029c0bcd2"
					data-blocking-mode="auto"
					data-consent-mode="true"
					data-tcf-enabled="true"
					strategy="afterInteractive"
					style={{"height": "50vh"}}
				/>
			</body>
		</html>
	);
}
