import type {CSSProperties, ReactNode} from "react";
import {TriangleAlertIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import DetailActions from "@/features/interazioni/DetailActions";
import {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {cn} from "@/lib/utils";
import type {ProfileDetail, ProfileDetailResult} from "./profile-detail-model";
import ProfileHistoryBackButton from "./components/ProfileHistoryBackButton";
import DettagliProfiloGiocatore from "./components/types/DettagliProfiloGiocatore";
import DettagliProfiloSquadra from "./components/types/DettagliProfiloSquadra";
import DettagliProfiloStaffSportivo from "./components/types/DettagliProfiloStaffSportivo";
import DettagliProfiloProfessionistiStudi from "./components/types/DettagliProfiloProfessionistiStudi";
import DettagliProfiloArbitro from "./components/types/DettagliProfiloArbitro";
import DettagliProfiloCreator from "./components/types/DettagliProfiloCreator";
import DettagliProfiloTorneoEvento from "./components/types/DettagliProfiloTorneoEvento";
import DettagliProfiloCampiImpianti from "./components/types/DettagliProfiloCampiImpianti";

function ProfileContent({profile, actions}: {profile: ProfileDetail; actions: ReactNode}) {
	switch (profile.type) {
		case "giocatore": return <DettagliProfiloGiocatore profile={profile} actions={actions} />;
		case "squadra": return <DettagliProfiloSquadra profile={profile} actions={actions} />;
		case "staff-sportivo": return <DettagliProfiloStaffSportivo profile={profile} actions={actions} />;
		case "professionisti-studi": return <DettagliProfiloProfessionistiStudi profile={profile} actions={actions} />;
		case "arbitro": return <DettagliProfiloArbitro profile={profile} actions={actions} />;
		case "creators": return <DettagliProfiloCreator profile={profile} actions={actions} />;
		case "torneo-evento": return <DettagliProfiloTorneoEvento profile={profile} actions={actions} />;
		case "campi-impianti-sportivi": return <DettagliProfiloCampiImpianti profile={profile} actions={actions} />;
	}
}

export default function DettagliProfilo({result}: {result: Exclude<ProfileDetailResult, {status: "not-found"}>}) {
	const hasProfile = result.status === "ok";
	const actions = result.status === "ok" ? (
		<DetailActions
			target={{kind: "profilo", id: result.profile.id}}
			href={`/dettagli-profilo?${new URLSearchParams({id: result.profile.id, type: result.profile.type}).toString()}`}
			presentation="profile"
		/>
	) : null;
	const content = (
		<main className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
			<div className="flex items-center justify-between gap-3">
				<ProfileHistoryBackButton />
			</div>
			{result.status === "error" ? (
				<Alert variant="destructive">
					<TriangleAlertIcon aria-hidden="true" />
					<AlertTitle>Profilo temporaneamente non disponibile</AlertTitle>
					<AlertDescription>Riprova tra poco oppure torna alla pagina precedente.</AlertDescription>
				</Alert>
			) : <ProfileContent profile={result.profile} actions={actions} />}
			<div className="flex justify-center pt-2">
				<ProfileHistoryBackButton label="Torna indietro" variant="outline" size="lg" />
			</div>
		</main>
	);
	return <div className={cn("min-h-[calc(100vh-4rem)] bg-brand-paper", hasProfile && "public-profile-page")} style={hasProfile ? {"--profile-accent": getProfileAccent(result.profile.type)} as CSSProperties : undefined}>{content}</div>;
}
