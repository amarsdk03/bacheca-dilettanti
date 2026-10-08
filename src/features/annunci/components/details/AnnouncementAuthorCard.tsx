import Link from "next/link";
import {ExternalLinkIcon, UserRoundIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {AnnouncementDetail} from "@/features/annunci/announcement-model";
import ProfileSectionHeading from "@/features/dettagli-profilo/components/ProfileSectionHeading";

export default function AnnouncementAuthorCard({announcement}: {announcement: AnnouncementDetail}) {
	const {author} = announcement;
	return <Card>
		<CardHeader><CardTitle><ProfileSectionHeading icon={UserRoundIcon}>Apri profilo</ProfileSectionHeading></CardTitle></CardHeader>
		<CardContent>
			{author.kind === "registered" ? <Button render={<Link href={`/dettagli-profilo?${new URLSearchParams({id: author.profileId, type: author.profileType})}`} />} nativeButton={false} variant="outline" className="h-auto min-h-10 w-full whitespace-normal">
				<ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />Apri profilo
			</Button> : <p className="text-center text-sm text-muted-foreground">{author.kind === "anonymous" ? "Questo autore non dispone di un profilo pubblico." : "Profilo temporaneamente non disponibile."}</p>}
		</CardContent>
	</Card>;
}
