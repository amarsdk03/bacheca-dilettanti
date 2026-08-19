import type {Metadata} from "next";
import {redirect} from "next/navigation";

import Registrati from "@/features/auth/Registrati";
import {getCurrentViewer} from "@/features/auth/queries";
import {sanitizeNextPath} from "@/features/auth/utils";
import {dynamicMetadata} from "@/server/metadata";
import Navbar from "@/components/navigation/Navbar";
import {CONTACT_EMAIL_FALLBACK} from "@/const/contactConstants";

export const metadata: Metadata = dynamicMetadata("Registrati");

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	if (await getCurrentViewer()) redirect("/profilo");

	const params = await searchParams;
	const nextPath = sanitizeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
	const contactEmail = process.env.CONTACT_EMAIL ?? CONTACT_EMAIL_FALLBACK;

	return (
		<>
			<Navbar minimal={true} backToHome={true} />
			<Registrati nextPath={nextPath} contactEmail={contactEmail} />
		</>
	);
}
