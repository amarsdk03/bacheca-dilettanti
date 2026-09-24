import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import type {ReactNode} from "react";
import {ExternalLinkIcon, StarIcon} from "lucide-react";
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
	getProfileDetailFields,
	type ProfileDetailPresentation
} from "./profile-detail-presentation";
import ProfileFactsGrid from "./ProfileFactsGrid";
import ProfileIdentifier from "./ProfileIdentifier";
import ProfileLocationsCard from "./ProfileLocationsCard";
import ProfileSocialLinksCard from "./ProfileSocialLinks";

function ProfileFieldValue({field}: {field: PublicProfile["fields"][number]}) {
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
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="public-profile-type-badge"><ProfilePngIcon type={profile.type} color="currentColor" className="size-3" />{option.label}</Badge>
								<RegisteredUserBadge emailConfirmed={profile.emailConfirmed} />
								{profile.primary && <Badge variant="outline"><StarIcon data-icon="inline-start" aria-hidden="true" />Profilo principale</Badge>}
							</div>
						</div>
					</div>
					{actions && <div className="w-full min-w-0 xl:w-auto xl:shrink-0">{actions}</div>}
				</CardHeader>
				<CardContent><ProfileFactsGrid facts={getProfileDetailFacts(profile, presentation)} /></CardContent>
			</Card>
		</header>
	);
}

export default function ProfileDetailsOverview({profile, presentation}: {
	profile: PublicProfile;
	presentation: ProfileDetailPresentation;
}) {
	const fields = getProfileDetailFields(profile);
	const description = fields.find(field => field.label === "Presentazione");
	const narrativeFields = presentation.narrativeFieldLabels.flatMap(label => {
		const field = fields.find(candidate => candidate.label === label);
		return field ? [field] : [];
	});
	const usedLabels = new Set(["Presentazione", ...presentation.narrativeFieldLabels, ...presentation.facts.map(({label}) => label)]);
	const supportingFields = fields.filter(({label}) => !usedLabels.has(label));

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
			<div className="flex min-w-0 flex-col gap-5">
				<Card>
					<CardHeader><CardTitle><h2 className="font-home-display text-2xl uppercase">Descrizione</h2></CardTitle></CardHeader>
					<CardContent><p className="text-base leading-7 whitespace-pre-wrap wrap-anywhere">{description && description.value !== "Non specificato" ? <ProfileFieldValue field={description} /> : "Descrizione non disponibile"}</p></CardContent>
				</Card>
				{narrativeFields.map(field => (
					<Card key={field.label}>
						<CardHeader><CardTitle><h2 className="font-home-display text-2xl uppercase">{field.label}</h2></CardTitle></CardHeader>
						<CardContent><p className="text-base leading-7 whitespace-pre-wrap wrap-anywhere"><ProfileFieldValue field={field} /></p></CardContent>
					</Card>
				))}
			</div>
			<aside aria-label="Informazioni e contatti" className="flex min-w-0 flex-col gap-5">
				{supportingFields.length > 0 && <Card className="min-w-0">
					<CardHeader><CardTitle><h2 className="font-home-display text-2xl uppercase">Altre informazioni</h2></CardTitle></CardHeader>
					<CardContent><dl className="flex flex-col gap-5">
						{supportingFields.map(field => <div key={field.label} className="flex min-w-0 flex-col gap-2">
							<dt className="text-sm font-semibold">{field.label}</dt>
							<dd className="text-sm leading-6 whitespace-pre-wrap wrap-anywhere"><ProfileFieldValue field={field} /></dd>
						</div>)}
					</dl></CardContent>
				</Card>}
				<ProfileLocationsCard locations={profile.locations} />
				<ProfileSocialLinksCard socialLinks={profile.socialLinks} presentation="profile" />
				<ProfileIdentifier profileId={profile.id} />
			</aside>
		</div>
	);
}
