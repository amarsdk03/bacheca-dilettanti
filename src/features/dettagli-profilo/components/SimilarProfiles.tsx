import {TriangleAlertIcon, UsersIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import ProfileCard from "@/features/profili/components/cards/ProfileCard";
import type {DirectoryProfile} from "@/features/profili/profile-directory-model";

export default function SimilarProfiles({profiles, unavailable}: {profiles: DirectoryProfile[]; unavailable: boolean}) {
	return (
		<section aria-labelledby="similar-profiles-title" className="flex flex-col gap-4">
			<h2 id="similar-profiles-title" className="font-home-display text-2xl font-medium uppercase">Profili simili</h2>
			{unavailable ? (
				<Alert variant="destructive">
					<TriangleAlertIcon aria-hidden="true" />
					<AlertTitle>Profili simili temporaneamente non disponibili</AlertTitle>
					<AlertDescription>Riprova più tardi per scoprire altri profili.</AlertDescription>
				</Alert>
			) : profiles.length === 0 ? (
				<Empty className="min-h-56 border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon"><UsersIcon aria-hidden="true" /></EmptyMedia>
						<EmptyTitle>Nessun profilo simile</EmptyTitle>
						<EmptyDescription>Non ci sono ancora altri profili pubblici dello stesso tipo.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{profiles.map(profile => <li key={`${profile.type}-${profile.id}`} className="min-w-0"><ProfileCard profile={profile} /></li>)}
				</ul>
			)}
		</section>
	);
}
