"use client";
import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from "react";
import Link from "next/link";
import {Bell, ExternalLinkIcon} from "lucide-react";
import {Button, buttonVariants} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger} from "@/components/ui/popover";
import {Separator} from "@/components/ui/separator";
import {Spinner} from "@/components/ui/spinner";
import {fetchNotifications, NOTIFICATION_COUNT_EVENT} from "@/features/notifiche/client";
import {NOTIFICATION_POLL_MS, notificationBadge, type NotificationItem} from "@/features/notifiche/notification-model";
import NotificationCard from "@/features/notifiche/NotificationCard";
import {NotificationError, NotificationsEmpty} from "@/features/notifiche/NotificationFeedback";
import {useNotificationRead} from "@/features/notifiche/use-notification-read";

const MOBILE_QUERY = "(width < 640px)";
function subscribeMobile(onChange: () => void) {
	const media = window.matchMedia(MOBILE_QUERY);
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
}
const mobileSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const serverMobileSnapshot = () => false;

export default function NotificationBell() {
	const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverMobileSnapshot);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const mobileAnchor = useMemo(() => mobile ? {
		getBoundingClientRect() {
			const rect = triggerRef.current?.getBoundingClientRect();
			return new DOMRect(window.innerWidth / 2, rect?.top ?? 0, 0, rect?.height ?? 0);
		},
		get contextElement() {return triggerRef.current ?? undefined;},
	} : undefined, [mobile]);
	const [open, setOpen] = useState(false);
	const [count, setCount] = useState(0);
	const [items, setItems] = useState<NotificationItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const request = useRef<AbortController | null>(null);
	const opened = useRef(false);
	const countRevision = useRef(0);

	const refresh = useCallback(async (preview: boolean) => {
		request.current?.abort();
		const controller = new AbortController();
		request.current = controller;
		const revision = countRevision.current;
		if (preview) setLoading(true);
		try {
			const page = await fetchNotifications(preview ? 3 : 0, null, controller.signal);
			if (controller.signal.aborted) return;
			if (revision === countRevision.current) setCount(page.unreadCount);
			if (preview && opened.current) {
				// Keep the "Nuova" highlight until this popover is closed.
				setItems((previous) => page.items.map((item) => previous.find((old) => old.id === item.id && !old.readAt) ? {
					...item,
					readAt: null
				} : item));
			}
			setError(null);
		} catch {
			if (!controller.signal.aborted) setError("Non è stato possibile caricare le notifiche. Riprova.");
		} finally {
			if (!controller.signal.aborted) setLoading(false);
		}
	}, []);

	useEffect(() => {
		const update = () => {
			if (document.visibilityState === "visible") void refresh(opened.current);
		};
		const onCount = (event: Event) => {
			countRevision.current += 1;
			setCount((event as CustomEvent<number>).detail);
		};
		update();
		const interval = window.setInterval(update, NOTIFICATION_POLL_MS);
		document.addEventListener("visibilitychange", update);
		window.addEventListener("focus", update);
		window.addEventListener(NOTIFICATION_COUNT_EVENT, onCount);
		return () => {
			request.current?.abort();
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", update);
			window.removeEventListener("focus", update);
			window.removeEventListener(NOTIFICATION_COUNT_EVENT, onCount);
		};
	}, [refresh]);
	const {readError, retryRead, readPending} = useNotificationRead(items, open);

	function changeOpen(value: boolean) {
		opened.current = value;
		setOpen(value);
		if (value) {
			setItems([]);
			void refresh(true);
		}
	}

	return (
		<Popover open={open} onOpenChange={changeOpen}>
			<PopoverTrigger render={<Button ref={triggerRef} variant="inverse-outline" size="icon-lg" className="relative"
			                                aria-label={count ? `Apri notifiche, ${count} non lette` : "Apri notifiche"}/>}>
				<Bell aria-hidden="true"/>
				{count > 0 && <Badge variant="notification-count" className="absolute -top-1 -right-1 min-w-5"
                                     aria-hidden="true">{notificationBadge(count)}</Badge>}
			</PopoverTrigger>
			<PopoverContent anchor={mobileAnchor} positionMethod={mobile ? "fixed" : "absolute"} align={mobile ? "center" : "end"} sideOffset={12} className="w-[min(26rem,calc(100vw-2rem))]">
				<PopoverHeader><PopoverTitle>Notifiche</PopoverTitle></PopoverHeader>
				<div className="relative max-h-[60vh] overflow-hidden p-1" aria-busy={loading}>
					{/* Keep the empty state's natural height at every viewport width. */}
					<div className="pointer-events-none invisible" aria-hidden="true"><NotificationsEmpty/></div>
					<div className="absolute inset-1 flex flex-col gap-3 overflow-y-auto">
						{loading && !items.length ? (
							<div className="flex min-h-full shrink-0 items-center justify-center"><Spinner
								className="size-6" aria-label="Caricamento notifiche"/></div>
						) : (
							<>
								{items.length > 0 && <ul className="flex list-none flex-col gap-3"
                                                         aria-label="Ultime notifiche">{items.map((item) => <li
									key={item.id}><NotificationCard item={item} compact/></li>)}</ul>}
								{!error && !items.length && <NotificationsEmpty/>}
								{error && <NotificationError message={error} onRetry={() => void refresh(true)}
                                                             pending={loading}/>}
								{readError &&
                                    <NotificationError message={readError} onRetry={retryRead} pending={readPending}/>}
							</>
						)}
					</div>
				</div>
				<Separator/>
				<Link href="/centro-notifiche" className={buttonVariants({variant: "ghost"})}
				      onClick={() => changeOpen(false)}>
					<ExternalLinkIcon/> Apri centro notifiche
				</Link>
			</PopoverContent>
		</Popover>
	)
}
