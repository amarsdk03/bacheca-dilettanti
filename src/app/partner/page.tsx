import type {Metadata} from "next";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import Partner from "@/features/partner/Partner";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata(
	"Partner e sponsor",
	"Scopri i partner e gli sponsor di Bacheca Dilettanti.",
	"/partner",
);

export default function PartnerPage() {
	return (
		<>
			<Navbar />
			<Partner />
			<Footer whiteBackground />
		</>
	);
}
