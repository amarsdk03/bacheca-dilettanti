"use client";
import {useEffect, useRef, useState, useTransition} from "react";
import {markNotificationsRead} from "@/features/notifiche/server/actions";
import {publishNotificationCount} from "@/features/notifiche/client";
import type {NotificationItem} from "@/features/notifiche/notification-model";

export function useNotificationRead(items: NotificationItem[], visible = true) {
	const acknowledged = useRef(new Set<string>());
	const [error, setError] = useState<string | null>(null);
	const [retry, setRetry] = useState(0);
	const [pending, startTransition] = useTransition();
	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		function mark() {
			if (document.visibilityState !== "visible") return;
			const ids = items.filter(({id, readAt}) => !readAt && !acknowledged.current.has(id)).map(({id}) => id);
			if (!ids.length) return;
			startTransition(async () => {
				for (let offset = 0; offset < ids.length; offset += 20) {
					if (cancelled) return;
					const batch = ids.slice(offset, offset + 20);
					const result = await markNotificationsRead(batch);
					if ("error" in result) {if (!cancelled) setError(result.error); return;}
					batch.forEach((id) => acknowledged.current.add(id));
					publishNotificationCount(result.unreadCount);
					if (!cancelled) setError(null);
				}
			});
		}
		mark();
		document.addEventListener("visibilitychange", mark);
		return () => {cancelled = true; document.removeEventListener("visibilitychange", mark);};
	}, [items, visible, retry]);
	return {readError: error, retryRead: () => setRetry((value) => value + 1), readPending: pending};
}
