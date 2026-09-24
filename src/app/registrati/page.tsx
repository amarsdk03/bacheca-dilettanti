import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {redirect} from "next/navigation";

import GradientBackground from "@/components/styling/GradientBackground";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Card} from "@/components/ui/card";
import {DEFAULT_BANNER_PATH} from "@/const/defaultConstants";
import HomepageWorkInProgressNotice from "@/features/homepage/components/HomepageWorkInProgressNotice";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {sanitizeNextPath} from "@/features/auth/utils";
import Registrati from "@/features/registrati/Registrati";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({
	title: "Registrati",
	description: "Crea il tuo account su Bacheca Dilettanti.",
	canonicalPath: "/registrati",
	index: false,
	follow: true,
});

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	const account = await getAuthenticatedViewer();
	if (account?.registeredAt) redirect("/il-tuo-profilo");

	const params = await searchParams;
	const nextPath = sanitizeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
	const passwordUpdated = (Array.isArray(params.password) ? params.password[0] : params.password) === "aggiornata";
	const inviteCode = Array.isArray(params["codice-invito"]) ? params["codice-invito"][0] : params["codice-invito"];

	return (
		<div className="flex min-h-svh flex-col">
			<HomepageWorkInProgressNotice onNavbar />
			<GradientBackground className="flex-1 overflow-clip px-4 py-6 sm:px-6 sm:py-8">
				<div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6">
					<Link
						href="/"
						aria-label="Bacheca Dilettanti, torna alla homepage"
						className="self-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-brand-indigo/40"
					>
						<Image
							src={DEFAULT_BANNER_PATH}
							alt="Logo Bacheca Dilettanti"
							width={200}
							height={100}
							draggable={false}
						/>
					</Link>
					{passwordUpdated && (
						<Alert>
							<AlertDescription>La password è stata aggiornata. Completa la registrazione per accedere al tuo profilo.</AlertDescription>
						</Alert>
					)}
					<Card className="w-full bg-card/95 shadow-xl backdrop-blur-sm sm:[--card-spacing:--spacing(6)]">
						<Registrati
							nextPath={nextPath}
							existingSessionEmail={account?.viewer.email ?? null}
							initialInviteCode={inviteCode?.slice(0, 64) ?? ""}
						/>
					</Card>
				</div>
			</GradientBackground>
		</div>
	);
}
