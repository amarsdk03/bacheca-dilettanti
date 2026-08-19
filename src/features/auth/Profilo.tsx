import {CalendarDaysIcon, KeyRoundIcon, MailIcon, ShieldCheckIcon} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {signOut} from "@/features/auth/actions";
import type {ViewerDTO} from "@/features/auth/types";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {dateStyle: "long"});

function formatDate(value: string | null) {
	if (!value) return "Non disponibile";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "Non disponibile" : dateFormatter.format(date);
}

export default function Profilo({viewer, passwordUpdated = false}: {viewer: ViewerDTO; passwordUpdated?: boolean}) {
	return (
		<div className="min-h-[calc(100svh-4rem)] bg-linear-to-b from-fuchsia-50 via-white to-white px-4 py-12 sm:px-6">
			<div className="mx-auto max-w-3xl space-y-6">
				<div>
					<p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600">Il tuo account</p>
					<h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">Profilo</h1>
					<p className="mt-2 text-neutral-600">Qui trovi le informazioni associate al tuo accesso.</p>
				</div>
				{passwordUpdated && (
					<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
						La password è stata aggiornata correttamente.
					</div>
				)}
				<Card className="shadow-sm">
					<CardHeader className="border-b">
						<div className="flex items-center gap-4">
							<Avatar className="size-16">
								{viewer.avatarUrl && <AvatarImage src={viewer.avatarUrl} alt="" referrerPolicy="no-referrer" />}
								<AvatarFallback className="bg-fuchsia-100 text-lg font-semibold text-fuchsia-700">{viewer.initials}</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<CardTitle className="truncate text-xl">{viewer.fullName}</CardTitle>
								<CardDescription className="truncate">{viewer.email}</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<dl className="grid gap-5 sm:grid-cols-2">
							<ProfileDetail icon={<MailIcon />} label="Email" value={viewer.email} />
							<ProfileDetail icon={<ShieldCheckIcon />} label="Metodo di accesso" value="Email e password" />
							<ProfileDetail icon={<CalendarDaysIcon />} label="Account creato" value={formatDate(viewer.createdAt)} />
							<ProfileDetail icon={<KeyRoundIcon />} label="Ultimo accesso" value={formatDate(viewer.lastSignInAt)} />
						</dl>
					</CardContent>
				</Card>
				<Card className="border-destructive/20">
					<CardHeader>
						<CardTitle>Sessione</CardTitle>
						<CardDescription>Uscirai soltanto da questo dispositivo.</CardDescription>
					</CardHeader>
					<CardContent>
						<form action={signOut}>
							<Button type="submit" variant="destructive">Esci dall&apos;account</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function ProfileDetail({icon, label, value}: {icon: React.ReactNode; label: string; value: string}) {
	return (
		<div className="flex gap-3">
			<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-700 [&_svg]:size-4">{icon}</div>
			<div className="min-w-0">
				<dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</dt>
				<dd className="mt-1 break-words font-medium text-neutral-900">{value}</dd>
			</div>
		</div>
	);
}
