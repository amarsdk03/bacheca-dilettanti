import {BadgeCheckIcon, CalendarDaysIcon, CircleDotIcon, StarIcon} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import type {PlayerProfileDetail} from "../../profile-detail-model";
import ProfileLocationSummary from "../ProfileLocationSummary";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {profileInitials} from "@/features/profilo/public-profile-display";
import PlayerRolePitch from "./PlayerRolePitch";

type PlayerHeaderProps = Pick<PlayerProfileDetail, "title" | "imageUrl" | "verified" | "primary" | "availabilityLabel" | "locations"> & {
	age: number | null;
	primaryRoles: string[];
	specificRoles: string[];
};

export default function PlayerHeader({title, imageUrl, verified, primary, availabilityLabel, locations, age, primaryRoles, specificRoles}: PlayerHeaderProps) {
	const accent = getProfileAccent("giocatore");
	const roles = specificRoles.length > 0 ? specificRoles : primaryRoles;
	return (
		<header className="relative isolate overflow-hidden rounded-2xl border border-brand-indigo/20 bg-card p-5 sm:p-8">
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-brand-indigo/15 via-brand-indigo/5 to-transparent" />
			<div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:gap-8">
				<div className="flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-center">
					<Avatar className="size-28 shrink-0 ring-4 ring-background sm:size-36">
						{imageUrl && <AvatarImage src={imageUrl} alt={`Foto profilo di ${title}`} />}
						<AvatarFallback><span className="font-home-display text-4xl">{profileInitials(title)}</span></AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" style={{borderColor: accent, color: accent}}><ProfilePngIcon type="giocatore" color={accent} className="size-3" />Giocatore</Badge>
							{verified && <Badge variant="secondary"><BadgeCheckIcon data-icon="inline-start" aria-hidden="true" />Verificato</Badge>}
							{primary && <Badge variant="outline"><StarIcon data-icon="inline-start" aria-hidden="true" />Profilo principale</Badge>}
						</div>
						<h1 className="font-home-display text-4xl leading-tight font-medium uppercase wrap-anywhere sm:text-5xl lg:text-6xl">{title}</h1>
						{roles.length > 0 && <p className="text-base font-semibold wrap-anywhere sm:text-lg">{roles.join(" · ")}</p>}
						<div className="flex flex-wrap items-start gap-x-5 gap-y-3 text-sm text-muted-foreground">
							{age !== null && <p className="flex items-center gap-2"><CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" /><span>{age} anni</span></p>}
						</div>
						<ProfileLocationSummary locations={locations} className="max-w-md" />
						{availabilityLabel && <div><Badge variant="secondary"><CircleDotIcon data-icon="inline-start" aria-hidden="true" />{availabilityLabel}</Badge></div>}
					</div>
				</div>
				<PlayerRolePitch primaryRoles={primaryRoles} specificRoles={specificRoles} />
			</div>
		</header>
	);
}
