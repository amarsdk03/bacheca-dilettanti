import {SUPPORT_BUBBLE_DISMISS_HOURS} from "@/const/contactConstants";

const STORAGE_KEY = "bacheca:help-bubble:dismissed-until";
const listeners = new Set<() => void>();
let dismissedUntil: number | null = null;
let memoryOnly = false;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function parseDeadline(value: string | null) {
	const deadline = Number(value);
	return Number.isFinite(deadline) && deadline > Date.now() ? deadline : 0;
}

function updateDeadline(deadline: number) {
	clearTimeout(expiryTimer);
	const changed = dismissedUntil !== deadline;
	dismissedUntil = deadline;
	if (deadline > Date.now() && listeners.size > 0) {
		expiryTimer = setTimeout(syncFromStorage, Math.min(deadline - Date.now(), 2_147_483_647));
	}
	if (changed) listeners.forEach((listener) => listener());
}

function syncFromStorage() {
	let deadline = dismissedUntil ?? 0;
	if (!memoryOnly) {
		try {
			deadline = parseDeadline(window.localStorage.getItem(STORAGE_KEY));
		} catch {
			// Retain the dismissal in memory when browser storage is unavailable.
			memoryOnly = true;
		}
	}
	updateDeadline(deadline > Date.now() ? deadline : 0);
}

function onStorage(event: StorageEvent) {
	if (!memoryOnly && (event.key === STORAGE_KEY || event.key === null)) syncFromStorage();
}

function onVisibilityChange() {
	if (document.visibilityState === "visible") syncFromStorage();
}

export function subscribeToSupportBubble(listener: () => void) {
	listeners.add(listener);
	if (listeners.size === 1) {
		window.addEventListener("storage", onStorage);
		window.addEventListener("focus", syncFromStorage);
		document.addEventListener("visibilitychange", onVisibilityChange);
		syncFromStorage();
	}
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			clearTimeout(expiryTimer);
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("focus", syncFromStorage);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		}
	};
}

export function getSupportBubbleSnapshot() {
	return dismissedUntil;
}

export function getSupportBubbleServerSnapshot() {
	return null;
}

export function dismissSupportBubble() {
	const deadline = Date.now() + SUPPORT_BUBBLE_DISMISS_HOURS * 60 * 60 * 1000;
	try {
		window.localStorage.setItem(STORAGE_KEY, String(deadline));
	} catch {
		memoryOnly = true;
	}
	updateDeadline(deadline);
}
