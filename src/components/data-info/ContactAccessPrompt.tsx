import Link from "next/link";
import {LockKeyholeIcon} from "lucide-react";

import {Button} from "@/components/ui/button";

export default function ContactAccessPrompt({returnTo}: {returnTo: string}) {
	const loginHref = `/accedi?${new URLSearchParams({next: returnTo}).toString()}`;

	return (
		<div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
			<div className="flex items-start gap-3">
				<LockKeyholeIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
				<div className="min-w-0">
					<h2 className="font-home-display text-lg font-semibold uppercase">Accedi per visualizzare i contatti</h2>
					<p className="mt-1 text-sm text-muted-foreground">Accedi al tuo account per consultare i recapiti pubblici.</p>
				</div>
			</div>
			<Button render={<Link href={loginHref} />} nativeButton={false} size="lg" className="w-full">
				Accedi
			</Button>
		</div>
	);
}
