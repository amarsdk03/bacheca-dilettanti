"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {type PublicTeamProfile, teamProfileHref, type TeamProfileReference,} from "@/features/profilo/team-profile";
import {cn} from "@/lib/utils";

type TeamItem = TeamProfileReference | PublicTeamProfile;

function isResolved(item: TeamItem): item is PublicTeamProfile {
	return "imageUrl" in item;
}

function initials(value: string) {
	return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("it-IT") || "S";
}

export default function TeamProfileLinks({
	teams,
	limit,
	className,
}: {
	teams: readonly TeamItem[];
	limit?: number;
	className?: string;
}) {
	const uniqueTeams = useMemo(() => teams.filter((team, index, all) => (
		all.findIndex((candidate) => candidate.profileId === team.profileId) === index
	)), [teams]);
	const [fetchedTeams, setFetchedTeams] = useState(new Map<string, PublicTeamProfile>());
	const resolved = useMemo(() => {
		const next = new Map(fetchedTeams);
		uniqueTeams.filter(isResolved).forEach((team) => next.set(team.profileId, team));
		return next;
	}, [fetchedTeams, uniqueTeams]);
	const unresolvedIdsKey = uniqueTeams
		.filter((team) => !isResolved(team))
		.map(({profileId}) => profileId)
		.sort()
		.join(",");

	useEffect(() => {
		const missingIds = unresolvedIdsKey.split(",").filter(Boolean);
		if (missingIds.length === 0) return;

		const controller = new AbortController();
		void fetch(`/api/profili/squadre?ids=${encodeURIComponent(missingIds.join(","))}`, {
			signal: controller.signal,
			cache: "no-store",
		}).then(async (response) => {
			if (!response.ok) return;
			const payload = await response.json() as {items?: PublicTeamProfile[]};
			setFetchedTeams((current) => {
				const next = new Map(current);
				for (const team of payload.items ?? []) next.set(team.profileId, team);
				return next;
			});
		}).catch(() => undefined);

		return () => controller.abort();
	}, [unresolvedIdsKey]);

	if (uniqueTeams.length === 0) return null;
	const visible = typeof limit === "number" ? uniqueTeams.slice(0, limit) : uniqueTeams;
	const remaining = uniqueTeams.length - visible.length;

	return (
		<div className={cn("flex flex-wrap items-center gap-2", className)}>
			{visible.map((reference) => {
				const team = resolved.get(reference.profileId);
				if (!team) return <span key={reference.profileId} className="text-sm font-medium wrap-anywhere">{reference.name}</span>;
				return (
					<Link
						key={reference.profileId}
						href={teamProfileHref(reference.profileId)}
						className="relative z-20 inline-flex min-w-0 items-center gap-2 rounded-full border bg-background px-2 py-1 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<Avatar size="sm">
							{team.imageUrl && <AvatarImage src={team.imageUrl} alt="" />}
							<AvatarFallback>{initials(team.name)}</AvatarFallback>
						</Avatar>
						<span className="max-w-48 truncate">{team.name}</span>
					</Link>
				);
			})}
			{remaining > 0 && <span className="text-sm font-semibold text-muted-foreground">+{remaining}</span>}
		</div>
	);
}
