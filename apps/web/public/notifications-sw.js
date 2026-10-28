self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", event => {
	event.notification.close();
	event.waitUntil((async () => {
		const url = new URL("/centro-notifiche", self.location.origin).href;
		const windows = await self.clients.matchAll({type: "window", includeUncontrolled: true});
		const existing = windows.find(client => client.url === url);
		if (existing) return existing.focus();
		return self.clients.openWindow(url);
	})());
});
