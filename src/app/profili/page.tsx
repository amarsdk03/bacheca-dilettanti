import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Profili from "@/features/profili/Profili";
import {
	buildProfilesHref,
	getProfileFilterEntries,
	parseProfileDirectoryQuery,
	type RawProfileSearchParams,
} from "@/features/profili/profile-directory-model";
import {getProfileDirectory} from "@/features/profili/server/queries";
import {dynamicMetadata} from "@/server/metadata";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";

interface ProfiliPageProps {
	searchParams: Promise<RawProfileSearchParams>;
}

export async function generateMetadata({searchParams}: ProfiliPageProps): Promise<Metadata> {
	const query = parseProfileDirectoryQuery(await searchParams);
	const typeLabels = query.types.map((type) =>
		PROFILE_OPTIONS.find(({value}) => value === type)?.label ?? type,
	);
	const filters = getProfileFilterEntries(query.filters).map(([, value]) => value);
	const customized = Boolean(query.q || typeLabels.length || filters.length || query.page > 1);
	const subject = typeLabels.length ? typeLabels.join(" e ") : "profili";
	const searchLabel = query.q.length > 55 ? `${query.q.slice(0, 52).trimEnd()}…` : query.q;
	const qualifiers = [query.q ? `ricerca “${query.q}”` : null, ...filters].filter(Boolean);
	const contextualSubject = searchLabel ? `${subject} per “${searchLabel}”` : subject;
	const title = customized
		? `${contextualSubject.charAt(0).toUpperCase()}${contextualSubject.slice(1)}${query.page > 1 ? ` · Pagina ${query.page}` : ""}`
		: "Profili";
	const description = qualifiers.length
		? `Scopri ${subject.toLocaleLowerCase("it-IT")} del calcio dilettantistico: ${qualifiers.join(", ")}.`
		: "Scopri giocatori, squadre, staff e realtà del calcio dilettantistico.";

	return dynamicMetadata({
		title,
		description,
		canonicalPath: "/profili",
		openGraphPath: buildProfilesHref(query),
		index: !customized,
		follow: true,
	});
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
