import type {Metadata} from "next";
import {redirect} from "next/navigation";
import AccessoRiservato from "@/components/redirects/AccessoRiservato";
import {isSiteAccessConfigured, sanitizeSiteAccessNextPath} from "@/lib/site-access";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({
	title: "Accesso riservato",
	description: "Inserisci la password per accedere a Bacheca Dilettanti.",
	canonicalPath: "/accesso",
	index: false,
	follow: false,
});

export default async function Page({searchParams}: {
	searchParams: Promise<{next?: string | string[]}>;
}) {
	if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") redirect("/in-manutenzione");
	if (process.env.SITE_ACCESS_RESTRICTED !== "true") redirect("/");
	const params = await searchParams;
	return <AccessoRiservato nextPath={sanitizeSiteAccessNextPath(params.next)} available={isSiteAccessConfigured()} />;
}
