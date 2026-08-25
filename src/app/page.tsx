import {Metadata} from "next";
import {redirect} from "next/navigation";
import {dynamicMetadata} from "@/server/metadata";

import Homepage from "@/features/homepage/Homepage";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

export const metadata: Metadata = dynamicMetadata(
	"Home"
);

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
			<Navbar />
			<Homepage />
			<Footer />
		</>
	);
}
