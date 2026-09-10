import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import ConfermaPubblicazione from "@/features/pubblica-annuncio/ConfermaPubblicazione";
import {loadPublishConfirmation} from "@/features/pubblica-annuncio/server/confirmation";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Annuncio inviato");

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{id?: string | string[]}>;
}) {
	const params = await searchParams;
	const id = typeof params.id === "string" ? params.id : "";
	const result = await loadPublishConfirmation(id);

	return (
		<>
			<Navbar minimal backToHome />
			<ConfermaPubblicazione result={result} />
			<Footer whiteBackground />
		</>
	);
}
