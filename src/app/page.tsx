import Homepage from "@/features/homepage/Homepage";

import {Metadata} from "next";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata(
	"Home"
);

export default function Page() {
	return (
		<Homepage />
	);
}