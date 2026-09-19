import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {redirect} from "next/navigation";

import GradientBackground from "@/components/styling/GradientBackground";
import {Card} from "@/components/ui/card";
import {DEFAULT_BANNER_PATH} from "@/const/defaultConstants";
import HomepageWorkInProgressNotice from "@/features/homepage/components/HomepageWorkInProgressNotice";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {sanitizeNextPath} from "@/features/auth/utils";
import Registrati from "@/features/registrati/Registrati";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Registrati");

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({searchParams}: PageProps) {
	const account = await getAuthenticatedViewer();
	if (account?.registeredAt) redirect("/il-tuo-profilo");

	const params = await searchParams;
	const nextPath = sanitizeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);

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
					<Card className="w-full bg-card/95 shadow-xl backdrop-blur-sm sm:[--card-spacing:--spacing(6)]">
						<Registrati
							nextPath={nextPath}
							existingSessionEmail={account?.viewer.email ?? null}
						/>
					</Card>
				</div>
			</GradientBackground>
		</div>
	);
}
