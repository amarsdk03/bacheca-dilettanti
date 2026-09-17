import type {CSSProperties} from "react";
import {
	BadgeCheckIcon,
	CircleDotIcon,
	ExternalLinkIcon,
	InfoIcon,
	StarIcon,
} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import type {GenericProfileDetail as PublicProfile} from "@/features/dettagli-profilo/profile-detail-model";
import ProfileLocationSummary from "@/features/dettagli-profilo/components/ProfileLocationSummary";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {profileInitials} from "@/features/profilo/public-profile-display";
import {cn} from "@/lib/utils";
import type {ProfileDetailPresentation} from "./profile-detail-presentation";
import ProfileExperienceHistory from "./ProfileExperienceHistory";

function ProfileFieldValue({field}: {field: PublicProfile["fields"][number]}) {
	if (!field.href) return field.value;
	return (
		<a
			href={field.href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
		>
			Guarda video highlights
			<ExternalLinkIcon className="size-4" aria-hidden="true" />
			<span className="sr-only"> (si apre in una nuova scheda)</span>
		</a>
	);
}

function FactGrid({fields}: {fields: PublicProfile["primaryFields"]}) {
	if (fields.length === 0) return null;
	return (
		<dl className={cn("grid gap-3 sm:grid-cols-2", fields.length > 2 && "xl:grid-cols-3")}>
			{fields.map((field) => (
				<div key={field.label} className="min-w-0 rounded-xl bg-muted/55 p-4">
					<dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
					<dd className="mt-1 wrap-anywhere text-base font-semibold"><ProfileFieldValue field={field} /></dd>
				</div>
			))}
		</dl>
	);
}

export function ProfileDetailsHeader({
	profile,
	presentation,
}: {
	profile: PublicProfile;
	presentation: ProfileDetailPresentation;
}) {
	const option = PROFILE_OPTIONS.find(({value}) => value === profile.type) ?? PROFILE_OPTIONS[0];
	const accent = getProfileAccent(profile.type);
	const headerStyle = {"--profile-accent": accent} as CSSProperties;

	return (
		<header
			className="relative isolate overflow-hidden rounded-2xl border bg-card p-5 sm:p-8"
			style={{...headerStyle, borderColor: `color-mix(in oklab, ${accent} 28%, transparent)`}}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-(--profile-accent)/15 via-(--profile-accent)/5 to-transparent"
			/>
			<div className="flex flex-col gap-6 sm:flex-row sm:items-center">
				<Avatar className="size-28 shrink-0 ring-4 ring-background sm:size-36">
					{profile.imageUrl && <AvatarImage src={profile.imageUrl} alt={`Foto profilo di ${profile.title}`} />}
					<AvatarFallback><span className="font-home-display text-4xl">{profileInitials(profile.title)}</span></AvatarFallback>
				</Avatar>
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" style={{borderColor: accent, color: accent}}>
							<ProfilePngIcon type={profile.type} color={accent} className="size-3" />
							{option.label}
						</Badge>
						{profile.verified && <Badge variant="secondary"><BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />Verificato</Badge>}
						{profile.primary && <Badge variant="outline"><StarIcon data-icon="inline-start" aria-hidden="true" />Profilo principale</Badge>}
					</div>
					<h1 className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">{profile.title}</h1>
					<p className="text-base text-muted-foreground sm:text-lg">{presentation.intro}</p>
					<ProfileLocationSummary locations={profile.locations} className="max-w-md" />
					{profile.availabilityLabel && <div><Badge variant="secondary"><CircleDotIcon data-icon="inline-start" aria-hidden="true" />{profile.availabilityLabel}</Badge></div>}
				</div>
			</div>
		</header>
	);
}

export default function ProfileDetailsOverview({
	profile,
	presentation,
}: {
	profile: PublicProfile;
	presentation: ProfileDetailPresentation;
}) {
	const narrativeFieldLabels = new Set(presentation.narrativeFieldLabels);
	const narrativeFields = profile.fields.filter((field) => narrativeFieldLabels.has(field.label));
	const primaryFieldLabels = new Set(profile.primaryFields.map(({label}) => label));
	const supportingFields = profile.fields.filter((field) =>
		!narrativeFieldLabels.has(field.label) && !primaryFieldLabels.has(field.label),
	);

	return (
		<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
			<div className="flex min-w-0 flex-col gap-5">
				{narrativeFields.map((field) => (
					<Card key={field.label}>
						<CardHeader>
							<CardTitle><h2 className="font-home-display text-2xl uppercase">{field.label}</h2></CardTitle>
							<CardDescription>{presentation.summary}</CardDescription>
						</CardHeader>
						<CardContent><p className="leading-7 whitespace-pre-wrap wrap-anywhere"><ProfileFieldValue field={field} /></p></CardContent>
					</Card>
				))}
				{narrativeFields.length === 0 && (
					<Card>
						<CardHeader>
							<CardTitle><h2 className="font-home-display text-2xl uppercase">{presentation.summary}</h2></CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-3 text-muted-foreground">
							<InfoIcon className="size-5 shrink-0" aria-hidden="true" />
							<p>Questo profilo non ha ancora aggiunto una presentazione.</p>
						</CardContent>
					</Card>
				)}
				<ProfileExperienceHistory experiences={profile.experiences ?? []} />
			</div>
			<Card className="min-w-0">
				<CardHeader>
					<CardTitle><h2 className="font-home-display text-2xl uppercase">In evidenza</h2></CardTitle>
					<CardDescription>{presentation.summary}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<FactGrid fields={profile.primaryFields} />
					{supportingFields.length > 0 && (
						<dl className="flex flex-col gap-3">
							{supportingFields.map((field) => (
								<div key={field.label} className="min-w-0 rounded-xl border bg-background/60 p-4">
									<dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
									<dd className="mt-1 whitespace-pre-wrap wrap-anywhere font-medium"><ProfileFieldValue field={field} /></dd>
								</div>
							))}
						</dl>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
