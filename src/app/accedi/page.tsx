import type {Metadata} from "next";
import {redirect} from "next/navigation";

import Accedi from "@/features/accedi/Accedi";
import {getCurrentViewer} from "@/features/auth/server/queries";
import {sanitizeNextPath} from "@/features/auth/utils";
import {dynamicMetadata} from "@/server/metadata";
import Navbar from "@/components/navigation/Navbar";

export const metadata: Metadata = dynamicMetadata("Accedi");

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	if (await getCurrentViewer()) redirect("/il-tuo-profilo");

	const params = await searchParams;
	const nextPath = sanitizeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
	const confirmationError = Array.isArray(params.errore) ? params.errore[0] : params.errore;

	return (
		<>
			<Navbar minimal={true} backToHome={true} />
			<Accedi nextPath={nextPath} invalidConfirmationLink={confirmationError === "verifica-email"} />
		</>
	);
}
