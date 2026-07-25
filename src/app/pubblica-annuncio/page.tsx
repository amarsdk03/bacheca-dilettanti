import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";
import Navbar from "@/components/navbar/Navbar";
import PubblicaAnnuncio from "@/features/pubblica-annuncio/PubblicaAnnuncio";

export const metadata: Metadata = dynamicMetadata(
	"Pubblica annuncio"
);

export default function Page() {
	return (
		<>
			<Navbar backToHome={true} />
			<PubblicaAnnuncio />
		</>
	);
}