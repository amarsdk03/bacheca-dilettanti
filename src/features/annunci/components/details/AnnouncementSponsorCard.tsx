import Image from "next/image";
import {MegaphoneIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import ProfileSectionHeading from "@/features/dettagli-profilo/components/ProfileSectionHeading";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";

export default function AnnouncementSponsorCard({profileType}: {profileType: ProfileType}) {
	const label = PROFILE_OPTIONS.find(option => option.value === profileType)?.label ?? "Profilo";
	return <Card className="min-w-0">
		<CardHeader><CardTitle><ProfileSectionHeading icon={MegaphoneIcon}>Annuncio {label}</ProfileSectionHeading></CardTitle></CardHeader>
		<CardContent className="flex flex-col items-center gap-4">
			<p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">Powered by</p>
			<Image src="/banner-pubblicita/placeholder.png" width={384} height={108} alt="Spazio pubblicitario per sponsor" className="h-auto w-full max-w-md rounded-xl object-contain" />
		</CardContent>
	</Card>;
}
