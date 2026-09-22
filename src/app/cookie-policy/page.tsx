import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import EmbedLegalBlink from "@/components/legal/EmbedLegalBlink";

export const metadata: Metadata = dynamicMetadata(
	"Cookie policy"
);

export default function Page() {
	return (
		<>
			<Navbar backToHome={true} />
			<EmbedLegalBlink tipologia={"cookie-policy"} />
			<Footer />
		</>
	);
}