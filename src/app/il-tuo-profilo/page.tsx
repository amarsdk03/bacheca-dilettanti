import type {Metadata} from "next";
import {redirect} from "next/navigation";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import {requireAuthenticatedViewer} from "@/features/auth/server/queries";
import IlTuoProfilo from "@/features/profilo/IlTuoProfilo";
import {getProfileDashboardData} from "@/features/profilo/server/queries";
import type {ProfileDashboardSection} from "@/features/profilo/types";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Il tuo profilo");
export const dynamic = "force-dynamic";

interface IlTuoProfiloPageProps {
	searchParams: Promise<{
		password?: string | string[];
		sezione?: string | string[];
	}>;
}

function getDashboardSection(value: string | string[] | undefined): ProfileDashboardSection {
	const section = Array.isArray(value) ? value[0] : value;
	return section === "annunci" || section === "impostazioni" || section === "info"
		? section
		: "profilo";
}

export default async function IlTuoProfiloPage({searchParams}: IlTuoProfiloPageProps) {
	const [account, params] = await Promise.all([requireAuthenticatedViewer(), searchParams]);
	if (!account.registeredAt || !account.utenteId) redirect("/registrati");
	const dashboardData = await getProfileDashboardData(account.utenteId);
	const passwordParam = Array.isArray(params.password) ? params.password[0] : params.password;
	const passwordUpdated = passwordParam === "aggiornata";
	const initialSection = passwordUpdated ? "impostazioni" : getDashboardSection(params.sezione);

	return (
		<>
			<Navbar />
			<IlTuoProfilo
				key={initialSection}
				viewer={account.viewer}
				data={dashboardData}
				passwordUpdated={passwordUpdated}
				initialSection={initialSection}
			/>
			<Footer whiteBackground />
		</>
	);
}
