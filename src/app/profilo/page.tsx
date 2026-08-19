import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Profilo from "@/features/auth/Profilo";
import {requireViewer} from "@/features/auth/queries";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Profilo");

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	const [viewer, params] = await Promise.all([requireViewer(), searchParams]);
	const passwordUpdated = (Array.isArray(params.password) ? params.password[0] : params.password) === "aggiornata";

	return (
		<>
			<Navbar />
			<Profilo viewer={viewer} passwordUpdated={passwordUpdated} />
			<Footer />
		</>
	);
}
