import type {Metadata} from "next";
import {notFound} from "next/navigation";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import DettagliProfilo from "@/features/profili/DettagliProfilo";
import {
	parseProfileDetailParams,
	type RawProfileDetailSearchParams,
} from "@/features/profili/profile-detail-model";
import {getProfileDetail} from "@/features/profili/server/profile-detail-query";
import {dynamicMetadata} from "@/server/metadata";

interface DettagliProfiloPageProps {
	searchParams: Promise<RawProfileDetailSearchParams>;
}

export async function generateMetadata(
	{searchParams}: DettagliProfiloPageProps,
): Promise<Metadata> {
	const params = parseProfileDetailParams(await searchParams);
	const canonicalParams = params
		? new URLSearchParams({id: params.id, type: params.type})
		: null;
	const canonicalPath = canonicalParams
		? `/dettagli-profilo?${canonicalParams.toString()}`
		: "/dettagli-profilo";

	return {
		...dynamicMetadata(
			"Dettaglio profilo",
			"Consulta le informazioni pubbliche di un profilo della community di Bacheca Dilettanti.",
			canonicalPath,
		),
		robots: {
			index: false,
			follow: true,
		},
	};
}

export default async function DettagliProfiloPage({searchParams}: DettagliProfiloPageProps) {
	const params = parseProfileDetailParams(await searchParams);
	if (!params) notFound();

	const result = await getProfileDetail(params.id, params.type);
	if (result.status === "not-found") notFound();

	return (
		<>
			<Navbar />
			<DettagliProfilo result={result} />
			<Footer />
		</>
	);
}
