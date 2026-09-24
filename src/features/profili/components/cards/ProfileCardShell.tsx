import type {CSSProperties} from "react";
import Link from "next/link";
import type {LucideIcon} from "lucide-react";
import {
	ArrowUpRightIcon,
	BadgeCheckIcon,
	BriefcaseBusinessIcon,
	Building2Icon,
	CalendarCheckIcon,
	CircleDollarSignIcon,
	ClapperboardIcon,
	GraduationCapIcon,
	ListChecksIcon,
	MapPinIcon,
	TagsIcon,
	UsersIcon,
} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import type {DirectoryProfileFact, DirectoryProfileFactKind} from "@/features/profili/profile-directory-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {profileInitials} from "@/features/profilo/public-profile-display";
import type {ProfileCardData} from "./profile-card-model";

const PROFILE_FACT_ICONS: Record<DirectoryProfileFactKind, LucideIcon> = {
	availability: CalendarCheckIcon,
	content: ClapperboardIcon,
	figures: BriefcaseBusinessIcon,
	headquarters: Building2Icon,
	location: MapPinIcon,
	price: CircleDollarSignIcon,
	roles: UsersIcon,
	services: ListChecksIcon,
	specializations: GraduationCapIcon,
	types: TagsIcon,
};

function ProfileFactGrid({facts, accent}: {facts: readonly DirectoryProfileFact[], accent: string}) {
	if (facts.length === 0) {
		return <p className="rounded-xl bg-muted/55 p-3 text-sm text-muted-foreground">Informazioni non specificate.</p>;
	}

	return (
		<dl className="grid grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 py-3 px-1">
			{facts.map(({kind, label, value}) => {
				const Icon = PROFILE_FACT_ICONS[kind];
				return (
					<div key={kind} className="min-w-0 rounded-xl">
						<dt
							className="flex items-center gap-1.5 text-muted-foreground"
							style={{color: accent, filter: "brightness(50%)"}}
						>
							<Icon className="size-3.5 shrink-0" aria-hidden="true" />
							<span className="text-xs truncate uppercase">{label}</span>
						</dt>
						<dd className="mt-1 font-medium" title={value}>{value}</dd>
					</div>
				);
			})}
		</dl>
	);
}

export default function ProfileCardShell({
	profile,
	summary,
	emptyPresentation,
	facts,
}: {
	profile: ProfileCardData;
	summary: string;
	emptyPresentation: string;
	facts: readonly DirectoryProfileFact[];
}) {
	const option = PROFILE_OPTIONS.find(({value}) => value === profile.type) ?? PROFILE_OPTIONS[0];
	const accent = getProfileAccent(profile.type);
	const detailHref = "/dettagli-profilo?" + new URLSearchParams({id: profile.id, type: profile.type});
	const style = {"--profile-accent": accent} as CSSProperties;

	return (
		<Link
			href={detailHref}
			className="group block h-full rounded-xl font-home-body outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			aria-label={"Apri il profilo di " + profile.title}
		>
			<Card className="relative h-full gap-5 overflow-hidden transition-shadow hover:shadow-lg" style={style}>
				<div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-(--profile-accent)" />
				<CardHeader className="gap-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<Badge variant="outline" style={{borderColor: accent, color: accent}}>
							<ProfilePngIcon type={profile.type} color={accent} className="size-3" />
							{option.label}
						</Badge>
						{profile.verified && <Badge variant="secondary"><BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />Verificato</Badge>}
					</div>
					<div className="flex min-w-0 items-center gap-4">
						<Avatar className="size-16 shrink-0 ring-2 ring-(--profile-accent)/20">
							{profile.imageUrl && <AvatarImage src={profile.imageUrl} alt={"Foto profilo di " + profile.title} />}
							<AvatarFallback>{profileInitials(profile.title)}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col">
							<CardTitle><h3 className="font-home-display text-2xl uppercase wrap-anywhere">{profile.title}</h3></CardTitle>
							<p className="text-sm font-semibold text-muted-foreground">{summary}</p>
						</div>
					</div>
				</CardHeader>
				<CardContent className="mt-auto">
					<ProfileFactGrid facts={facts} accent={accent} />
				</CardContent>
				<CardFooter className="justify-between gap-3">
					<span className="text-sm font-semibold">Informazioni complete</span>
					<ArrowUpRightIcon className="size-5 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
				</CardFooter>
			</Card>
		</Link>
	);
}
