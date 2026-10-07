"use client";
import {type NotificationCursor, type NotificationPage} from "@/features/notifiche/notification-model";
export const NOTIFICATION_COUNT_EVENT = "bd:notification-count";
export function publishNotificationCount(unreadCount: number) {
	window.dispatchEvent(new CustomEvent(NOTIFICATION_COUNT_EVENT, {detail: unreadCount}));
}
export async function fetchNotifications(limit: 0 | 3 | 20, cursor: NotificationCursor | null = null, signal?: AbortSignal): Promise<NotificationPage> {
	const params = new URLSearchParams({limit: String(limit)});
	if (cursor) {params.set("date", cursor.date); params.set("id", cursor.id);}
	const response = await fetch(`/api/notifiche?${params}`, {cache: "no-store", signal});
	if (!response.ok) throw new Error("Non è stato possibile caricare le notifiche. Riprova.");
	return response.json();
}
