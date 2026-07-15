import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {dynamicMetadata} from "@/server/metadata";
import React from "react";
import {Toaster} from "sonner";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = dynamicMetadata();

export default function RootLayout({
	                                   children,
                                   }: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="it"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
		<body className="min-h-full flex flex-col">
			<main>{children}</main>
			<Toaster />
		</body>
		</html>
	);
}
