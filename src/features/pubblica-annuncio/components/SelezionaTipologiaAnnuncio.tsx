"use client";

import {useState} from "react";

import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import ComingSoonBadge from "@/features/profilo/ComingSoonBadge";
import {
	isLimitedProfileType,
	isRestrictedProfileType,
	PROFILE_DIRECTORY_UNLOCK_PROFILE_COUNT,
	type ProfileType,
} from "@/features/profilo/profile-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {RequiredMark} from "@/features/pubblica-annuncio/components/InputFields/FieldRequirementIndicator";
import {isPublishableProfileType} from "@/features/pubblica-annuncio/publish-model";
import {getTipologia, tipologieAnnuncio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type SelezionaTipologiaAnnuncioProps = {
	tipologia: string;
	sottotipologia: string;
	onTipologiaChangeAction: (value: string) => void;
	onSottotipologiaChangeAction: (value: string) => void;
	onContinueAction: () => void;
	registered: boolean;
	enabledProfileTypes: readonly ProfileType[];
	authorizedRestrictedProfileTypes: readonly ProfileType[];
};

export default function SelezionaTipologiaAnnuncio({
	tipologia,
	sottotipologia,
	onTipologiaChangeAction,
	onSottotipologiaChangeAction,
	onContinueAction,
	registered,
	enabledProfileTypes,
	authorizedRestrictedProfileTypes,
}: SelezionaTipologiaAnnuncioProps) {
	const [validationVisible, setValidationVisible] = useState(false);
	const [profileToEnable, setProfileToEnable] = useState<ProfileType | null>(null);
	const tipologiaSelezionata = getTipologia(tipologia);
	const richiedeSottotipologia = Boolean(tipologiaSelezionata?.sottotipologie?.length);
	const isValid = tipologia !== "" && (!richiedeSottotipologia || sottotipologia !== "");
	const typeError = validationVisible && tipologia === "" ? "Seleziona il tipo di annuncio." : null;
	const subtypeError = validationVisible && richiedeSottotipologia && sottotipologia === ""
		? "Seleziona la tipologia di annuncio."
		: null;

	const continueToProfile = () => {
		if (!isValid) {
			setValidationVisible(true);
			return;
		}
		onContinueAction();
	};

	return (
		<div className="grid gap-8 mt-2">
			<FieldGroup className="w-full">
				<FieldSet>
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Chi pubblica l&apos;annuncio? <RequiredMark />
					</FieldLegend>
					<Field data-invalid={Boolean(typeError)} className="mt-4">
						{typeError && <FieldError>{typeError}</FieldError>}

						<ToggleGroup
							className="grid w-full gap-3 sm:grid-cols-2"
							value={tipologia ? [tipologia] : []}
							onValueChange={(values) => values[0] && onTipologiaChangeAction(values[0])}
							aria-required="true"
							aria-invalid={Boolean(typeError)}
						>
							{tipologieAnnuncio.map((opzione) => {
								const profileType = opzione.valore as ProfileType;
								const limited = isLimitedProfileType(profileType);
								const restricted = isRestrictedProfileType(profileType);
								const supported = isPublishableProfileType(profileType);
								const enabledForAccount = supported && enabledProfileTypes.includes(profileType);
								const authorized = restricted && authorizedRestrictedProfileTypes.includes(profileType);
								const unavailable = registered && supported && !enabledForAccount;
								const accent = getProfileAccent(profileType);
								const content = (
									<Field orientation="horizontal" data-disabled={!supported || (restricted && !registered)} className="h-full w-full items-start border-0 p-4">
										<span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{backgroundColor: `${accent}14`}}>
											<ProfilePngIcon type={profileType} color={accent} className="size-7" />
										</span>
										<FieldContent className="ms-1">
											<FieldTitle className="field-content-title flex-wrap gap-1.5">
												{opzione.nome}
													{!supported && <ComingSoonBadge />}
													{restricted && <Badge variant="outline">Accesso limitato</Badge>}
												{unavailable && <Badge variant="outline">Non abilitato</Badge>}
											</FieldTitle>
											<FieldDescription>
													{restricted && !registered ? "Disponibile solo per gli account abilitati dall’admin." : limited
													? `La directory dei profili ${opzione.nome} sarà sbloccata al raggiungimento di ${PROFILE_DIRECTORY_UNLOCK_PROFILE_COUNT} profili.`
													: opzione.descrizione}
											</FieldDescription>
										</FieldContent>
									</Field>
								);
								const itemClassName = "h-auto min-h-24 w-full items-stretch justify-start whitespace-normal rounded-xl border bg-background p-0 text-left shadow-none hover:-translate-y-0.5 hover:bg-background hover:shadow-sm";
								if (restricted && (!registered || (unavailable && !authorized))) return <div key={opzione.valore} className={`${itemClassName} opacity-60`} aria-disabled="true">{content}</div>;
								if (unavailable) return (
									<button key={opzione.valore} type="button" onClick={() => setProfileToEnable(profileType)} className={itemClassName} aria-label={`Abilitare profilo ${opzione.nome}?`}>
										{content}
									</button>
								);
								return <ToggleGroupItem
									key={opzione.valore}
									value={opzione.valore}
									disabled={!supported}
									className={`${itemClassName} data-pressed:ring-1 data-pressed:ring-black/25 disabled:opacity-55`}
								>
									{content}
								</ToggleGroupItem>;
							})}
						</ToggleGroup>
					</Field>
				</FieldSet>

				{richiedeSottotipologia && tipologiaSelezionata?.sottotipologie && (
					<FieldSet>
						<FieldLegend variant="label" className="field-legend-title mb-0">Seleziona la tipologia di annuncio: <RequiredMark /></FieldLegend>
						<Field data-invalid={Boolean(subtypeError)} className="mt-4">
							{subtypeError && <FieldError>{subtypeError}</FieldError>}
						<ToggleGroup
							className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
							value={sottotipologia ? [sottotipologia] : []}
							onValueChange={(values) => values[0] && onSottotipologiaChangeAction(values[0])}
							aria-required="true"
							aria-invalid={Boolean(subtypeError)}
						>
							{tipologiaSelezionata.sottotipologie.map((opzione) => (
								<ToggleGroupItem key={opzione.valore} value={opzione.valore} className="h-auto min-h-12 w-full items-stretch justify-start whitespace-normal rounded-xl border bg-background p-0 text-left shadow-none hover:bg-brand-indigo/5 data-pressed:border-brand-indigo data-pressed:bg-brand-indigo/10 data-pressed:ring data-pressed:ring-brand-indigo/20">
									<Field orientation="horizontal" className="h-full w-full border-0 p-4">
										<FieldContent>
											<FieldTitle className="field-content-title gap-1.5">
												{opzione.icona && <DynamicLucideIcon iconName={opzione.icona} className="me-1.5 size-4 sm:me-0" />}
												{opzione.nome}
											</FieldTitle>
											{opzione.descrizione && <FieldDescription>{opzione.descrizione}</FieldDescription>}
										</FieldContent>
									</Field>
								</ToggleGroupItem>
							))}
						</ToggleGroup>
						</Field>
					</FieldSet>
				)}
			</FieldGroup>
			<AlertDialog open={profileToEnable !== null} onOpenChange={(open) => !open && setProfileToEnable(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Abilitare profilo?</AlertDialogTitle>
						<AlertDialogDescription>Apri la sezione profilo per creare il sottoprofilo selezionato.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annulla</AlertDialogCancel>
						<AlertDialogAction nativeButton={false} render={<a href="/il-tuo-profilo?sezione=profilo" target="_blank" rel="noopener noreferrer" />} onClick={() => setProfileToEnable(null)}>Apri il mio profilo</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="flex justify-end">
				<Button onClick={continueToProfile}>Avanti</Button>
			</div>
		</div>
	);
}
