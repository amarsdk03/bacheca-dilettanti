import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import ConfermaPubblicazione from "@/features/pubblica-annuncio/ConfermaPubblicazione";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Annuncio inviato");

export default function Page() {
	return (
		<>
			<Navbar minimal backToHome />
			<ConfermaPubblicazione />
			<Footer whiteBackground />
		</>
	);
}
