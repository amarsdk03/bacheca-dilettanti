"use client";

import {useState} from "react";
import {CopyIcon, MapPinIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {toast} from "@/components/ui/toast";
import {copyText} from "@/lib/utils";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export default function ProfileIdentifier({profileId}: {profileId: string}) {
	const [copying, setCopying] = useState(false);

	async function handleCopy() {
		setCopying(true);
		try {
			await copyText(profileId);
			toast.add({title: "UUID copiato negli appunti", type: "success"});
		} catch {
			toast.add({title: "Impossibile copiare l’UUID. Riprova.", type: "error"});
		} finally {
			setCopying(false);
		}
	}

	return (
		<Card className="min-w-0">
			<CardContent>
				<div className="flex min-w-0 items-center gap-2 px-1">
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<span className="text-sm text-neutral-900 font-semibold">UUID profilo:</span>
						<code className="text-xs text-muted-foreground select-all break-all">{profileId}</code>
					</div>
					<Tooltip>
						<TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy} disabled={copying} aria-busy={copying} aria-label="Copia UUID del profilo" />}>
							<CopyIcon aria-hidden="true" />
						</TooltipTrigger>
						<TooltipContent>Copia UUID</TooltipContent>
					</Tooltip>
				</div>
			</CardContent>
		</Card>
	);
}
