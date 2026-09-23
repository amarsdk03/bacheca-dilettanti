import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import EmbedLegalBlink from "@/components/legal/EmbedLegalBlink";

export const metadata: Metadata = dynamicMetadata({
	title: "Termini di servizio",
	description: "Termini e condizioni per utilizzare i servizi di Bacheca Dilettanti.",
	canonicalPath: "/termini-di-servizio",
});

export default function Page() {
	return (
		<>
			<Navbar backToHome={true} />
			<EmbedLegalBlink tipologia={"termini-e-condizioni"} />
			<Footer />
		</>
	);
}
