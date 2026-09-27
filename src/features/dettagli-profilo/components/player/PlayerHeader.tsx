import type {ReactNode} from "react";
import DynamicReactFlag from "@/components/dynamic/DynamicReactFlag";
import {
	CalendarDaysIcon,
	CircleCheckBigIcon,
	FlagIcon,
	FootprintsIcon,
	MegaphoneIcon,
	RulerIcon,
	ScaleIcon,
	ShirtIcon,
	StarIcon,
	UserRoundPlusIcon,
} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import type {PlayerProfileDetail} from "../../profile-detail-model";
import ProfilePngIcon from "@/features/profilo/ProfilePngIcon";
import {profileInitials} from "@/features/profilo/public-profile-display";
import {OfficialVerificationIcon, RegisteredUserBadge} from "@/features/profilo/ProfileVerificationStatus";
import ProfileFactsGrid, {type ProfileFact} from "../ProfileFactsGrid";
import PlayerRolePitch from "./PlayerRolePitch";
import {getPlayerRolePitchMarkers} from "@/features/profilo/player-roles";

type PlayerHeaderProps = Pick<PlayerProfileDetail, "title" | "imageUrl" | "emailConfirmed" | "officialVerified" | "primary" | "availabilityLabel" | "player" | "followerCount" | "announcementCount"> & {
	actions?: ReactNode;
};

export default function PlayerHeader({title, imageUrl, emailConfirmed, officialVerified, primary, availabilityLabel, player, followerCount, announcementCount, actions}: PlayerHeaderProps) {
	const {age, primaryRoles, specificRoles, gender, nationality, nationalityCode, sportTypes, preferredFoot, height, weight} = player;
	const hasRolePitch = getPlayerRolePitchMarkers(primaryRoles, specificRoles).length > 0;
	const facts: ProfileFact[] = [
		{label: "Età", icon: CalendarDaysIcon, value: age !== null ? `${age} anni` : null},
		{label: "Altezza", icon: RulerIcon, value: height ? `${height} cm` : null},
		{label: "Peso", icon: ScaleIcon, value: weight ? `${weight} kg` : null},
		{label: "Piede", icon: FootprintsIcon, value: preferredFoot},
		{label: "Genere", icon: ShirtIcon, value: gender},
		{
			label: "Nazionalità",
			icon: FlagIcon,
			value: nationality,
			content: nationality ? <span className="inline-flex items-center gap-2">{nationality}{nationalityCode && <DynamicReactFlag code={nationalityCode} className="h-4 w-6 rounded-xs ring-1 ring-border" />}</span> : null,
		},
		{label: "Disponibilità", icon: CircleCheckBigIcon, value: availabilityLabel},
		{label: "Tipologie di calcio", icon: ShirtIcon, value: sportTypes},
		{label: "Follower", icon: UserRoundPlusIcon, value: followerCount?.toLocaleString("it-IT") ?? null},
		{label: "Num. annunci", icon: MegaphoneIcon, value: announcementCount?.toLocaleString("it-IT") ?? null},
	];

	return (
		<header aria-label="Profilo del giocatore">
			<Card className="public-profile-hero gap-5 rounded-2xl [--card-spacing:--spacing(5)] sm:gap-8 sm:[--card-spacing:--spacing(6)]">
				<CardHeader className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
						<Avatar className="size-24 shrink-0 ring-4 ring-border sm:size-28">
							{imageUrl && <AvatarImage src={imageUrl} alt={`Foto profilo di ${title}`} />}
							<AvatarFallback><span className="font-home-display text-4xl">{profileInitials(title)}</span></AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-3">
							<h1 className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">
								{title} <OfficialVerificationIcon officialVerified={officialVerified} className={"size-7 align-[0.16em]"} />
							</h1>
							{(primaryRoles.length > 0 || nationalityCode) && (
								<div role="group" className="flex flex-wrap items-center gap-2" aria-label="Ruoli principali e nazionalità">
									{primaryRoles.map(role => <Badge key={role} variant="default">{role}</Badge>)}
									{nationalityCode && <DynamicReactFlag code={nationalityCode} className="h-4 w-6 rounded-xs ring-1 ring-border" />}
								</div>
							)}
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="public-profile-type-badge"><ProfilePngIcon type="giocatore" color="currentColor" className="size-3" />Giocatore</Badge>
								<RegisteredUserBadge emailConfirmed={emailConfirmed} />
								{primary && <Badge variant="outline"><StarIcon data-icon="inline-start" aria-hidden="true" />Profilo principale</Badge>}
							</div>
						</div>
					</div>
					{actions && <div className="w-full min-w-0 xl:w-auto xl:shrink-0">{actions}</div>}
				</CardHeader>
				<CardContent className={hasRolePitch ? "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,15fr)_minmax(0,4fr)]" : "grid min-w-0 gap-6 xl:grid-cols-1"}>
					<ProfileFactsGrid facts={facts} layout="balanced" />
					{hasRolePitch && <PlayerRolePitch primaryRoles={primaryRoles} specificRoles={specificRoles} className="xl:justify-self-center pt-0.5" />}
				</CardContent>
			</Card>
		</header>
	);
}
