"use client";

import Link from "next/link";
import {InfoIcon, LockKeyholeIcon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
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
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onChange: ProfileDraftUpdater;
	onLocationsChange: (type: PublishableProfileType, value: ProfileLocationDraft[]) => void;
	errors?: ProfileValidationErrors;
}

export default function PublishProfileStep({
	profileType,
	registered,
	drafts,
	locations,
	onChange,
	onLocationsChange,
	errors = {},
}: PublishProfileStepProps) {
	return (
		<div className="grid gap-6">
			{registered ? (
				<Alert>
					<LockKeyholeIcon />
					<AlertTitle>Dati caricati dal tuo profilo</AlertTitle>
					<AlertDescription>
						I campi sono bloccati durante la pubblicazione. Per modificarli, vai alla sezione{` `}
						<Link href="/il-tuo-profilo?sezione=profilo">Il tuo profilo</Link> e poi torna qui.
					</AlertDescription>
				</Alert>
			) : (
				<Alert>
					<InfoIcon />
					<AlertTitle>Dati del profilo per questo annuncio</AlertTitle>
					<AlertDescription>
						Questi dati verranno associati all’annuncio dopo la verifica dell’indirizzo email. Sono richiesti i dati essenziali e almeno una località.
					</AlertDescription>
				</Alert>
			)}

			<fieldset disabled={registered} aria-disabled={registered} className={registered ? "opacity-75" : undefined}>
				<ProfileDetailsForm
					type={profileType}
					drafts={drafts}
					locations={locations}
					onChange={onChange}
					onLocationsChange={(type, value) => onLocationsChange(type as PublishableProfileType, value)}
					requiredFields={!registered}
					errors={errors}
				/>
			</fieldset>
		</div>
	);
}
