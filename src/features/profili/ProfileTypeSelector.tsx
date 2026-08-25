"use client";

import {useOptimistic, useTransition} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {
	isProfileType,
	isLimitedProfileType,
	PROFILE_OPTIONS,
	type ProfileType,
} from "@/features/profilo/profile-model";

interface ProfileTypeSelectorProps {
	selectedTypes: ProfileType[];
}

const DIRECTORY_PROFILE_OPTIONS = PROFILE_OPTIONS.filter(
	({value}) => !isLimitedProfileType(value),
);

export default function ProfileTypeSelector({selectedTypes}: ProfileTypeSelectorProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [value, setOptimisticValue] = useOptimistic(selectedTypes);
	const [pending, startTransition] = useTransition();

	function handleTypeChange(nextValues: string[]) {
		const requested = new Set(nextValues.filter(isProfileType));
		const nextTypes = DIRECTORY_PROFILE_OPTIONS
			.map(({value: type}) => type)
			.filter((type) => requested.has(type));
		const params = new URLSearchParams();
		const q = searchParams.get("q")?.trim();

		if (q) params.set("q", q);
		nextTypes.forEach((type) => params.append("type", type));

		const suffix = params.toString();
		startTransition(() => {
			setOptimisticValue(nextTypes);
			router.push(suffix ? `${pathname}?${suffix}` : pathname, {scroll: false});
		});
	}

	return (
		<div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
			<ToggleGroup
				multiple
				variant="outline"
				size="lg"
				spacing={2}
				value={value}
				onValueChange={handleTypeChange}
				aria-label="Tipi di profilo"
				aria-busy={pending}
				className="w-max"
			>
				{DIRECTORY_PROFILE_OPTIONS.map(({value: type, label, icon: Icon}) => (
					<ToggleGroupItem
						key={type}
						value={type}
						aria-label={label}
						className="h-11 rounded-full px-4 data-pressed:border-fuchsia-600 data-pressed:bg-fuchsia-600 data-pressed:text-white data-pressed:hover:bg-fuchsia-700"
					>
						<Icon data-icon="inline-start px-2" aria-hidden="true" />
						{label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
