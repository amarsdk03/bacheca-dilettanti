"use client";

import {useState, useTransition} from "react";
import {
	CirclePlusIcon,
	LoaderCircleIcon,
	PencilIcon,
} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {ScrollArea} from "@/components/ui/scroll-area";
import {toast} from "@/components/ui/toast";
import ProfileDetailsForm from "@/features/profilo/ProfileDetailsForm";
import {
	PROFILE_OPTIONS,
	type ProfileLocationDraft,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";
import type {
	ProfileEditorSavePayload,
	ProfileMutationResult,
} from "@/features/profilo/types";

interface ProfileEditorDialogProps {
	mode: "add" | "edit";
	profileType: ProfileType;
	drafts: ProfileDrafts;
	locations: ProfileLocations;
	onClose: () => void;
	onSave: (payload: ProfileEditorSavePayload) => Promise<ProfileMutationResult>;
}

export default function ProfileEditorDialog({
	mode,
	profileType,
	drafts,
	locations,
	onClose,
	onSave,
}: ProfileEditorDialogProps) {
	const [workingDrafts, setWorkingDrafts] = useState<ProfileDrafts>(() => structuredClone(drafts));
	const [workingLocations, setWorkingLocations] = useState<ProfileLocations>(() => structuredClone(locations));
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const selectedOption = PROFILE_OPTIONS.find(({value}) => value === profileType);

	const updateProfileDraft = <
		Type extends ProfileType,
		FieldName extends keyof ProfileDrafts[Type],
	>(type: Type, field: FieldName, value: ProfileDrafts[Type][FieldName]) => {
		setWorkingDrafts((previous) => ({
			...previous,
			[type]: {...previous[type], [field]: value},
		}) as ProfileDrafts);
	};

	const updateProfileLocations = (type: ProfileType, value: ProfileLocationDraft[]) => {
		setWorkingLocations((previous) => ({...previous, [type]: value}));
	};

	const handleSave = () => {
		setErrorMessage(null);
		startTransition(async () => {
			let result: ProfileMutationResult;
			try {
				result = await onSave({
					type: profileType,
					draft: workingDrafts[profileType],
					locations: workingLocations[profileType],
				});
			} catch {
				setErrorMessage("La richiesta non è stata completata. Riprova.");
				return;
			}

			if (result.status === "error") {
				setErrorMessage(result.message);
				return;
			}

			toast.add({
				title: mode === "add" ? "Profilo aggiunto" : "Profilo aggiornato",
				description: result.message,
				type: "success",
			});
			onClose();
		});
	};

	return (
		<AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
			<AlertDialogContent
				size="lg"
				className="max-h-[min(92vh,56rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
				aria-describedby="profile-editor-description"
			>
				<AlertDialogHeader className="place-items-start border-b px-5 py-4 text-left sm:px-6">
					<AlertDialogTitle className="flex items-center gap-2 text-lg">
						{mode === "add"
							? <CirclePlusIcon aria-hidden="true" />
							: <PencilIcon aria-hidden="true" />}
						{mode === "add"
							? `Abilita ${selectedOption?.label ?? "profilo"}`
							: `Aggiorna ${selectedOption?.label ?? "profilo"}`}
					</AlertDialogTitle>
					<AlertDialogDescription id="profile-editor-description">
						Compila i dati che vuoi mostrare. Il salvataggio aggiorna subito il tuo profilo.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<ScrollArea className="min-h-0">
					<div className="grid gap-5 px-5 py-5 sm:px-6">
						{errorMessage && (
							<Alert variant="destructive" aria-live="polite">
								<AlertTitle>Salvataggio non riuscito</AlertTitle>
								<AlertDescription>{errorMessage}</AlertDescription>
							</Alert>
						)}
						<ProfileDetailsForm
							key={profileType}
							type={profileType}
							drafts={workingDrafts}
							locations={workingLocations}
							onChange={updateProfileDraft}
							onLocationsChange={updateProfileLocations}
						/>
					</div>
				</ScrollArea>

				<AlertDialogFooter className="mx-0 mb-0 rounded-b-xl px-5 py-4 sm:px-6">
					<AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
					<Button type="button" onClick={handleSave} disabled={pending}>
						{pending && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />}
						{pending
							? "Salvataggio…"
							: mode === "add"
								? "Abilita profilo"
								: "Salva modifiche"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
