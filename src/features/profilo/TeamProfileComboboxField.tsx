"use client";

import {useEffect, useMemo, useState} from "react";
import {LoaderCircleIcon} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import {
	TEAM_PROFILE_SEARCH_MIN_LENGTH,
	type PublicTeamProfile,
} from "@/features/profilo/team-profile";

interface TeamProfileComboboxFieldProps {
	id: string;
	value: string;
	profileId?: string | null;
	onValueChange: (value: string, profileId: string | null) => void;
	placeholder?: string;
}

const EMPTY_TEAM_PROFILES: PublicTeamProfile[] = [];

function initials(value: string) {
	return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("it-IT") || "S";
}

export default function TeamProfileComboboxField({
	id,
	value,
	profileId = null,
	onValueChange,
	placeholder = "Cerca o inserisci il nome della squadra",
}: TeamProfileComboboxFieldProps) {
	const query = value.replace(/\s+/g, " ").trim();
	const [result, setResult] = useState<{query: string; items: PublicTeamProfile[]; failed: boolean}>({
		query: "",
		items: [],
		failed: false,
	});
	const [loading, setLoading] = useState(false);
	const items = result.query === query ? result.items : EMPTY_TEAM_PROFILES;
	const failed = result.query === query && result.failed;
	const selected = useMemo(() => {
		if (!profileId) return null;
		return items.find((item) => item.profileId === profileId) ?? {
			profileId,
			name: value,
			imageUrl: null,
			location: null,
		};
	}, [items, profileId, value]);

	useEffect(() => {
		if (query.length < TEAM_PROFILE_SEARCH_MIN_LENGTH) {
			return;
		}

		const controller = new AbortController();
		const timeoutId = window.setTimeout(async () => {
			setLoading(true);
			try {
				const response = await fetch(`/api/profili/squadre?q=${encodeURIComponent(query)}`, {
					signal: controller.signal,
					cache: "no-store",
				});
				if (!response.ok) throw new Error("team_lookup_failed");
				const payload = await response.json() as {items?: PublicTeamProfile[]};
				setResult({query, items: Array.isArray(payload.items) ? payload.items : [], failed: false});
			} catch {
				if (!controller.signal.aborted) {
					setResult({query, items: [], failed: true});
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}, 250);

		return () => {
			window.clearTimeout(timeoutId);
			controller.abort();
		};
	}, [query]);

	const emptyText = value.trim().length < TEAM_PROFILE_SEARCH_MIN_LENGTH
		? "Scrivi almeno 2 caratteri."
		: loading || result.query !== query ? "Ricerca in corso..."
			: failed ? "Ricerca non disponibile. Puoi comunque inserire il nome."
				: "Nessuna squadra trovata. Il nome verrà salvato come testo.";

	return (
		<Combobox
			items={query.length >= TEAM_PROFILE_SEARCH_MIN_LENGTH ? items : []}
			filteredItems={query.length >= TEAM_PROFILE_SEARCH_MIN_LENGTH ? items : []}
			filter={null}
			autoComplete="none"
			inputValue={value}
			value={selected}
			itemToStringLabel={(item: PublicTeamProfile) => item.name}
			itemToStringValue={(item: PublicTeamProfile) => item.profileId}
			isItemEqualToValue={(item: PublicTeamProfile, candidate: PublicTeamProfile) => item.profileId === candidate.profileId}
			onInputValueChange={(nextValue, details) => {
				if (details.reason === "item-press" || details.reason === "none") return;
				onValueChange(nextValue.slice(0, 120), null);
			}}
			onValueChange={(item) => {
				if (item) onValueChange(item.name, item.profileId);
			}}
		>
			<ComboboxInput
				id={id}
				className="w-full"
				placeholder={placeholder}
				showClear={value.length > 0}
				maxLength={120}
			/>
			<ComboboxContent>
				<ComboboxEmpty>
					<span className="inline-flex items-center gap-2 px-3">
						{loading && <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />}
						{emptyText}
					</span>
				</ComboboxEmpty>
				<ComboboxList>
					{(item: PublicTeamProfile) => (
						<ComboboxItem key={item.profileId} value={item} className="py-2">
							<Avatar size="sm">
								{item.imageUrl && <AvatarImage src={item.imageUrl} alt="" />}
								<AvatarFallback>{initials(item.name)}</AvatarFallback>
							</Avatar>
							<span className="min-w-0 flex-1">
								<span className="block truncate font-medium">{item.name}</span>
								{item.location && <span className="block truncate text-xs text-muted-foreground">{item.location}</span>}
							</span>
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
