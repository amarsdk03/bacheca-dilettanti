import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

import PubblicaAnnuncio from "@/features/pubblica-annuncio/PubblicaAnnuncio";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

export const metadata: Metadata = dynamicMetadata(
	"Pubblica annuncio"
);

export default function Page() {
	return (
		<>
			<Navbar minimal={true} backToHome={true} />
			<PubblicaAnnuncio />
			<Footer whiteBackground={true} />
		</>
	);
}