import {Metadata} from "next";
import {redirect} from "next/navigation";
import {Suspense} from "react";
import {dynamicMetadata} from "@/server/metadata";

import Homepage from "@/features/homepage/Homepage";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import {NavbarSkeleton} from "@/components/loading/PageSkeletons";

export const metadata: Metadata = dynamicMetadata({
	description: "Profili, annunci e opportunità per giocatori, squadre e professionisti del calcio dilettantistico.",
	canonicalPath: "/",
	keywords: ["calcio dilettantistico", "annunci calcio", "profili calciatori", "squadre di calcio"],
});

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	const params = await searchParams;
	const legacyCode = Array.isArray(params.code) ? params.code[0] : params.code;

	if (legacyCode) {
		redirect(`/auth/confirm?code=${encodeURIComponent(legacyCode)}`);
	}

	return (
		<>
			<Suspense fallback={<NavbarSkeleton workInProgress={false} />}><Navbar workInProgress={false} /></Suspense>
			<Homepage />
			<Footer />
		</>
	);
}
