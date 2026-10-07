import type {Metadata} from "next";
import {redirect} from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {getNotifications} from "@/features/notifiche/server/queries";
import NotificationCenter from "@/features/notifiche/NotificationCenter";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata({title: "Centro notifiche", description: "Le notifiche e gli aggiornamenti del tuo account.", canonicalPath: "/centro-notifiche", index: false, follow: false});
export const dynamic = "force-dynamic";
export default async function NotificationCenterPage() {
	const account = await getAuthenticatedViewer();
	if (!account) redirect("/accedi?next=%2Fcentro-notifiche");
	if (!account.utenteId || !account.registeredAt) redirect("/registrati");
	let initialPage = null;
	try {initialPage = await getNotifications();} catch { /* Render a retryable error without breaking navigation. */ }
	return <><Navbar /><NotificationCenter initialPage={initialPage} /><Footer whiteBackground /></>;
}
