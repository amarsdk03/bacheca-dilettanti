import InManutenzione from "@/components/redirects/InManutenzione";

import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({
	title: "In manutenzione",
	description: "Sito web temporaneamente in manutenzione, riprova tra qualche ora.",
	canonicalPath: "/in-manutenzione",
	index: false,
	follow: false,
});

export default function Page() {
	return (
		<InManutenzione />
	);
}
