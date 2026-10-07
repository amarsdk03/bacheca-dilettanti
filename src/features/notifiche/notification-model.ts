export const NOTIFICATION_TYPES = ["interesse", "follower", "annuncio_seguito", "stato_annuncio", "segnalazione", "profilo_speciale", "novita"] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];
export interface NotificationReference {label: string; href: string | null}
export interface NotificationItem {
	id: string;
	type: NotificationType;
	createdAt: string;
	readAt: string | null;
	actor: NotificationReference | null;
	target: NotificationReference | null;
	targetKind: "profilo" | "annuncio" | null;
	state: string | null;
	info: string | null;
	email: string | null;
	phone: string | null;
}
export interface NotificationCursor {date: string; id: string}
export interface NotificationPage {items: NotificationItem[]; nextCursor: NotificationCursor | null; unreadCount: number}
export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_POLL_MS = 60_000;

export function isNotificationCursor(value: unknown): value is NotificationCursor {
	if (!value || typeof value !== "object") return false;
	const cursor = value as NotificationCursor;
	return typeof cursor.id === "string" && /^[1-9]\d{0,18}$/.test(cursor.id)
		&& typeof cursor.date === "string" && /^\d{4}-\d{2}-\d{2}T/.test(cursor.date) && Number.isFinite(Date.parse(cursor.date));
}
export function notificationBadge(count: number) {return count > 99 ? "99+" : String(count);}
export function appendNotifications(current: NotificationItem[], incoming: NotificationItem[]) {
	const ids = new Set(current.map(({id}) => id));
	return [...current, ...incoming.filter(({id}) => !ids.has(id))];
}
export function notificationStateLabel(state: string | null) {
	switch (state) {
		case "pubblicato": return "approvato e pubblicato";
		case "in_revisione": return "inviato in revisione";
		case "rifiutato": return "rifiutato";
		case "in_attesa_pagamento": return "in attesa di pagamento";
		default: return state?.replaceAll("_", " ") ?? "aggiornato";
	}
}
