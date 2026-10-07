"use client";
import {useRef, useState} from "react";
import {BellIcon, LoaderCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {appendNotifications, type NotificationPage} from "@/features/notifiche/notification-model";
import {fetchNotifications} from "@/features/notifiche/client";
import NotificationCard from "@/features/notifiche/NotificationCard";
import {NotificationError, NotificationsEmpty} from "@/features/notifiche/NotificationFeedback";
import {useNotificationRead} from "@/features/notifiche/use-notification-read";

export default function NotificationCenter({initialPage}: {initialPage: NotificationPage | null}) {
	const [items, setItems] = useState(initialPage?.items ?? []);
	const [cursor, setCursor] = useState(initialPage?.nextCursor ?? null);
	const [initialized, setInitialized] = useState(initialPage !== null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(initialPage ? null : "Non è stato possibile caricare le notifiche. Riprova.");
	const fetching = useRef(false);
	const {readError, retryRead, readPending} = useNotificationRead(items);
	async function loadMore() {
		if (fetching.current) return;
		fetching.current = true;
		setLoading(true);
		try {
			const page = await fetchNotifications(20, initialized ? cursor : null);
			setItems((current) => appendNotifications(current, page.items));
			setCursor(page.nextCursor);
			setInitialized(true);
			setError(null);
		} catch {setError("Non è stato possibile caricare le notifiche. Riprova.");}
		finally {fetching.current = false; setLoading(false);}
	}
	return <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6" aria-labelledby="notification-center-heading">
		<div className="flex flex-col gap-2">
			<h1 id="notification-center-heading" className="flex items-center gap-2 text-3xl font-bold tracking-tight">
				<BellIcon /> Centro notifiche
			</h1>
			<p className="text-muted-foreground">
				Interessi ricevuti, nuovi follower e aggiornamenti sulle tue attività.
			</p>
		</div>
		<ul className="flex list-none flex-col gap-4" aria-label="Notifiche ricevute" aria-busy={loading}>
			{items.map((item) => <li key={item.id}><NotificationCard item={item} /></li>)}
		</ul>
		{initialized && !items.length && (
			<div className={"sm:min-h-80 flex items-center justify-center"}>
				<NotificationsEmpty />
			</div>
		)}
		{error && <NotificationError message={error} onRetry={() => void loadMore()} pending={loading} />}
		{readError && <NotificationError message={readError} onRetry={retryRead} pending={readPending} />}
		{cursor && !error && <Button variant="outline" onClick={() => void loadMore()} disabled={loading} className="self-center">{loading && <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />}{loading ? "Caricamento…" : "Mostra altro"}</Button>}
		<p className="sr-only" role="status">{items.length} notifiche caricate</p>
	</section>;
}
