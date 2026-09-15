import type {ReactNode} from "react";
import {IdCardIcon, MegaphoneIcon, RouteIcon} from "lucide-react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

export default function ProfileTabs({
	label,
	overview,
	career,
	announcements,
}: {
	label: string;
	overview: ReactNode;
	career?: ReactNode;
	announcements: ReactNode;
}) {
	const hasCareer = career !== undefined && career !== null;

	return (
		<Tabs defaultValue="overview" className="min-w-0 gap-6">
			<TabsList variant="line" aria-label={label} className="h-12 w-full justify-center sm:w-fit">
				<TabsTrigger value="overview" className="min-h-11 px-2"><IdCardIcon data-icon="inline-start" aria-hidden="true" /><span>Panoramica</span></TabsTrigger>
				{hasCareer && <TabsTrigger value="career" className="min-h-11 px-2"><RouteIcon data-icon="inline-start" aria-hidden="true" /><span>Carriera</span></TabsTrigger>}
				<TabsTrigger value="announcements" className="min-h-11 px-2"><MegaphoneIcon data-icon="inline-start" aria-hidden="true" /><span>Annunci</span></TabsTrigger>
			</TabsList>
			<TabsContent value="overview">{overview}</TabsContent>
			{hasCareer && <TabsContent value="career">{career}</TabsContent>}
			<TabsContent value="announcements">{announcements}</TabsContent>
		</Tabs>
	);
}
