import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

import Aggiornamenti from "@/features/aggiornamenti/Aggiornamenti";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

export const metadata: Metadata = dynamicMetadata(
	"Aggiornamenti"
);

export default function Page() {
	return (
		<>
			<Navbar backToHome={true} />
			<Aggiornamenti />
			<Footer />
		</>
	);
}