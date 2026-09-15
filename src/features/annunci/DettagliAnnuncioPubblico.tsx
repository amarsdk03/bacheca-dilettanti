import {TriangleAlertIcon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import DettagliAnnuncioArbitro from "@/features/annunci/components/details/DettagliAnnuncioArbitro";
import DettagliAnnuncioCampoImpianto from "@/features/annunci/components/details/DettagliAnnuncioCampoImpianto";
import DettagliAnnuncioGiocatore from "@/features/annunci/components/details/DettagliAnnuncioGiocatore";
import DettagliAnnuncioSquadraCercaGiocatore from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaGiocatore";
import DettagliAnnuncioSquadraCercaPartita from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaPartita";
import DettagliAnnuncioSquadraCercaSponsor from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaSponsor";
import DettagliAnnuncioSquadraCercaStaff from "@/features/annunci/components/details/DettagliAnnuncioSquadraCercaStaff";
import DettagliAnnuncioStaffSportivo from "@/features/annunci/components/details/DettagliAnnuncioStaffSportivo";
import DettagliAnnuncioTorneoEvento from "@/features/annunci/components/details/DettagliAnnuncioTorneoEvento";
import AnnouncementHistoryBackButton from "@/features/annunci/AnnouncementHistoryBackButton";
import type {
	AnnouncementDetail,
	AnnouncementDetailResult,
} from "@/features/annunci/announcement-model";

interface DettagliAnnuncioPubblicoProps {
	result: Exclude<AnnouncementDetailResult, {status: "not-found"}>;
}

function AnnouncementContent({announcement}: {announcement: AnnouncementDetail}) {
	switch (announcement.type) {
		case "annuncio_giocatore": return <DettagliAnnuncioGiocatore announcement={announcement} />;
		case "annuncio_squadra_cerca_giocatore": return <DettagliAnnuncioSquadraCercaGiocatore announcement={announcement} />;
		case "annuncio_squadra_cerca_staff": return <DettagliAnnuncioSquadraCercaStaff announcement={announcement} />;
		case "annuncio_squadra_cerca_partita": return <DettagliAnnuncioSquadraCercaPartita announcement={announcement} />;
		case "annuncio_squadra_cerca_sponsor": return <DettagliAnnuncioSquadraCercaSponsor announcement={announcement} />;
		case "annuncio_staff_sportivo": return <DettagliAnnuncioStaffSportivo announcement={announcement} />;
		case "annuncio_arbitro": return <DettagliAnnuncioArbitro announcement={announcement} />;
		case "annuncio_torneo_evento": return <DettagliAnnuncioTorneoEvento announcement={announcement} />;
		case "annuncio_campo_impianto": return <DettagliAnnuncioCampoImpianto announcement={announcement} />;
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
}: DettagliAnnuncioPubblicoProps) {
	return (
		<div className="min-h-[calc(100vh-4rem)] bg-brand-paper">
			<main className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
				<div><AnnouncementHistoryBackButton /></div>
				{result.status === "error" ? <AnnouncementError /> : <AnnouncementContent announcement={result.announcement} />}
				<div className="flex justify-center pt-2">
					<AnnouncementHistoryBackButton label="Torna indietro" variant="outline" size="lg" />
				</div>
			</main>
		</div>
	);
}
