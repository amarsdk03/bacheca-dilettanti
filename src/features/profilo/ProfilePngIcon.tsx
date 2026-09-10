import {cn} from "@/lib/utils";

import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";

const FALLBACK_ACCENT = "#8e72ff";

export function getProfileAccent(type: ProfileType) {
	return PROFILE_OPTIONS.find(({value}) => value === type)?.colore ?? FALLBACK_ACCENT;
}

export default function ProfilePngIcon({
	type,
	color = getProfileAccent(type),
	className,
}: {
	type: ProfileType;
	color?: string;
	className?: string;
}) {
	const iconUrl = `/icone-profili/${type}.png`;

	return (
		<span
			className={cn("block shrink-0", className)}
			data-profile-icon={type}
			style={{
				backgroundColor: color,
				maskImage: `url(${iconUrl})`,
				maskPosition: "center",
				maskRepeat: "no-repeat",
				maskSize: "contain",
				WebkitMaskImage: `url(${iconUrl})`,
				WebkitMaskPosition: "center",
				WebkitMaskRepeat: "no-repeat",
				WebkitMaskSize: "contain",
			}}
			aria-hidden="true"
		/>
	);
}
