import {NextRequest, NextResponse} from "next/server";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {isNotificationCursor, isNotificationType} from "@/features/notifiche/notification-model";
import {getNotifications} from "@/features/notifiche/server/queries";

export async function GET(request: NextRequest) {
	const headers = {"Cache-Control": "private, no-store"};
	const account = await getAuthenticatedViewer();
	if (!account?.utenteId || !account.registeredAt) return NextResponse.json({error: "Accedi per leggere le notifiche."}, {status: 401, headers});
	const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
	const date = request.nextUrl.searchParams.get("date");
	const id = request.nextUrl.searchParams.get("id");
	const type = request.nextUrl.searchParams.get("type");
	const cursor = date === null && id === null ? null : {date, id};
	if (![0, 3, 20].includes(limit) || (cursor !== null && !isNotificationCursor(cursor)) || (type !== null && !isNotificationType(type))) {
		return NextResponse.json({error: "Richiesta non valida."}, {status: 400, headers});
	}
	try {
		return NextResponse.json(await getNotifications(limit as 0 | 3 | 20, cursor as {date: string; id: string} | null, isNotificationType(type) ? type : null), {headers});
	} catch {
		return NextResponse.json({error: "Non è stato possibile caricare le notifiche. Riprova."}, {status: 503, headers});
	}
}
