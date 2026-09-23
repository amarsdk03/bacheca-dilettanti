import type {Metadata} from "next";

import Errore404 from "@/features/status-pages/Errore404";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({
	title: "Pagina non trovata",
	description: "La pagina richiesta non è disponibile.",
	index: false,
	follow: false,
});

export default function NotFound() {
	return (
		<Errore404 />
	);
}
