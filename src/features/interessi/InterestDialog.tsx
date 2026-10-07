"use client";

import {createContext, useContext, useId, useRef, useState, type FormEvent, type ReactNode} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {LoaderCircleIcon, MessageCircleMore} from "lucide-react";
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from "@/components/ui/alert-dialog";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {toast} from "@/components/ui/toast";
import {INTEREST_OWNERSHIP_CONSENT, INTEREST_SHARING_CONSENT, validateInterestForm, type InterestContext, type InterestField, type InterestResult, type InterestTarget} from "./interest-model";
import {submitInterest} from "./server/actions";

const InterestAvailabilityContext = createContext(false);

export function InterestDialogTrigger({inline = false}: {inline?: boolean}) {
	const available = useContext(InterestAvailabilityContext);
	if (!available) return inline ? <span>Manifesta interesse</span> : null;
	return (
		<AlertDialogTrigger render={<Button type="button" variant={inline ? "link" : "default"} className={inline ? "h-auto p-0 align-baseline [font-size:inherit]" : "min-h-11 gap-2 px-4"} />}>
			{!inline && <MessageCircleMore data-icon="inline-start" aria-hidden="true" />}Manifesta interesse
		</AlertDialogTrigger>
	);
}

export function InterestDialogProvider({target, context, href, children}: {target: InterestTarget; context: InterestContext; href: string; children: ReactNode}) {
	const id = useId();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const inFlight = useRef(false);
	const profiles = context.status === "ready" ? context.profiles : [];
	const defaultProfile = profiles.find((profile) => profile.isPrimary)?.type ?? profiles[0]?.type ?? "";
	const [profileType, setProfileType] = useState<string>(defaultProfile);
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [ownershipConsent, setOwnershipConsent] = useState(false);
	const [sharingConsent, setSharingConsent] = useState(false);
	const [result, setResult] = useState<InterestResult | null>(null);
	const status = result?.status === "guest" || result?.status === "registration-required" ? result.status : context.status;
	const errors: Partial<Record<InterestField, string>> = result?.status === "error" ? result.fieldErrors ?? {} : {};
	const inputId = (name: string) => `${id}-${name}`;

	function changeOpen(next: boolean) {
		if (inFlight.current) return;
		setOpen(next);
		if (next) {
			setProfileType(defaultProfile);
			setEmail("");
			setPhone("");
			setOwnershipConsent(false);
			setSharingConsent(false);
			setResult(null);
		}
	}

	async function send(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (inFlight.current) return;
		const form = new FormData(event.currentTarget);
		const {fieldErrors} = validateInterestForm(form);
		if (Object.keys(fieldErrors).length) {
			setResult({status: "error", message: "Controlla i campi indicati.", fieldErrors});
			return;
		}
		inFlight.current = true;
		setPending(true);
		setResult(null);
		try {
			const response = await submitInterest(target, form);
			setResult(response);
			if (response.status === "success") {
				setOpen(false);
				toast.add({type: "success", title: "Manifestazione di interesse inviata"});
			}
		} catch {
			setResult({status: "error", message: "Non è stato possibile inviare la manifestazione di interesse. Riprova tra poco."});
		} finally {
			inFlight.current = false;
			setPending(false);
		}
	}

	if (context.status === "unavailable") return <InterestAvailabilityContext.Provider value={false}>{children}</InterestAvailabilityContext.Provider>;
	const dialog = (
		<AlertDialog open={open} onOpenChange={changeOpen}>
			{children}
			<AlertDialogContent size="lg" className="max-h-[calc(100dvh-2rem)] overflow-y-auto data-[size=lg]:sm:max-w-lg data-[size=lg]:lg:max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle>Manifesta interesse</AlertDialogTitle>
					<AlertDialogDescription>{status === "guest" ? "Accedi per manifestare il tuo interesse!" : "Scegli il tuo profilo e il contatto da condividere con il destinatario."}</AlertDialogDescription>
				</AlertDialogHeader>
				{status === "ready" ? (
					<form onSubmit={send} noValidate aria-busy={pending} className="flex flex-col gap-5">
						<FieldGroup>
							<Field data-disabled={pending || profiles.length === 1} data-invalid={Boolean(errors.profileType)}>
								<FieldLabel htmlFor={inputId("profile")}>Con quale profilo vuoi manifestare interesse?</FieldLabel>
								<input type="hidden" name="profileType" value={profileType} />
								<Select items={profiles.map((profile) => ({value: profile.type, label: profile.label}))} value={profileType} onValueChange={(value) => setProfileType(value ?? "")} disabled={pending || profiles.length === 1}>
									<SelectTrigger id={inputId("profile")} className="w-full" aria-invalid={Boolean(errors.profileType)} aria-describedby={errors.profileType ? inputId("profile-error") : undefined}><SelectValue /></SelectTrigger>
									<SelectContent><SelectGroup>{profiles.map((profile) => <SelectItem key={profile.type} value={profile.type}>{profile.label}</SelectItem>)}</SelectGroup></SelectContent>
								</Select>
								<FieldError id={inputId("profile-error")}>{errors.profileType}</FieldError>
							</Field>
							<FieldSet disabled={pending}>
								<FieldLegend variant="label">Quale contatto vuoi condividere?</FieldLegend>
								<FieldDescription id={inputId("contacts-description")}>Inserisci almeno un contatto tra email e telefono.</FieldDescription>
								<FieldGroup>
									<Field data-invalid={Boolean(errors.email || errors.contacts)}>
										<FieldLabel htmlFor={inputId("email")}>Indirizzo email</FieldLabel>
										<Input id={inputId("email")} name="email" type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email || errors.contacts)} aria-describedby={`${inputId("contacts-description")} ${inputId("email-error")} ${inputId("contacts-error")}`} />
										<FieldError id={inputId("email-error")}>{errors.email}</FieldError>
									</Field>
									<Field data-invalid={Boolean(errors.phone || errors.contacts)}>
										<FieldLabel htmlFor={inputId("phone")}>Telefono</FieldLabel>
										<Input id={inputId("phone")} name="phone" type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(errors.phone || errors.contacts)} aria-describedby={`${inputId("contacts-description")} ${inputId("phone-error")} ${inputId("contacts-error")}`} />
										<FieldError id={inputId("phone-error")}>{errors.phone}</FieldError>
									</Field>
								</FieldGroup>
								<FieldError id={inputId("contacts-error")}>{errors.contacts}</FieldError>
							</FieldSet>
							<FieldSet disabled={pending}>
								<FieldLegend variant="label">Conferme obbligatorie</FieldLegend>
								<FieldGroup>
									{([
										["ownershipConsent", ownershipConsent, setOwnershipConsent, INTEREST_OWNERSHIP_CONSENT],
										["sharingConsent", sharingConsent, setSharingConsent, INTEREST_SHARING_CONSENT],
									] as const).map(([name, checked, onCheckedChange, label]) => (
										<Field key={name} orientation="horizontal" data-invalid={Boolean(errors[name])}>
											<Checkbox id={inputId(name)} name={name} value="on" checked={checked} onCheckedChange={onCheckedChange} required disabled={pending} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? inputId(`${name}-error`) : undefined} />
											<FieldContent><FieldLabel htmlFor={inputId(name)}>{label}</FieldLabel><FieldError id={inputId(`${name}-error`)}>{errors[name]}</FieldError></FieldContent>
										</Field>
									))}
								</FieldGroup>
							</FieldSet>
						</FieldGroup>
						{result?.status === "error" && !result.fieldErrors && <Alert variant="destructive"><AlertDescription role="alert">{result.message}</AlertDescription></Alert>}
						<AlertDialogFooter>
							<AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
							<Button type="submit" disabled={pending || !ownershipConsent || !sharingConsent}>
								{pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <MessageCircleMore data-icon="inline-start" aria-hidden="true" />}{pending ? "Invio…" : "Invia"}
							</Button>
						</AlertDialogFooter>
					</form>
				) : (
					<>
						{status !== "guest" && <Alert><AlertDescription>{status === "registration-required" ? "Completa la registrazione per manifestare interesse." : status === "profile-required" ? "Crea un sottoprofilo per manifestare interesse." : "Non è stato possibile caricare il modulo. Riprova tra poco."}</AlertDescription></Alert>}
						<AlertDialogFooter>
							<AlertDialogCancel>Chiudi</AlertDialogCancel>
							{status === "error" ? <Button onClick={() => router.refresh()}>Riprova</Button> : <Button nativeButton={false} render={<Link href={status === "guest" ? `/accedi?${new URLSearchParams({next: href})}` : status === "registration-required" ? "/registrati" : "/il-tuo-profilo"} />}>{status === "guest" ? "Accedi" : status === "registration-required" ? "Completa registrazione" : "Completa profilo"}</Button>}
						</AlertDialogFooter>
					</>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
	return <InterestAvailabilityContext.Provider value={true}>{dialog}</InterestAvailabilityContext.Provider>;
}

export default function InterestDialog({target, context, href}: {target: InterestTarget; context: InterestContext; href: string}) {
	return <InterestDialogProvider target={target} context={context} href={href}><InterestDialogTrigger /></InterestDialogProvider>;
}
