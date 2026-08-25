"use client";

import {useOptimistic, useTransition} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {
	ANNOUNCEMENT_DIRECTORY_OPTIONS,
	type AnnouncementDirectoryType,
} from "@/features/annunci/announcement-model";

interface AnnouncementTypeSelectorProps {
	selectedTypes: AnnouncementDirectoryType[];
}

export default function AnnouncementTypeSelector({
	selectedTypes,
}: AnnouncementTypeSelectorProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [value, setOptimisticValue] = useOptimistic(selectedTypes);
	const [pending, startTransition] = useTransition();

	function handleTypeChange(nextValues: string[]) {
		const requested = new Set(nextValues);
		const nextTypes = ANNOUNCEMENT_DIRECTORY_OPTIONS
			.map(({value: type}) => type)
			.filter((type) => requested.has(type));
		const params = new URLSearchParams();
		const query = searchParams.get("q")?.trim();

		if (query) params.set("q", query);
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
				aria-label="Tipi di annuncio"
				aria-busy={pending}
				className="w-max"
			>
				{ANNOUNCEMENT_DIRECTORY_OPTIONS.map(({value: type, label, icon: Icon}) => (
					<ToggleGroupItem
						key={type}
						value={type}
						aria-label={label}
						className="h-11 rounded-full px-4 data-pressed:border-fuchsia-600 data-pressed:bg-fuchsia-600 data-pressed:text-white data-pressed:hover:bg-fuchsia-700"
					>
						<Icon className={"ms-2 me-1"} data-icon="inline-start" aria-hidden="true" />
						{label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
