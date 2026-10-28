"use client";
import {useEffect, useRef, useState} from "react";
import {BellIcon, LoaderCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {appendNotifications, isNotificationType, NOTIFICATION_LABELS, NOTIFICATION_TYPES, type NotificationType, type NotificationPage} from "@/features/notifiche/notification-model";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import BrowserNotificationSettings from "./BrowserNotificationSettings";
import {fetchNotifications} from "@/features/notifiche/client";
import NotificationCard from "@/features/notifiche/NotificationCard";
import {NotificationError, NotificationsEmpty} from "@/features/notifiche/NotificationFeedback";
import {useNotificationRead} from "@/features/notifiche/use-notification-read";

export default function NotificationCenter({initialPage, account}: {initialPage: NotificationPage | null; account: string}) {
	const [filter, setFilter] = useState<NotificationType | null>(null);
	const [items, setItems] = useState(initialPage?.items ?? []);
	const [cursor, setCursor] = useState(initialPage?.nextCursor ?? null);
	const [initialized, setInitialized] = useState(initialPage !== null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(initialPage ? null : "Non è stato possibile caricare le notifiche. Riprova.");
	const request = useRef<AbortController | null>(null);
	useEffect(() => () => request.current?.abort(), []);
	const {readError, retryRead, readPending} = useNotificationRead(items);
	async function loadMore(reset = false, type = filter) {
		if (loading && !reset) return;
		request.current?.abort();
		const controller = new AbortController();
		request.current = controller;
		setLoading(true);
		try {
			const page = await fetchNotifications(20, reset || !initialized ? null : cursor, controller.signal, type);
			if (controller.signal.aborted) return;
			setItems((current) => reset ? page.items : appendNotifications(current, page.items));
			setCursor(page.nextCursor);
			setInitialized(true);
			setError(null);
		} catch {if (!controller.signal.aborted) setError("Non è stato possibile caricare le notifiche. Riprova.");}
		finally {if (!controller.signal.aborted) setLoading(false);}
	}
	function changeFilter(values: string[]) {
		const type = isNotificationType(values[0]) ? values[0] : null;
		if (type === filter) return;
		setFilter(type);
		setItems([]);
		setCursor(null);
		setInitialized(false);
		setError(null);
		void loadMore(true, type);
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
		<BrowserNotificationSettings account={account} />
		<ToggleGroup variant="outline" value={[filter ?? "tutte"]} onValueChange={changeFilter} className="max-w-full flex-wrap" aria-label="Filtra notifiche per tipologia">
			<ToggleGroupItem value="tutte">Tutte</ToggleGroupItem>
			{NOTIFICATION_TYPES.map(type => <ToggleGroupItem key={type} value={type} className="notification-filter" data-notification-type={type}>
				<span aria-hidden="true" className="notification-filter-dot size-2 shrink-0 rounded-full" />{NOTIFICATION_LABELS[type]}
			</ToggleGroupItem>)}
		</ToggleGroup>
		{loading && <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Caricamento notifiche…</p>}
		<ul className="flex list-none flex-col gap-4" aria-label="Notifiche ricevute" aria-busy={loading}>
			{items.map((item) => <li key={item.id}><NotificationCard item={item} /></li>)}
		</ul>
		{initialized && !items.length && (
			<div className={"sm:min-h-80 flex items-center justify-center"}>
				<NotificationsEmpty filtered={filter !== null} />
			</div>
		)}
		{error && <NotificationError message={error} onRetry={() => void loadMore()} pending={loading} />}
		{readError && <NotificationError message={readError} onRetry={retryRead} pending={readPending} />}
		{cursor && !error && <Button variant="outline" onClick={() => void loadMore()} disabled={loading} className="self-center">{loading && <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />}{loading ? "Caricamento…" : "Mostra altro"}</Button>}
		<p className="sr-only" role="status">{items.length} notifiche caricate</p>
	</section>;
}
