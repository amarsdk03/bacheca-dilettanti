import React from "react";
import "./globals.css";

import type { Metadata } from "next";
import {dynamicMetadata} from "@/server/metadata";
import {Analytics} from "@vercel/analytics/next";

import {Inter} from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import {Toaster} from "sonner";

const interFont = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = dynamicMetadata();

export default function RootLayout({
	                                   children,
                                   }: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="it" className={`${interFont.variable} font-sans`}>
			<body className="min-h-full flex flex-col">
				<TooltipProvider>
					<main>{children}</main>
				</TooltipProvider>
				<Toaster position="bottom-right" richColors />
				<Analytics />
			</body>
		</html>
	);
}
