import type {Metadata} from "next";
import {redirect} from "next/navigation";

import Registrati from "@/features/registrati/Registrati";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {sanitizeNextPath} from "@/features/auth/utils";
import {dynamicMetadata} from "@/server/metadata";
import Navbar from "@/components/navigation/Navbar";

export const metadata: Metadata = dynamicMetadata("Registrati");

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	const account = await getAuthenticatedViewer();
	if (account?.registeredAt) redirect("/il-tuo-profilo");

	const params = await searchParams;
	const nextPath = sanitizeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);

	return (
		<>
			<Navbar minimal={true} backToHome={true} />
			<Registrati
				nextPath={nextPath}
				existingSessionEmail={account?.viewer.email ?? null}
			/>
		</>
	);
}
