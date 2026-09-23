import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {cache} from "react";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import {ExternalNavigationProvider} from "@/components/navigation/ExternalNavigation";
import JsonLd from "@/components/seo/JsonLd";
import DettagliAnnuncioPubblico from "@/features/annunci/DettagliAnnuncioPubblico";
import {isValidAnnouncementId, type RawAnnouncementSearchParams,} from "@/features/annunci/announcement-model";
import {loadPublicAnnouncementDetail} from "@/features/annunci/server/queries";
import {announcementPreviewNotice} from "@/features/annunci/announcement-visibility";
import {dynamicMetadata, metadataDescription} from "@/server/metadata";
import {announcementMetadataDescription, announcementStructuredData} from "@/server/structured-data";

interface DettagliAnnuncioPageProps {
	searchParams: Promise<RawAnnouncementSearchParams>;
}

const loadDetail = cache(loadPublicAnnouncementDetail);

function announcementId(params: RawAnnouncementSearchParams) {
	const value = params.id;
	return !Array.isArray(value) && isValidAnnouncementId(value) ? value : null;
}

export async function generateMetadata({
	searchParams,
}: DettagliAnnuncioPageProps): Promise<Metadata> {
	const id = announcementId(await searchParams);
	const result = id ? await loadDetail(id) : null;
	const canonicalPath = id
		? `/dettagli-annuncio?${new URLSearchParams({id}).toString()}`
		: "/dettagli-annuncio";
	if (result?.status !== "success") return dynamicMetadata({
		title: "Annuncio non disponibile",
		description: "L’annuncio richiesto non è disponibile.",
		canonicalPath,
		index: false,
		follow: false,
	});

	const {announcement} = result;
	const notice = announcement.isListed
		? null
		: announcementPreviewNotice(announcement.moderationStatus);
	const authorImage = announcement.author.kind === "registered"
		? announcement.author.imageUrl
		: null;
	const imageUrl = announcement.shareImageUrl ?? authorImage;

	return dynamicMetadata({
		title: notice ? `${notice.title}: ${announcement.title}` : announcement.title,
		description: notice
			? metadataDescription(`${notice.description} ${announcementMetadataDescription(announcement)}`)
			: announcementMetadataDescription(announcement),
		canonicalPath,
		image: imageUrl ? {
			url: imageUrl,
			alt: `Immagine dell’annuncio “${announcement.title}”`,
			...(authorImage === imageUrl ? {width: 1024, height: 1024} : {}),
		} : null,
		twitterCard: authorImage === imageUrl ? "summary" : "summary_large_image",
		index: announcement.isListed,
		follow: announcement.isListed,
	});
}

export default async function DettagliAnnuncioPage({
	searchParams,
}: DettagliAnnuncioPageProps) {
	const id = announcementId(await searchParams);
	if (!id) notFound();

	const result = await loadDetail(id);
	if (result.status === "not-found") notFound();
	const path = `/dettagli-annuncio?${new URLSearchParams({id}).toString()}`;

	return (
		<ExternalNavigationProvider key={id}>
			{result.status === "success" && <JsonLd data={announcementStructuredData(result.announcement, path)} />}
			<Navbar />
			<DettagliAnnuncioPubblico result={result} />
			<Footer />
		</ExternalNavigationProvider>
	);
}
