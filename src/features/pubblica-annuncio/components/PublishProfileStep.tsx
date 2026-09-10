"use client";

import {InfoIcon, LockKeyholeIcon, LockKeyholeOpenIcon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import ProfileDetailsForm from "@/features/profilo/ProfileDetailsForm";
import type {
	ProfileDrafts,
	ProfileDraftUpdater,
	ProfileLocationDraft,
	ProfileLocations,
} from "@/features/profilo/profile-model";
import type {ProfileValidationErrors, PublishableProfileType} from "@/features/pubblica-annuncio/publish-model";

interface PublishProfileStepProps {
	profileType: PublishableProfileType;
	registered: boolean;
	unlocked: boolean;
	onUnlock: () => void;
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onChange: ProfileDraftUpdater;
	onLocationsChange: (type: PublishableProfileType, value: ProfileLocationDraft[]) => void;
	errors?: ProfileValidationErrors;
}

export default function PublishProfileStep({
	profileType,
	registered,
	unlocked,
	onUnlock,
	drafts,
	locations,
	onChange,
	onLocationsChange,
	errors = {},
}: PublishProfileStepProps) {
	return (
		<div className="grid gap-6">
			{registered ? (
					<Card className={unlocked ? "border-brand-indigo/40 bg-brand-indigo/5" : undefined}>
						<CardHeader className="min-w-full">
							<div className="sm:flex-row sm:items-center sm:justify-between">
								<div className="grid gap-1">
									<CardTitle className="flex items-center gap-2 text-base">
										{unlocked ? <LockKeyholeOpenIcon className="size-4 text-brand-indigo" /> : <LockKeyholeIcon className="size-4" />}
										{unlocked ? "Modifica profilo attiva" : "Dati caricati dal tuo profilo"}
									</CardTitle>
									<CardDescription>
										{unlocked
											? "Le modifiche verranno salvate insieme all’invio finale dell’annuncio."
											: "Sblocca i campi se vuoi aggiornare il profilo durante questa pubblicazione."}
									</CardDescription>
								</div>
								{!unlocked && <Button className={"mt-3 w-full"} type="button" variant="outline" onClick={onUnlock}>Sblocca campi</Button>}
							</div>
						</CardHeader>
						{unlocked && <CardContent className="text-sm text-brand-indigo">Controlla con attenzione i dati: il salvataggio avverrà solo premendo “Conferma e invia”.</CardContent>}
					</Card>
			) : (
				<Alert>
					<InfoIcon />
					<AlertTitle>Dati del profilo per questo annuncio</AlertTitle>
					<AlertDescription>
						Questi dati verranno associati all’annuncio dopo la verifica dell’indirizzo email. Sono richiesti i dati essenziali e almeno una località.
					</AlertDescription>
				</Alert>
			)}

			<fieldset disabled={registered && !unlocked} aria-disabled={registered && !unlocked} className={registered && !unlocked ? "opacity-75" : undefined}>
				<ProfileDetailsForm
					type={profileType}
					drafts={drafts}
					locations={locations}
					onChange={onChange}
					onLocationsChange={(type, value) => onLocationsChange(type as PublishableProfileType, value)}
					requiredFields
					errors={errors}
				/>
			</fieldset>
		</div>
	);
}
