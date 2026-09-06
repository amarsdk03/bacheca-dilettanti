import React from "react";
import "./globals.css";

import type { Metadata } from "next";
import {dynamicMetadata} from "@/server/metadata";
import {Analytics} from "@vercel/analytics/next";
import {SpeedInsights} from "@vercel/speed-insights/next"

import {TooltipProvider} from "@/components/ui/tooltip";
import {Toaster} from "@/components/ui/toast";
import {interFont, latoFont, oswaldFont} from "@/app/fonts";

export const metadata: Metadata = dynamicMetadata();

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
				<TooltipProvider>
					<main>{children}</main>
				</TooltipProvider>
				<Toaster />
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
