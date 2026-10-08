import ProfileInterestDialog from "@/features/interessi/ProfileInterestDialog";
import type {CSSProperties, ReactNode} from "react";
import {TriangleAlertIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import DetailActions from "@/features/interazioni/DetailActions";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {cn} from "@/lib/utils";
import Image from "next/image";
import type {ProfileDetail, ProfileDetailResult} from "./profile-detail-model";
import ProfileHistoryBackButton from "./components/ProfileHistoryBackButton";
import DettagliProfiloGiocatore from "./components/types/DettagliProfiloGiocatore";
import DettagliProfiloSquadra from "./components/types/DettagliProfiloSquadra";
import DettagliProfiloStaffSportivo from "./components/types/DettagliProfiloStaffSportivo";
import DettagliProfiloServiziConsulenze from "./components/types/DettagliProfiloServiziConsulenze";
import DettagliProfiloArbitro from "./components/types/DettagliProfiloArbitro";
import DettagliProfiloCreator from "./components/types/DettagliProfiloCreator";
import DettagliProfiloTorneoEvento from "./components/types/DettagliProfiloTorneoEvento";
import DettagliProfiloCampiImpianti from "./components/types/DettagliProfiloCampiImpianti";

function ProfileContent({profile, actions, authenticated, isOwner, returnTo}: {profile: ProfileDetail; actions: ReactNode; authenticated: boolean; isOwner: boolean; returnTo: string}) {
	switch (profile.type) {
		case "giocatore": return <DettagliProfiloGiocatore profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
		case "squadra": return <DettagliProfiloSquadra profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
		case "staff-sportivo": return <DettagliProfiloStaffSportivo profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
		case "servizi-consulenze": return <DettagliProfiloServiziConsulenze profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
		case "arbitro": return <DettagliProfiloArbitro profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
		case "creators": return <DettagliProfiloCreator profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
		case "torneo-evento": return <DettagliProfiloTorneoEvento profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
		case "campi-impianti-sportivi": return <DettagliProfiloCampiImpianti profile={profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />;
	}
}

export default function DettagliProfilo({result, authenticated, isOwner = false, returnTo}: {result: Exclude<ProfileDetailResult, {status: "not-found"}>; authenticated: boolean; isOwner?: boolean; returnTo: string}) {
	const hasProfile = result.status === "ok";
	const actions = result.status === "ok" ? (
		<DetailActions
			target={{kind: "profilo", id: result.profile.id, profileType: result.profile.type}}
			interestTarget={{kind: "profilo", id: result.profile.id, profileType: result.profile.type}}
			href={`/dettagli-profilo?${new URLSearchParams({id: result.profile.id, type: result.profile.type}).toString()}`}
			presentation="profile"
			managedInterest
		/>
	) : null;
	const content = (
		<main className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
			<div className="flex items-center justify-between gap-3">
				<ProfileHistoryBackButton />
			</div>
			{result.status === "error" ? (
				<Alert variant="destructive">
					<TriangleAlertIcon aria-hidden="true" />
					<AlertTitle>Profilo temporaneamente non disponibile</AlertTitle>
					<AlertDescription>Riprova tra poco oppure torna alla pagina precedente.</AlertDescription>
				</Alert>
			) : <ProfileContent profile={result.profile} actions={actions} authenticated={authenticated} isOwner={isOwner} returnTo={returnTo} />}
			<div className="flex justify-center pt-2">
				<ProfileHistoryBackButton label="Torna indietro" variant="outline" size="lg" />
			</div>
			{result.status === "ok" && result.profile.type === "giocatore" && <aside aria-label="Sponsor" className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-4 pb-2">
				<p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">Powered by</p>
				<Image src="/banner-pubblicita/placeholder.png" width={384} height={108} alt="Spazio pubblicitario per sponsor" className="h-auto w-full rounded-xl object-contain" />
			</aside>}
		</main>
	);
	const page = <div className={cn("min-h-[calc(100vh-4rem)] bg-brand-paper", hasProfile && "public-profile-page")} style={hasProfile ? {"--profile-accent": getProfileAccent(result.profile.type)} as CSSProperties : undefined}>{content}</div>;
	if (result.status !== "ok") return page;
	return (
		<ProfileInterestDialog
			target={{kind: "profilo", id: result.profile.id, profileType: result.profile.type}}
			href={"/dettagli-profilo?" + new URLSearchParams({id: result.profile.id, type: result.profile.type}).toString()}
		>{page}</ProfileInterestDialog>
	);
}
