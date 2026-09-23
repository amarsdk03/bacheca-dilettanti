import type {Metadata} from "next";
import {redirect} from "next/navigation";

import PasswordDimenticata from "@/features/accedi/PasswordDimenticata";
import {getCurrentViewer} from "@/features/auth/server/queries";
import {dynamicMetadata} from "@/server/metadata";
import Navbar from "@/components/navigation/Navbar";

export const metadata: Metadata = dynamicMetadata({
	title: "Password dimenticata",
	description: "Richiedi il collegamento per recuperare l’accesso al tuo account.",
	canonicalPath: "/password-dimenticata",
	index: false,
	follow: false,
});

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	if (await getCurrentViewer()) redirect("/il-tuo-profilo");

	const params = await searchParams;
	const error = Array.isArray(params.errore) ? params.errore[0] : params.errore;

	return (
		<>
			<Navbar backToHome={true} minimal={true} />
			<PasswordDimenticata invalidLink={error === "link-scaduto"} />
		</>
	);
}
