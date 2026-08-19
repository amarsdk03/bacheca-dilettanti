import type {Metadata} from "next";
import {redirect} from "next/navigation";

import EffettuaAccesso from "@/features/auth/EffettuaAccesso";
import {getCurrentViewer} from "@/features/auth/queries";
import {dynamicMetadata} from "@/server/metadata";
import Navbar from "@/components/navigation/Navbar";

export const metadata: Metadata = dynamicMetadata(
	"Come vuoi continuare?",
	"Accedi, crea un account oppure pubblica gratuitamente un annuncio come ospite.",
);

export default async function Page() {
	if (await getCurrentViewer()) redirect("/profilo");

	return (
		<>
			<Navbar backToHome={true} />
			<EffettuaAccesso />
		</>
	);
}
