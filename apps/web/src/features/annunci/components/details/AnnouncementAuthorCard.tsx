import {UserRoundIcon} from "lucide-react";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import ProfileSectionHeading from "@/features/dettagli-profilo/components/ProfileSectionHeading";
import AnnouncementAuthorSummary from "@/features/annunci/AnnouncementAuthorSummary";

export default function AnnouncementAuthorCard({announcement}: {announcement: AnnouncementDetail}) {
	const {author} = announcement;
	return <Card>
		<CardHeader><CardTitle><ProfileSectionHeading className="text-xl lg:text-2xl" icon={UserRoundIcon}>Apri profilo</ProfileSectionHeading></CardTitle></CardHeader>
		<CardContent>
			{author.kind === "registered" ? <AnnouncementAuthorSummary author={author} actionLabel={`Apri scheda ${PROFILE_OPTIONS.find(option => option.value === author.profileType)?.label.toLocaleLowerCase("it-IT") ?? "profilo"}`} showPresentation={false} /> : <p className="text-center text-sm text-muted-foreground">{author.kind === "anonymous" ? "Questo autore non dispone di un profilo pubblico." : "Profilo temporaneamente non disponibile."}</p>}
		</CardContent>
	</Card>;
}
