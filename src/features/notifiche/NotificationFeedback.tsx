import {Bell} from "lucide-react";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
export function NotificationsEmpty() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon"><Bell aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle>
					Nessuna notifica
				</EmptyTitle>
				<EmptyDescription>
					Qui troverai interessi ricevuti, nuovi follower e aggiornamenti sui tuoi annunci.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	)
}
export function NotificationError({message, onRetry, pending = false}: {message: string; onRetry: () => void; pending?: boolean}) {
	return (
		<Alert variant="destructive">
			<AlertTitle>
				Notifiche non aggiornate
			</AlertTitle>
			<AlertDescription>
				<p>{message}</p>
				<Button variant="outline" size="sm" onClick={onRetry} disabled={pending}>Riprova</Button>
			</AlertDescription>
		</Alert>
	)
}
