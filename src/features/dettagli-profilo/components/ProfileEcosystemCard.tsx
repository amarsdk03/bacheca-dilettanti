import Image from "next/image";
import {NetworkIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import ProfileSectionHeading from "./ProfileSectionHeading";

export default function ProfileEcosystemCard({name}: {name: string}) {
	return <Card className="min-w-0">
		<CardHeader><CardTitle><ProfileSectionHeading icon={NetworkIcon}>Ecosistema {name}</ProfileSectionHeading></CardTitle></CardHeader>
		<CardContent className="flex flex-col items-center gap-4">
			<p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">Powered by</p>
			<Image src="/banner-pubblicita/placeholder.png" width={384} height={108} alt="Spazio pubblicitario per sponsor" className="h-auto w-full max-w-md rounded-xl object-contain" />
		</CardContent>
	</Card>;
}
