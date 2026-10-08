import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import type {ReactNode} from "react";
import {ExternalLinkIcon, EyeOff, StarIcon, type LucideIcon} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {GenericProfileDetail as PublicProfile} from "../profile-detail-model";
import ProfilePngIcon from "@/features/profilo/ProfilePngIcon";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {profileInitials} from "@/features/profilo/public-profile-display";
import {OfficialVerificationIcon, RegisteredUserBadge} from "@/features/profilo/ProfileVerificationStatus";
import {
	getProfileDetailFacts,
	getProfileDetailBadgeValues,
	getProfileDetailFields,
	type ProfileDetailPresentation
} from "./profile-detail-presentation";
import ProfileFactsGrid from "./ProfileFactsGrid";
import ProfileIdentifier from "./ProfileIdentifier";
import ProfileEcosystemCard from "./ProfileEcosystemCard";
import ProfileLocationsCard from "./ProfileLocationsCard";
import ProfileSocialLinksCard from "./ProfileSocialLinks";
import StructuredFieldList from "@/components/data-info/StructuredFieldList";
import ProfileSectionHeading from "./ProfileSectionHeading";
import {cn} from "@/lib/utils";

function ProfileFieldValue({field}: {field: PublicProfile["fields"][number]}) {
	if (field.items?.length) return <StructuredFieldList items={field.items} style={field.listStyle} />;
	if (!field.href) return field.value;
	return (
		<ExternalLink href={field.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
			{field.value}
			<ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" />
			<span className="sr-only"> (si apre in una nuova scheda)</span>
		</ExternalLink>
	);
}

export function ProfileDetailsHeader({profile, presentation, actions}: {
	profile: PublicProfile;
	presentation: ProfileDetailPresentation;
	actions?: ReactNode;
}) {
	const option = PROFILE_OPTIONS.find(({value}) => value === profile.type)!;
	const badges = getProfileDetailBadgeValues(profile, presentation);

	return (
		<header aria-label={`Profilo ${option.label}`}>
			<Card className="public-profile-hero gap-5 rounded-2xl [--card-spacing:--spacing(5)] sm:gap-6 sm:[--card-spacing:--spacing(6)]">
				<CardHeader className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
						<Avatar className="size-24 shrink-0 ring-4 ring-border sm:size-28">
							{profile.imageUrl && <AvatarImage src={profile.imageUrl} alt={`Foto profilo di ${profile.title}`} />}
							<AvatarFallback><span className="font-home-display text-4xl">{profileInitials(profile.title)}</span></AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-3">
							<h1 className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">
								{profile.title} <OfficialVerificationIcon officialVerified={profile.officialVerified} className={"size-7 align-[0.16em]"} />
							</h1>
							{badges.length > 0 && <div role="group" aria-label="Caratteristiche del profilo" className="flex min-w-0 flex-wrap items-center gap-2">
								{badges.map(value => <Badge key={value} title={value} className="h-auto min-h-5 max-w-full min-w-0 shrink whitespace-normal">
									<span className="line-clamp-2 max-w-xs wrap-anywhere">{value}</span>
								</Badge>)}
							</div>}
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="public-profile-type-badge"><ProfilePngIcon type={profile.type} color="currentColor" className="size-3" />{option.label}</Badge>
								<RegisteredUserBadge emailConfirmed={profile.emailConfirmed} />
								{profile.anonymousName && <Badge variant="outline"><EyeOff data-icon="inline-start" aria-hidden="true" />Nome nascosto</Badge>}
								{profile.primary && <Badge variant="outline"><StarIcon data-icon="inline-start" aria-hidden="true" />Profilo principale</Badge>}
							</div>
						</div>
					</div>
					{actions && <div className="w-full min-w-0 xl:w-auto xl:shrink-0">{actions}</div>}
				</CardHeader>
				<CardContent><ProfileFactsGrid facts={getProfileDetailFacts(profile, presentation)} layout="balanced" /></CardContent>
			</Card>
		</header>
	);
}

export default function ProfileDetailsOverview({profile, presentation, authenticated, returnTo}: {
	profile: PublicProfile;
	presentation: ProfileDetailPresentation;
	authenticated: boolean;
	returnTo: string;
}) {
	const fields = getProfileDetailFields(profile);
	const renderField = (title: string, fieldLabel: string, icon: LucideIcon, centered = false) => {
		const field = fields.find(candidate => candidate.label === fieldLabel);
		return <Card key={title} className="min-w-0">
			<CardHeader><CardTitle><ProfileSectionHeading icon={icon}>{title}</ProfileSectionHeading></CardTitle></CardHeader>
			<CardContent>
				<div className={cn("text-base leading-7 whitespace-pre-wrap wrap-anywhere", centered && "flex flex-col items-center text-center [&>ul]:justify-center")}>
					{field && field.value !== "Non specificato" ? <ProfileFieldValue field={field} /> : <p className="text-sm text-muted-foreground">{title} non disponibile</p>}
				</div>
			</CardContent>
		</Card>;
	};
	const renderFooter = () => <>
		<ProfileEcosystemCard name={presentation.ecosystemName} />
		<ProfileIdentifier profileId={profile.id} name={presentation.identifierName} />
	</>;
	const hasTopCards = Boolean(presentation.sidebarFields?.length);

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
			<aside aria-label="Ecosistema e identificativo del profilo" className={cn("min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-1 lg:flex", hasTopCards ? "order-1 flex lg:order-2" : "order-2 hidden")}>
				{presentation.sidebarFields?.map(({title, fieldLabel, icon}) => renderField(title, fieldLabel, icon, true))}
				<div className="hidden flex-col gap-5 lg:flex">{renderFooter()}</div>
			</aside>
			<section aria-label="Panoramica del profilo" className="order-2 flex min-w-0 flex-col gap-5 lg:order-1 lg:col-start-1 lg:row-start-1">
				{presentation.sections.map((section, index) => {
					if (section.kind === "locations") return <ProfileLocationsCard key={section.title} locations={profile.locations} title={section.title} presentation="player" />;
					if (section.kind === "social") return <ProfileSocialLinksCard key={"social-" + index} socialLinks={profile.socialLinks} presentation="profile" authenticated={authenticated} returnTo={returnTo} />;
					return renderField(section.title, section.fieldLabel, section.icon, section.centered);
				})}
			</section>
			<div className="order-3 flex min-w-0 flex-col gap-5 lg:hidden">{renderFooter()}</div>
		</div>
	);
}
