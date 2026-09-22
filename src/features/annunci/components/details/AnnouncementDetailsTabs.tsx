"use client";

import {type ReactNode, useState} from "react";
import {IdCardIcon, MegaphoneIcon} from "lucide-react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import ProfileSectionNavigation from "@/components/navigation/ProfileSectionNavigation";

export default function AnnouncementDetailsTabs({overview, similar}: {overview: ReactNode; similar: ReactNode}) {
	const [active, setActive] = useState("overview");
	return <Tabs value={active} onValueChange={value => {if (typeof value === "string") setActive(value);}} className="min-w-0 gap-6">
		<ProfileSectionNavigation activeValue={active}>
			<TabsList variant="line" className="profile-section-tab-list" aria-label="Informazioni dell’annuncio">
				<TabsTrigger value="overview" className="profile-section-tab"><IdCardIcon data-icon="inline-start" aria-hidden="true" />Panoramica</TabsTrigger>
				<TabsTrigger value="similar" className="profile-section-tab"><MegaphoneIcon data-icon="inline-start" aria-hidden="true" />Annunci simili</TabsTrigger>
			</TabsList>
		</ProfileSectionNavigation>
		<TabsContent value="overview">{overview}</TabsContent>
		<TabsContent value="similar">{similar}</TabsContent>
	</Tabs>;
}
