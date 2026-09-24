import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {DEFAULT_LOGO_PATH} from "@/const/defaultConstants";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = {
	...dynamicMetadata({title: "Link email non valido", canonicalPath: "/auth/link-non-valido", index: false, follow: false}),
	referrer: "no-referrer",
};

export default function Page() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Link href="/" className="flex justify-center">
					<Image src={DEFAULT_LOGO_PATH} alt="Bacheca Dilettanti" width={150} height={90} priority />
				</Link>
				<Card>
					<CardHeader className="text-center">
						<CardTitle><h1 className="text-xl">Link email non valido</h1></CardTitle>
						<CardDescription>Il link è arrivato a una pagina che non può verificarlo. Richiedi un nuovo messaggio per continuare.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<Button render={<Link href="/password-dimenticata" />} nativeButton={false}>Recupera la password</Button>
						<Button render={<Link href="/accedi" />} nativeButton={false} variant="outline">Accedi o conferma la registrazione</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
