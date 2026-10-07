"use server";
import "server-only";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {createAdminClient} from "@/lib/supabase/admin";

export async function markNotificationsRead(ids: string[]): Promise<{unreadCount: number} | {error: string}> {
	if (!Array.isArray(ids) || ids.length > 20 || ids.some((id) => typeof id !== "string" || !/^[1-9]\d{0,18}$/.test(id))) {
		return {error: "Le notifiche indicate non sono valide."};
	}
	try {
		const account = await getAuthenticatedViewer();
		if (!account?.utenteId || !account.registeredAt) return {error: "Accedi per leggere le notifiche."};
		const {data, error} = await createAdminClient().rpc("mark_notifications_read_v1", {p_user: account.utenteId, p_ids: ids});
		if (error || typeof data !== "number") throw new Error("MARK_READ_FAILED");
		return {unreadCount: data};
	} catch {
		return {error: "Non è stato possibile aggiornare la lettura. Riprova."};
	}
}
