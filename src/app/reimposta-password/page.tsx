import type {Metadata} from "next";
import {redirect} from "next/navigation";

import ReimpostaPassword from "@/features/accedi/ReimpostaPassword";
import {createClient} from "@/lib/supabase/server";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({
	title: "Reimposta password",
	description: "Imposta una nuova password per il tuo account.",
	canonicalPath: "/reimposta-password",
	index: false,
	follow: false,
});

interface PageProps {
	searchParams: Promise<{esito?: string | string[]}>;
}

export default async function Page({searchParams}: PageProps) {
	const supabase = await createClient();
	const {data: claimsData, error: claimsError} = await supabase.auth.getClaims();
	const {data: {user}, error: userError} = await supabase.auth.getUser();
	if (claimsError || userError || !user || user.id !== claimsData?.claims?.sub || !user.email_confirmed_at) {
		redirect("/password-dimenticata?errore=link-scaduto");
	}

	const params = await searchParams;
	const outcome = Array.isArray(params.esito) ? params.esito[0] : params.esito;
	return <ReimpostaPassword passwordUpdated={outcome === "aggiornata"} />;
}
