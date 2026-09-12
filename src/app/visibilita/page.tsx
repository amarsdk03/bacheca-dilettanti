import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

import Visibilita from "@/features/visibilita/Visibilita";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

export const metadata: Metadata = dynamicMetadata(
	"Visibilità"
);

export default function Page() {
	return (
		<>
			<Navbar />
			<Visibilita />
			<Footer whiteBackground={true} />
		</>
	);
}