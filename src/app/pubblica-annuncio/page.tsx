import type {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

import PubblicaAnnuncio from "@/features/pubblica-annuncio/PubblicaAnnuncio";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {getPublishProfileContext} from "@/features/pubblica-annuncio/server/queries";

export const metadata: Metadata = dynamicMetadata(
	"Pubblica annuncio"
);
export const dynamic = "force-dynamic";

export default async function Page() {
	const account = await getAuthenticatedViewer();
	const registered = Boolean(account?.registeredAt);
	const profileContext = registered && account?.utenteId
		? await getPublishProfileContext(account.utenteId)
		: null;

	return (
		<>
			<Navbar minimal={true} backToHome={true} />
			<PubblicaAnnuncio
				authenticated={Boolean(account)}
				registered={registered}
				profileContext={profileContext}
			/>
			<Footer whiteBackground={true} />
		</>
	);
}
