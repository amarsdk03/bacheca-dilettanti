import type {Metadata} from "next";
import {redirect} from "next/navigation";

import ReimpostaPassword from "@/features/auth/ReimpostaPassword";
import {getCurrentViewer} from "@/features/auth/queries";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Reimposta password");

export default async function Page() {
	if (!await getCurrentViewer()) redirect("/password-dimenticata");
	return <ReimpostaPassword />;
}
