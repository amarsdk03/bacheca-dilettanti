"use client";
import {useState, useSyncExternalStore} from "react";
import {Bell, BellOff, LoaderCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import {browserNotificationStatus, setBrowserNotifications, subscribeBrowserNotifications} from "./browser-notifications";

export default function BrowserNotificationSettings({account, variant = "default"}: {account: string; variant?: "default" | "settings"}) {
	const status = useSyncExternalStore(subscribeBrowserNotifications, () => browserNotificationStatus(account), () => "loading");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	async function toggle() {
		setPending(true);
		setError(null);
		try {await setBrowserNotifications(account, status !== "enabled");}
		catch (error) {setError(error instanceof Error ? error.message : "Non è stato possibile aggiornare la preferenza. Riprova.");}
		finally {setPending(false);}
	}
	return <Card className={cn(variant === "settings" && "profile-dashboard-card")}>
		<CardHeader className={cn(variant === "settings" && "gap-3")}>
			{variant === "settings" && <span className="profile-dashboard-emblem flex size-10 items-center justify-center rounded-xl"><Bell className="size-5" aria-hidden="true" /></span>}
			<CardTitle>Notifiche del browser</CardTitle>
			<CardDescription>Ricevi un avviso su questo browser quando arrivano nuove notifiche, mentre il sito è aperto anche in una scheda in secondo piano.</CardDescription>
		</CardHeader>
		<CardContent className="flex flex-col items-start gap-3">
			<Button variant="outline" onClick={() => void toggle()} disabled={pending || status === "loading" || status === "unsupported" || status === "denied"}>
				{pending ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : status === "enabled" ? <BellOff data-icon="inline-start" aria-hidden="true" /> : <Bell data-icon="inline-start" aria-hidden="true" />}
				{status === "enabled" ? "Disabilita notifiche browser" : "Abilita notifiche browser"}
			</Button>
			<p className="text-sm text-muted-foreground" role="status">{status === "enabled" ? "Notifiche abilitate per questo account su questo browser." : status === "denied" ? "Le notifiche sono bloccate. Consenti le notifiche per questo sito nelle impostazioni del browser." : status === "unsupported" ? "Le notifiche non sono disponibili in questo browser. Puoi sempre leggerle nel centro notifiche." : "Puoi modificare questa preferenza in qualsiasi momento."}</p>
			{error && <p className="text-sm text-destructive" role="alert">{error}</p>}
		</CardContent>
	</Card>;
}
