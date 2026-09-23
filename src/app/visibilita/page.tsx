import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

import Visibilita from "@/features/visibilita/Visibilita";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

export const metadata: Metadata = dynamicMetadata({
	title: "Visibilità",
	description: "Scopri come aumentare la visibilità del tuo profilo e dei tuoi annunci nel calcio dilettantistico.",
	canonicalPath: "/visibilita",
});

export default function Page() {
	return (
		<>
			<Navbar />
			<Visibilita />
			<Footer whiteBackground={true} />
		</>
	);
}
