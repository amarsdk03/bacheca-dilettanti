"use client";

import {type ReactNode, useState} from "react";
import {CalendarRangeIcon, IdCardIcon, MegaphoneIcon, RouteIcon, UsersIcon} from "lucide-react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import ProfileSectionNavigation from "@/components/navigation/ProfileSectionNavigation";

export default function ProfileTabs({
	label,
	overview,
	career,
	announcements,
	similarProfiles,
	presentation = "default",
}: {
	label: string;
	overview: ReactNode;
	career?: ReactNode;
	announcements: ReactNode;
	similarProfiles?: ReactNode;
	presentation?: "default" | "profile";
}) {
	const [activeTab, setActiveTab] = useState("overview");
	const hasCareer = career !== undefined && career !== null;
	const hasSimilarProfiles = similarProfiles !== undefined && similarProfiles !== null;
	const isProfile = presentation === "profile";
	const triggerClassName = isProfile ? "profile-section-tab" : "min-h-11 px-2";
	const navigation = <TabsList variant="line" aria-label={label} className={isProfile ? "profile-section-tab-list" : "h-12 w-max min-w-full justify-center sm:min-w-0"}>
		<TabsTrigger value="overview" className={triggerClassName}><IdCardIcon data-icon="inline-start" aria-hidden="true" /><span>Panoramica</span></TabsTrigger>
		{hasCareer && <TabsTrigger value="career" className={triggerClassName}><CalendarRangeIcon data-icon="inline-start" aria-hidden="true" /><span>Carriera</span></TabsTrigger>}
		<TabsTrigger value="announcements" className={triggerClassName}><MegaphoneIcon data-icon="inline-start" aria-hidden="true" /><span>Annunci</span></TabsTrigger>
		{hasSimilarProfiles && <TabsTrigger value="similar-profiles" className={triggerClassName}><UsersIcon data-icon="inline-start" aria-hidden="true" /><span>Profili simili</span></TabsTrigger>}
	</TabsList>;

	return (
		<Tabs value={activeTab} onValueChange={value => {if (typeof value === "string") setActiveTab(value);}} className="min-w-0 gap-6">
			{isProfile ? <ProfileSectionNavigation activeValue={activeTab}>{navigation}</ProfileSectionNavigation> : <div className="min-w-0 overflow-x-auto">{navigation}</div>}
			<TabsContent value="overview">{overview}</TabsContent>
			{hasCareer && <TabsContent value="career">{career}</TabsContent>}
			<TabsContent value="announcements">{announcements}</TabsContent>
			{hasSimilarProfiles && <TabsContent value="similar-profiles">{similarProfiles}</TabsContent>}
		</Tabs>
	);
}
