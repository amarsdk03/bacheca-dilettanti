import "server-only";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {createAdminClient} from "@/lib/supabase/admin";
import {isNotificationCursor, type NotificationCursor, type NotificationPage} from "@/features/notifiche/notification-model";

export async function getNotifications(limit: 0 | 3 | 20 = 20, cursor: NotificationCursor | null = null): Promise<NotificationPage> {
	const account = await getAuthenticatedViewer();
	if (!account?.utenteId || !account.registeredAt) throw new Error("NOTIFICATION_AUTH_REQUIRED");
	if (cursor !== null && !isNotificationCursor(cursor)) throw new Error("INVALID_NOTIFICATION_CURSOR");
	const {data, error} = await createAdminClient().rpc("get_notifications_v1", {
		p_user: account.utenteId, p_limit: limit, p_cursor_date: cursor?.date ?? null, p_cursor_id: cursor?.id ?? null,
	});
	if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error("NOTIFICATIONS_UNAVAILABLE");
	return data as unknown as NotificationPage;
}
