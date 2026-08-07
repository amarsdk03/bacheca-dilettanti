// import InManutenzione from "@/components/redirects/InManutenzione";
import ComingSoon from "@/components/redirects/ComingSoon";

import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata(
	"In manutenzione",
	"Sito web temporaneamente in manutenzione, riprova tra qualche ora"
);

export default function Page() {
	{ /* <InManutenzione /> */ }
	return (
		<ComingSoon />
	);
}