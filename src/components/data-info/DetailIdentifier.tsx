"use client";

import {useState} from "react";
import {CopyIcon, FingerprintIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {toast} from "@/components/ui/toast";
import {copyText} from "@/lib/utils";

export default function DetailIdentifier({id, entity, entityLabel}: {
	id: string;
	entity: "profilo" | "annuncio";
	entityLabel?: string;
}) {
	const [copying, setCopying] = useState(false);
	const copyLabel = entity === "profilo" ? "Copia UUID del profilo" : "Copia UUID dell’annuncio";

	async function handleCopy() {
		setCopying(true);
		try {
			await copyText(id);
			toast.add({title: "UUID copiato negli appunti", type: "success"});
		} catch {
			toast.add({title: "Impossibile copiare l’UUID. Riprova.", type: "error"});
		} finally {
			setCopying(false);
		}
	}

	return (
		<Card size="sm" className="min-w-0">
			<CardContent>
				<div className={"flex flex-row items-center justify-between gap-3"}>
					<div className={"flex flex-col justify-start gap-1"}>
						<p className={"flex items-center gap-2 font-medium tracking-wide"}>
							{entity === "profilo" && <FingerprintIcon className="profile-detail-accent size-4 shrink-0" aria-hidden="true" />}
							UUID {entityLabel ?? entity}:
						</p>
						<code className="block text-xs text-muted-foreground select-all break-all">{id}</code>
					</div>
					<Tooltip>
						<TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy} disabled={copying} aria-busy={copying} aria-label={copyLabel} />}>
							<CopyIcon aria-hidden="true" />
						</TooltipTrigger>
						<TooltipContent>Copia UUID</TooltipContent>
					</Tooltip>
				</div>
			</CardContent>
		</Card>
	);
}
