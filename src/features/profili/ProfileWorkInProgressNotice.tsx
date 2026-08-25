"use client";

import {useState} from "react";
import {ConstructionIcon, XIcon} from "lucide-react";

import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";

export default function ProfileWorkInProgressNotice() {
	const [visible, setVisible] = useState(true);

	if (!visible) return null;

	return (
		<Alert role="status">
			<ConstructionIcon aria-hidden="true" />
			<AlertTitle>Pagina in lavorazione</AlertTitle>
			<AlertDescription>
				Questa è una prima versione del profilo pubblico. Contenuti e funzionalità verranno ampliati prossimamente.
			</AlertDescription>
			<AlertAction>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() => setVisible(false)}
					aria-label="Chiudi avviso"
				>
					<XIcon data-icon="inline-start" aria-hidden="true" />
				</Button>
			</AlertAction>
		</Alert>
	);
}
