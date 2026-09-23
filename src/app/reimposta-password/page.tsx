import type {Metadata} from "next";
import {redirect} from "next/navigation";

import ReimpostaPassword from "@/features/accedi/ReimpostaPassword";
import {getCurrentViewer} from "@/features/auth/server/queries";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({
	title: "Reimposta password",
	description: "Imposta una nuova password per il tuo account.",
	canonicalPath: "/reimposta-password",
	index: false,
	follow: false,
});

export default async function Page() {
	if (!await getCurrentViewer()) redirect("/password-dimenticata");
	return <ReimpostaPassword />;
}
