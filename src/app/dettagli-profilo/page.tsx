import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {cache} from "react";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import {ExternalNavigationProvider} from "@/components/navigation/ExternalNavigation";
import JsonLd from "@/components/seo/JsonLd";
import DettagliProfilo from "@/features/dettagli-profilo/DettagliProfilo";
import {
	parseProfileDetailParams,
	type RawProfileDetailSearchParams,
} from "@/features/dettagli-profilo/profile-detail-model";
import {getProfileDetail} from "@/features/dettagli-profilo/server/profile-detail-query";
import {dynamicMetadata} from "@/server/metadata";
import {profileMetadataDescription, profileStructuredData, profileTypeLabel,} from "@/server/structured-data";

interface DettagliProfiloPageProps {
	searchParams: Promise<RawProfileDetailSearchParams>;
}

const loadProfileDetail = cache(getProfileDetail);

function profilePath(id: string, type: string) {
	return `/dettagli-profilo?${new URLSearchParams({id, type}).toString()}`;
}

export async function generateMetadata(
	{searchParams}: DettagliProfiloPageProps,
): Promise<Metadata> {
	const params = parseProfileDetailParams(await searchParams);
	if (!params) return dynamicMetadata({
		title: "Profilo non disponibile",
		description: "Il profilo richiesto non è disponibile.",
		canonicalPath: "/dettagli-profilo",
		index: false,
		follow: false,
	});

	const path = profilePath(params.id, params.type);
	const result = await loadProfileDetail(params.id, params.type);
	if (result.status !== "ok") return dynamicMetadata({
		title: "Profilo non disponibile",
		description: "Il profilo richiesto non è disponibile.",
		canonicalPath: path,
		index: false,
		follow: false,
	});

	const {profile} = result;
	const personProfile = ["giocatore", "staff-sportivo", "professionisti-studi", "arbitro"]
		.includes(profile.type);
	return dynamicMetadata({
		title: `${profile.title} · ${profileTypeLabel(profile.type)}`,
		description: profileMetadataDescription(profile),
		canonicalPath: path,
		image: profile.imageUrl ? {
			url: profile.imageUrl,
			alt: `Foto profilo di ${profile.title}`,
			width: 1024,
			height: 1024,
		} : null,
		openGraphType: personProfile ? "profile" : "website",
		twitterCard: profile.imageUrl ? "summary" : "summary_large_image",
		index: true,
		follow: true,
	});
}

export default async function DettagliProfiloPage({searchParams}: DettagliProfiloPageProps) {
	const params = parseProfileDetailParams(await searchParams);
	if (!params) notFound();

	const result = await loadProfileDetail(params.id, params.type);
	if (result.status === "not-found") notFound();
	const path = profilePath(params.id, params.type);

	return (
		<ExternalNavigationProvider key={`${params.id}:${params.type}`}>
			{result.status === "ok" && <JsonLd data={profileStructuredData(result.profile, path)} />}
			<Navbar />
			<DettagliProfilo result={result} />
			<Footer />
		</ExternalNavigationProvider>
	);
}
