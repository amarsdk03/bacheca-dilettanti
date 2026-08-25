import type {Metadata} from "next";
import {notFound} from "next/navigation";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import DettagliAnnuncioPubblico from "@/features/annunci/DettagliAnnuncioPubblico";
import {
	isValidAnnouncementId,
	type RawAnnouncementSearchParams,
} from "@/features/annunci/announcement-model";
import {loadPublicAnnouncementDetail} from "@/features/annunci/server/queries";
import {dynamicMetadata} from "@/server/metadata";

interface DettagliAnnuncioPageProps {
	searchParams: Promise<RawAnnouncementSearchParams>;
}

function announcementId(params: RawAnnouncementSearchParams) {
	const value = params.id;
	return !Array.isArray(value) && isValidAnnouncementId(value) ? value : null;
}

export async function generateMetadata({
	searchParams,
}: DettagliAnnuncioPageProps): Promise<Metadata> {
	const id = announcementId(await searchParams);
	const canonicalPath = id
		? `/dettagli-annuncio?${new URLSearchParams({id}).toString()}`
		: "/dettagli-annuncio";

	return {
		...dynamicMetadata(
			"Dettaglio annuncio",
			"Consulta le informazioni e i contatti pubblici di un annuncio su Bacheca Dilettanti.",
			canonicalPath,
		),
		robots: {
			index: false,
			follow: true,
		},
	};
}

export default async function DettagliAnnuncioPage({
	searchParams,
}: DettagliAnnuncioPageProps) {
	const id = announcementId(await searchParams);
	if (!id) notFound();

	const result = await loadPublicAnnouncementDetail(id);
	if (result.status === "not-found") notFound();

	return (
		<>
			<Navbar />
			<DettagliAnnuncioPubblico result={result} />
			<Footer />
		</>
	);
}
