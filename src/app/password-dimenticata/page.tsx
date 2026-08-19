import type {Metadata} from "next";
import {redirect} from "next/navigation";

import PasswordDimenticata from "@/features/auth/PasswordDimenticata";
import {getCurrentViewer} from "@/features/auth/queries";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Password dimenticata");

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	if (await getCurrentViewer()) redirect("/profilo");

	const params = await searchParams;
	const error = Array.isArray(params.errore) ? params.errore[0] : params.errore;

	return <PasswordDimenticata invalidLink={error === "link-scaduto"} />;
}
