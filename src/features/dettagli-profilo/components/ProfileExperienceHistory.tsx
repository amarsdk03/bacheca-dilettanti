import {Building2Icon, CalendarDaysIcon, RouteIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import type {PublicProfileExperience} from "@/features/dettagli-profilo/profile-detail-model";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";

export default function ProfileExperienceHistory({experiences}: {experiences: PublicProfileExperience[]}) {
	if (experiences.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle><h2 className="font-home-display text-2xl uppercase">Storico esperienze</h2></CardTitle>
				<CardDescription>Incarichi, qualifiche e collaborazioni indicate nel profilo.</CardDescription>
			</CardHeader>
			<CardContent>
				<ol className="grid gap-3">
					{experiences.map((experience) => {
						const period = [
							experience.from,
							experience.to ?? (experience.status === "in-corso" ? "In corso" : null),
						].filter(Boolean).join(" — ");
						return (
							<li key={experience.id} className="rounded-xl bg-muted/40 p-4 sm:p-5">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<h3 className="flex items-start gap-2 text-lg font-semibold wrap-anywhere">
										<RouteIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
										{experience.title}
									</h3>
									{experience.status && <Badge variant={experience.status === "in-corso" ? "default" : "secondary"}>{experience.status === "in-corso" ? "In corso" : "Conseguito"}</Badge>}
								</div>
								{experience.linkedTeam ? (
									<TeamProfileLinks teams={[experience.linkedTeam]} className="mt-3" />
								) : experience.organization ? (
									<p className="mt-3 flex items-start gap-2 text-sm"><Building2Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="wrap-anywhere">{experience.organization}</span></p>
								) : null}
								{period && <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><CalendarDaysIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{period}</span></p>}
								{experience.description && <p className="mt-3 text-sm leading-6 whitespace-pre-wrap wrap-anywhere">{experience.description}</p>}
							</li>
						);
					})}
				</ol>
			</CardContent>
		</Card>
	);
}
