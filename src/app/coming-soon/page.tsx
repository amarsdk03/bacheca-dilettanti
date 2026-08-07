import ComingSoon from "@/components/redirects/ComingSoon";

import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata(
	"Coming soon",
	"Stiamo costruendo il punto di incontro tra giocatori, arbitri, staff tecnico e società. Il calcio dilettantistico italiano avrà finalmente la sua bacheca."
);

export default function Page() {
	return (
		<ComingSoon />
	);
}