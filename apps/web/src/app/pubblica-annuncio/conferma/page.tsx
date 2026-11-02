import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import ConfermaPubblicazione from "@/features/pubblica-annuncio/ConfermaPubblicazione";
import {
	loadPublishConfirmation,
	loadRegionalPublishConfirmation
} from "@/features/pubblica-annuncio/server/confirmation";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({
	title: "Annuncio inviato",
	description: "Conferma e anteprima dell’annuncio inviato.",
	canonicalPath: "/pubblica-annuncio/conferma",
	index: false,
	follow: false,
});

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{id?: string | string[]; publication?: string | string[]}>;
}) {
	const params = await searchParams;
	const id = typeof params.id === "string" ? params.id : "";
	const publication = typeof params.publication === "string" ? params.publication : "";
	const result = publication ? await loadRegionalPublishConfirmation(publication, id) : await loadPublishConfirmation(id);

	return (
		<>
			<Navbar minimal backToHome />
			<ConfermaPubblicazione result={result} />
			<Footer whiteBackground />
		</>
	);
}
