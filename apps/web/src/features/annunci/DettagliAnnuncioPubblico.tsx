import {TriangleAlertIcon} from "lucide-react";
import type {CSSProperties} from "react";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import DettagliAnnuncioArbitro from "@/features/annunci/components/details/DettagliAnnuncioArbitro";
import DettagliAnnuncioCampoImpianto from "@/features/annunci/components/details/DettagliAnnuncioCampoImpianto";
import DettagliAnnuncioGiocatore from "@/features/annunci/components/details/DettagliAnnuncioGiocatore";
import DettagliAnnuncioSquadraCercaGiocatore
	from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaGiocatore";
import DettagliAnnuncioSquadraCercaPartita
	from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaPartita";
import DettagliAnnuncioSquadraCercaSponsor
	from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaSponsor";
import DettagliAnnuncioSquadraCercaStaff from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaStaff";
import DettagliAnnuncioStaffSportivo from "@/features/annunci/components/details/DettagliAnnuncioStaffSportivo";
import DettagliAnnuncioTorneoEvento from "@/features/annunci/components/details/DettagliAnnuncioTorneoEvento";
import AnnouncementHistoryBackButton from "@/features/annunci/AnnouncementHistoryBackButton";
import AnnouncementDetailsLayout from "@/features/annunci/components/details/AnnouncementDetailsLayout";
import type {AnnouncementDetail, AnnouncementDetailResult,} from "@/features/annunci/announcement-model";

interface DettagliAnnuncioPubblicoProps {
	result: Exclude<AnnouncementDetailResult, {status: "not-found"}>;
	authenticated: boolean;
	returnTo: string;
}

function AnnouncementContent({announcement, authenticated, returnTo}: {announcement: AnnouncementDetail; authenticated: boolean; returnTo: string}) {
	switch (announcement.type) {
		case "annuncio_giocatore": return <DettagliAnnuncioGiocatore announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_squadra_cerca_giocatore": return <DettagliAnnuncioSquadraCercaGiocatore announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_squadra_cerca_staff": return <DettagliAnnuncioSquadraCercaStaff announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_squadra_cerca_partita": return <DettagliAnnuncioSquadraCercaPartita announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_squadra_cerca_sponsor": return <DettagliAnnuncioSquadraCercaSponsor announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_staff_sportivo": return <DettagliAnnuncioStaffSportivo announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_arbitro": return <DettagliAnnuncioArbitro announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_torneo_evento": return <DettagliAnnuncioTorneoEvento announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_campo_impianto": return <DettagliAnnuncioCampoImpianto announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_servizi_consulenze": return <AnnouncementDetailsLayout announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
		case "annuncio_creators": return <AnnouncementDetailsLayout announcement={announcement} authenticated={authenticated} returnTo={returnTo} />;
	}
}

function AnnouncementError() {
	return (
		<Alert variant="destructive">
			<TriangleAlertIcon aria-hidden="true" />
			<AlertTitle>Annuncio temporaneamente non disponibile</AlertTitle>
			<AlertDescription>
				Non è stato possibile caricare questo annuncio. Riprova tra poco oppure torna alla pagina precedente.
			</AlertDescription>
		</Alert>
	);
}

export default function DettagliAnnuncioPubblico({
	result,
	authenticated,
	returnTo,
}: DettagliAnnuncioPubblicoProps) {
	return (
		<div className="public-profile-page min-h-[calc(100vh-4rem)]" style={{"--profile-accent": result.status === "success" ? getProfileAccent(result.announcement.profileType) : "var(--brand-indigo)"} as CSSProperties}>
			<main className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
				<div className="flex items-center justify-between gap-3">
					<AnnouncementHistoryBackButton />
				</div>
				{result.status === "error" ? <AnnouncementError /> : <AnnouncementContent announcement={result.announcement} authenticated={authenticated} returnTo={returnTo} />}
				<div className="flex justify-center pt-2">
					<AnnouncementHistoryBackButton label="Torna indietro" variant="outline" size="lg" />
				</div>
			</main>
		</div>
	);
}
