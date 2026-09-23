import type {ReactNode} from "react";
import {
	BadgeCheckIcon,
	CalendarDaysIcon,
	CircleCheckBigIcon,
	FootprintsIcon,
	MegaphoneIcon,
	RulerIcon,
	ScaleIcon,
	ShirtIcon,
	StarIcon,
	UserRoundPlusIcon
} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import type {PlayerProfileDetail} from "../../profile-detail-model";
import ProfilePngIcon from "@/features/profilo/ProfilePngIcon";
import {profileInitials} from "@/features/profilo/public-profile-display";
import ProfileFactsGrid, {type ProfileFact} from "../ProfileFactsGrid";

type PlayerHeaderProps = Pick<PlayerProfileDetail, "title" | "imageUrl" | "verified" | "primary" | "availabilityLabel" | "player" | "followerCount" | "announcementCount"> & {
	actions?: ReactNode;
};

export default function PlayerHeader({title, imageUrl, verified, primary, availabilityLabel, player, followerCount, announcementCount, actions}: PlayerHeaderProps) {
	const {age, sportTypes, preferredFoot, height, weight} = player;
	const facts: ProfileFact[] = [
		{label: "Età", icon: CalendarDaysIcon, value: age !== null ? `${age} anni` : null},
		{label: "Altezza", icon: RulerIcon, value: height ? `${height} cm` : null},
		{label: "Peso", icon: ScaleIcon, value: weight ? `${weight} kg` : null},
		{label: "Piede", icon: FootprintsIcon, value: preferredFoot},
		{label: "Disponibilità", icon: CircleCheckBigIcon, value: availabilityLabel},
		{label: "Tipologie di calcio", icon: ShirtIcon, value: sportTypes},
		{label: "Follower", icon: UserRoundPlusIcon, value: followerCount?.toLocaleString("it-IT") ?? null},
		{label: "Num. annunci", icon: MegaphoneIcon, value: announcementCount?.toLocaleString("it-IT") ?? null},
	];

	return (
		<header aria-label="Profilo del giocatore">
			<Card className="public-profile-hero gap-5 rounded-2xl [--card-spacing:--spacing(5)] sm:gap-6 sm:[--card-spacing:--spacing(6)]">
				<CardHeader className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
						<Avatar className="size-24 shrink-0 ring-4 ring-border sm:size-28">
							{imageUrl && <AvatarImage src={imageUrl} alt={`Foto profilo di ${title}`} />}
							<AvatarFallback><span className="font-home-display text-4xl">{profileInitials(title)}</span></AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-3">
							<h1 className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">{title}</h1>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="public-profile-type-badge"><ProfilePngIcon type="giocatore" color="currentColor" className="size-3" />Giocatore</Badge>
								{verified && <Badge variant="secondary"><BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />Verificato</Badge>}
								{primary && <Badge variant="outline"><StarIcon data-icon="inline-start" aria-hidden="true" />Profilo principale</Badge>}
							</div>
						</div>
					</div>
					{actions && <div className="w-full min-w-0 xl:w-auto xl:shrink-0">{actions}</div>}
				</CardHeader>
				<CardContent>
					<ProfileFactsGrid facts={facts} />
				</CardContent>
			</Card>
		</header>
	);
}
