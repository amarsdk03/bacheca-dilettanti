import type {Metadata} from "next";

import EmailLinkConfirmation from "@/features/auth/EmailLinkConfirmation";
import {parseEmailLinkCredential} from "@/features/auth/email-link";
import {dynamicMetadata} from "@/server/metadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
	...dynamicMetadata({title: "Conferma indirizzo email", canonicalPath: "/auth/confirm", index: false, follow: false}),
	referrer: "no-referrer",
};

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	const credential = parseEmailLinkCredential(await searchParams, "email");
	return <EmailLinkConfirmation kind="signup" credential={credential} />;
}
