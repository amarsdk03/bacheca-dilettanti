import type {Metadata} from "next";
import {Suspense} from "react";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import {NavbarSkeleton} from "@/components/loading/PageSkeletons";
import Annunci from "@/features/annunci/Annunci";
import {
	announcementDirectoryOption,
	buildAnnouncementsHref,
	getAnnouncementFilterEntries,
	parseAnnouncementDirectoryQuery,
	type RawAnnouncementSearchParams,
} from "@/features/annunci/announcement-model";
import {loadPublicAnnouncementDirectory} from "@/features/annunci/server/queries";
import {dynamicMetadata} from "@/server/metadata";

interface AnnunciPageProps {
	searchParams: Promise<RawAnnouncementSearchParams>;
}

export async function generateMetadata({searchParams}: AnnunciPageProps): Promise<Metadata> {
	const query = parseAnnouncementDirectoryQuery(await searchParams);
	const typeLabels = query.types.map((type) => announcementDirectoryOption(type).label);
	const filters = getAnnouncementFilterEntries(query.filters).map(([, value]) => value);
	const customized = Boolean(query.q || typeLabels.length || filters.length || query.page > 1);
	const subject = typeLabels.length ? typeLabels.join(" e ") : "annunci";
	const searchLabel = query.q.length > 55 ? `${query.q.slice(0, 52).trimEnd()}…` : query.q;
	const qualifiers = [query.q ? `ricerca “${query.q}”` : null, ...filters].filter(Boolean);
	const contextualSubject = searchLabel ? `${subject} per “${searchLabel}”` : subject;
	const title = customized
		? `${contextualSubject.charAt(0).toUpperCase()}${contextualSubject.slice(1)}${query.page > 1 ? ` · Pagina ${query.page}` : ""}`
		: "Annunci";
	const description = qualifiers.length
		? `Scopri ${subject.toLocaleLowerCase("it-IT")} nel calcio dilettantistico: ${qualifiers.join(", ")}.`
		: "Scopri opportunità, ricerche e iniziative del calcio dilettantistico.";

	return dynamicMetadata({
		title,
		description,
		canonicalPath: "/annunci",
		openGraphPath: buildAnnouncementsHref(query),
		index: !customized,
		follow: true,
	});
}

export default async function AnnunciPage({searchParams}: AnnunciPageProps) {
	const query = parseAnnouncementDirectoryQuery(await searchParams);
	const result = loadPublicAnnouncementDirectory(query);

	return (
		<>
			<Suspense fallback={<NavbarSkeleton />}><Navbar /></Suspense>
			<Annunci query={query} result={result} />
			<Footer />
		</>
	);
}
