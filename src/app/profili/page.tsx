import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Profili from "@/features/profili/Profili";
import {
	parseProfileDirectoryQuery,
	type RawProfileSearchParams,
} from "@/features/profili/profile-directory-model";
import {getProfileDirectory} from "@/features/profili/server/queries";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata(
	"Profili",
	"Scopri giocatori, squadre, staff e realtà del calcio dilettantistico.",
	"/profili",
);

interface ProfiliPageProps {
	searchParams: Promise<RawProfileSearchParams>;
}

export default async function ProfiliPage({searchParams}: ProfiliPageProps) {
	const query = parseProfileDirectoryQuery(await searchParams);
	const result = await getProfileDirectory(query);

	return (
		<>
			<Navbar />
			<Profili query={query} result={result} />
			<Footer />
		</>
	);
}
