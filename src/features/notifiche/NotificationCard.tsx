import Link from "next/link";
import {BadgeCheck, ClipboardCheck, Flag, Megaphone, MessageCircleMore, Newspaper, UserPlus} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {notificationStateLabel, type NotificationItem, type NotificationReference} from "@/features/notifiche/notification-model";

const PRESENTATION = {
	interesse: {icon: MessageCircleMore, label: "Manifestazione di interesse"},
	follower: {icon: UserPlus, label: "Nuovo follower"},
	annuncio_seguito: {icon: Newspaper, label: "Annuncio di un profilo seguito"},
	stato_annuncio: {icon: ClipboardCheck, label: "Stato del tuo annuncio"},
	segnalazione: {icon: Flag, label: "Segnalazione inviata"},
	profilo_speciale: {icon: BadgeCheck, label: "Profilo speciale abilitato"},
	novita: {icon: Megaphone, label: "Novità da Bacheca Dilettanti"},
};
function Reference({value, fallback}: {value: NotificationReference | null; fallback: string}) {
	return value?.href ? <Link className="notification-link" href={value.href}>{value.label}</Link> : <strong>{value?.label ?? fallback}</strong>;
}
function NotificationText({item}: {item: NotificationItem}) {
	const actor = <Reference value={item.actor} fallback="Un utente" />;
	const target = <Reference value={item.target} fallback="contenuto non più disponibile" />;
	switch (item.type) {
		case "interesse": return <>{actor} ha manifestato interesse per il tuo {item.targetKind === "annuncio" ? "annuncio" : "profilo"} {target}.</>;
		case "follower": return <>Profilo {actor} ha iniziato a seguire il tuo profilo {target}.</>;
		case "annuncio_seguito": return <>{actor} ha pubblicato un nuovo annuncio: {target}.</>;
		case "stato_annuncio": return <>Il tuo annuncio {target} è stato <strong>{notificationStateLabel(item.state)}</strong>.</>;
		case "segnalazione": return <>Abbiamo ricevuto la tua segnalazione per {target}. Il team la valuterà.</>;
		case "profilo_speciale": return <>È stata autorizzata la creazione del tuo profilo <strong>{item.state === "creators" ? "Creators" : "Servizi e professionisti"}</strong>. <Link className="notification-link" href="/il-tuo-profilo?sezione=profilo">Completa il profilo</Link> per iniziare a utilizzarlo.</>;
		case "novita": return <>{item.info ?? "Novità da Bacheca Dilettanti."}</>;
	}
}
export default function NotificationCard({item, compact = false}: {item: NotificationItem; compact?: boolean}) {
	const {icon: Icon, label} = PRESENTATION[item.type];
	const date = new Intl.DateTimeFormat("it-IT", {dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome"}).format(new Date(item.createdAt));
	return (
		<Card size={compact ? "sm" : "default"} className="notification-card rounded-md" data-notification-type={item.type} data-unread={!item.readAt || undefined}>
			<CardHeader>
				<div className="flex items-start gap-3">
					<span className="notification-type-icon flex size-9 shrink-0 items-center justify-center rounded-xl"><Icon className="size-5" aria-hidden="true" /></span>
					<div className="flex min-w-0 flex-1 flex-col gap-px">
						<CardTitle>{label}</CardTitle>
						<CardDescription className={"text-xs"}>
							<time dateTime={item.createdAt}>{date}</time>
						</CardDescription>
					</div>
					{!item.readAt && <Badge variant="secondary">Nuova</Badge>}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 wrap-anywhere">
				<p className="leading-6"><NotificationText item={item} /></p>
				{item.type === "interesse" && <p className="leading-6"><strong>Contatti forniti: </strong>{item.email || item.phone ? <>{item.email && <a className="notification-link" href={`mailto:${item.email}`}>{item.email}</a>}{item.email && item.phone && " · "}{item.phone && <a className="notification-link" href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}>{item.phone}</a>}</> : "non più disponibili"}</p>}
				{item.type === "stato_annuncio" && item.info && <p className="text-muted-foreground leading-6 whitespace-pre-line">{item.info}</p>}
			</CardContent>
		</Card>
	);
}
