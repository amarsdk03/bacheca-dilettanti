"use client";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import ProfilePngIcon from "@/features/profilo/ProfilePngIcon";

export interface SubprofileSelectOption {
	type: ProfileType;
	title: string;
	imageUrl: string | null;
}

export function SubprofileSelectIdentity({profile}: {profile: SubprofileSelectOption}) {
	const label = PROFILE_OPTIONS.find(option => option.value === profile.type)!.label;
	return <span className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
		<span className="flex min-w-0 flex-1 flex-col gap-0.5">
			<span className="truncate font-bold">{profile.title}</span>
			<span className="truncate text-xs text-muted-foreground">{label}</span>
		</span>
		<Avatar className="size-9 shrink-0">
			{profile.imageUrl && <AvatarImage src={profile.imageUrl} alt="" />}
			<AvatarFallback><ProfilePngIcon type={profile.type} className="size-5" /></AvatarFallback>
		</Avatar>
	</span>;
}

export default function SubprofileSelect({profiles, value, onValueChange, disabled, id, label, invalid, describedBy}: {
	profiles: readonly SubprofileSelectOption[];
	value: ProfileType | "" | null;
	onValueChange: (value: ProfileType | null) => void;
	disabled?: boolean;
	id?: string;
	label: string;
	invalid?: boolean;
	describedBy?: string;
}) {
	const selected = profiles.find(profile => profile.type === value);
	return <Select value={value || null} onValueChange={onValueChange} disabled={disabled}
		items={profiles.map(profile => ({value: profile.type, label: `${profile.title} (${PROFILE_OPTIONS.find(option => option.value === profile.type)!.label})`}))}>
		<SelectTrigger id={id} aria-label={label} aria-invalid={invalid} aria-describedby={describedBy}
			className="w-full min-w-0 data-[size=default]:h-auto min-h-14">
			<SelectValue className="w-full min-w-0 flex-1">{selected ? <SubprofileSelectIdentity profile={selected} /> : "Seleziona un profilo"}</SelectValue>
		</SelectTrigger>
		<SelectContent><SelectGroup>{profiles.map(profile => <SelectItem key={profile.type} value={profile.type} className="py-2">
			<SubprofileSelectIdentity profile={profile} />
		</SelectItem>)}</SelectGroup></SelectContent>
	</Select>;
}
