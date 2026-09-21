import {TriangleAlertIcon, UsersIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import ProfileCard from "@/features/profili/components/cards/ProfileCard";
import type {DirectoryProfile} from "@/features/profili/profile-directory-model";

export default function SimilarProfiles({profiles, unavailable}: {profiles: DirectoryProfile[]; unavailable: boolean}) {
	if (unavailable) return (
		<Alert variant="destructive">
			<TriangleAlertIcon aria-hidden="true" />
			<AlertTitle>Profili simili temporaneamente non disponibili</AlertTitle>
			<AlertDescription>Riprova più tardi per scoprire altri profili.</AlertDescription>
		</Alert>
	);

	if (profiles.length === 0) return (
		<Empty className="min-h-56 border bg-card">
			<EmptyHeader>
				<EmptyMedia variant="icon"><UsersIcon aria-hidden="true" /></EmptyMedia>
				<EmptyTitle>Nessun profilo simile</EmptyTitle>
				<EmptyDescription>Non ci sono ancora altri profili pubblici dello stesso tipo.</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);

	return (
		<section aria-label="Profili simili" className="flex flex-col gap-4">
			<ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{profiles.map(profile => <li key={`${profile.type}-${profile.id}`} className="min-w-0"><ProfileCard profile={profile} /></li>)}
			</ul>
		</section>
	);
}
