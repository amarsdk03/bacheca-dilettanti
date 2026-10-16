"use client";
import {NOTIFICATION_LABELS, type NotificationItem} from "./notification-model";

const CHANGE_EVENT = "bd:browser-notifications";
const preferenceKey = (account: string) => `bd:browser-notifications:${account}`;
export function browserNotificationStatus(account: string) {
	if (typeof window === "undefined" || !window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
	if (Notification.permission === "denied") return "denied";
	try {return Notification.permission === "granted" && localStorage.getItem(preferenceKey(account)) === "enabled" ? "enabled" : "disabled";}
	catch {return "disabled";}
}
export function subscribeBrowserNotifications(listener: () => void) {
	window.addEventListener(CHANGE_EVENT, listener);
	window.addEventListener("storage", listener);
	window.addEventListener("focus", listener);
	return () => {
		window.removeEventListener(CHANGE_EVENT, listener);
		window.removeEventListener("storage", listener);
		window.removeEventListener("focus", listener);
	};
}
export async function setBrowserNotifications(account: string, enabled: boolean) {
	try {
		if (enabled) {
			if (browserNotificationStatus(account) === "unsupported") throw new Error("Questo browser non supporta le notifiche del sito.");
			const permission = await Notification.requestPermission();
			if (permission !== "granted") throw new Error(permission === "denied" ? "Consenti le notifiche nelle impostazioni del browser per abilitarle." : "Il permesso per le notifiche non è stato concesso.");
			await navigator.serviceWorker.register("/notifications-sw.js");
			await navigator.serviceWorker.ready;
		}
		localStorage.setItem(preferenceKey(account), enabled ? "enabled" : "disabled");
	} finally {window.dispatchEvent(new Event(CHANGE_EVENT));}
}

/** The first successful poll establishes a baseline; past unread items stay in the center. */
export function createBrowserNotificationDelivery(account: string) {
	let latest: bigint | null = null;
	return async (items: NotificationItem[]) => {
		if (browserNotificationStatus(account) !== "enabled") {latest = null; return;}
		const ids = items.map(item => BigInt(item.id));
		const newest = ids.reduce((max, id) => id > max ? id : max, latest ?? BigInt(0));
		const previous = latest;
		latest = newest;
		if (previous === null) return;
		const incoming = items.filter(item => !item.readAt && BigInt(item.id) > previous);
		if (!incoming.length) return;
		await navigator.serviceWorker.register("/notifications-sw.js");
		const registration = await navigator.serviceWorker.ready;
		// Use a single batch notification; the native tag also deduplicates across tabs.
		const item = incoming[0];
		if (browserNotificationStatus(account) !== "enabled") return;
		await registration.showNotification(incoming.length === 1 ? NOTIFICATION_LABELS[item.type] : `${incoming.length} nuove notifiche`, {
			body: "Hai nuovi aggiornamenti su Bacheca Dilettanti. Apri il centro notifiche per leggerli.",
			tag: `bd:${account}:${newest}`, data: {url: "/centro-notifiche"},
		});
	};
}
