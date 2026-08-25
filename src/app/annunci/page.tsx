import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Annunci from "@/features/annunci/Annunci";
import {
	parseAnnouncementDirectoryQuery,
	type RawAnnouncementSearchParams,
} from "@/features/annunci/announcement-model";
import {loadPublicAnnouncementDirectory} from "@/features/annunci/server/queries";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata(
	"Annunci",
	"Scopri opportunità, ricerche e iniziative del calcio dilettantistico.",
	"/annunci",
);

interface AnnunciPageProps {
	searchParams: Promise<RawAnnouncementSearchParams>;
}

export default async function AnnunciPage({searchParams}: AnnunciPageProps) {
	const query = parseAnnouncementDirectoryQuery(await searchParams);
	const result = await loadPublicAnnouncementDirectory(query);

	return (
		<>
			<Navbar />
			<Annunci query={query} result={result} />
			<Footer />
		</>
	);
}
