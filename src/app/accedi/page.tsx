import type {Metadata} from "next";
import {redirect} from "next/navigation";

import Accedi from "@/features/accedi/Accedi";
import {getCurrentViewer} from "@/features/auth/server/queries";
import {sanitizeNextPath} from "@/features/auth/utils";
import {dynamicMetadata} from "@/server/metadata";
import HomepageWorkInProgressNotice from "@/features/homepage/components/HomepageWorkInProgressNotice";

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
		<div className="flex h-svh flex-col overflow-hidden">
			<HomepageWorkInProgressNotice onNavbar />
			<Accedi nextPath={nextPath} invalidConfirmationLink={confirmationError === "verifica-email"} />
		</div>
	);
}
