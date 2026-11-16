"use client";
import {CircleHelp} from "lucide-react";
import {useState} from "react";
import {GuardedLink} from "@/features/navigation/UnsavedChanges";
import {Button} from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDismissButton,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog";

export function AnnouncementLegend({kind}: { kind: "visibility" | "distribution" | "profile-visibility" }) {
	const [open, setOpen] = useState(false);
	const visibility = kind === "visibility";
	const profile = kind === "profile-visibility";
	return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="ghost" size="icon-sm"
	                                              aria-label={profile ? "Legenda visibilità profili" : visibility ? "Legenda visibilità" : "Legenda distribuzione"}/>}><CircleHelp
		aria-hidden="true"/></DialogTrigger>
		<DialogContent
			className="max-h-[90dvh] overflow-y-auto"><DialogDismissButton/><DialogHeader><DialogTitle>{profile || visibility ? "Legenda visibilità" : "Legenda distribuzione"}</DialogTitle>
		</DialogHeader>
			{profile ? <dl className="admin-legend-list">
        <div><dt>Pubblico</dt><dd>Profilo visibile pubblicamente, con account collegato e nessun oscuramento amministrativo.</dd></div>
        <div><dt>Privato</dt><dd>Profilo non pubblico per le impostazioni del profilo principale o di questa tipologia. Comprende anche i profili senza account, privi di una pagina pubblica autonoma.</dd></div>
        <div><dt>Oscurato</dt><dd>Blocco amministrativo di questa tipologia di profilo e dei relativi annunci, indipendente dalle preferenze dell’utente. Le altre tipologie dell’account restano invariate.</dd></div>
      </dl> : visibility ? <>
					<dl className="admin-legend-list">
						<div>
							<dt>Pubblico</dt>
							<dd>
								Privacy pubblica e nessun oscuramento amministrativo. Compare nei risultati pubblici quando lo stato è Pubblicato.
							</dd>
						</div>
						<div>
							<dt>Privato</dt>
							<dd>
								Annuncio nascosto dall’utente ed escluso dai risultati pubblici.
							</dd>
						</div>
						<div>
							<dt>Oscurato</dt>
							<dd>Annuncio oscurato dall’amministrazione, direttamente o tramite il profilo autore, ed escluso dai risultati pubblici, indipendentemente
								dalla visibilità assegnata dall’utente.</dd>
						</div>
					</dl>
                </> :
				<dl className="admin-legend-list">
					<div>
						<dt>Solo sito web</dt>
						<dd>Annuncio creato e presente soltanto sul sito web, al momento</dd>
					</div>
					<div>
						<dt>Da WhatsApp</dt>
						<dd>Annuncio importato da WhatsApp, e ora presente anche sul sito web</dd>
					</div>
					<div>
						<dt>Su WhatsApp</dt>
						<dd>Annuncio creato sul sito web, ed esportato poi anche su WhatsApp</dd>
					</div>
					<div>
						<dt>N/A</dt>
						<dd>Stato sconosciuto per l'annuncio</dd>
					</div>
				</dl>}
			{kind === "distribution" && <p className="text-sm text-muted-foreground">Per gestire al meglio la distribuzione degli annunci, visita la <GuardedLink href="/distribuzione" className="underline underline-offset-4" onClick={() => setOpen(false)}>sezione 'Distribuzione'</GuardedLink> della dashboard</p>}
		</DialogContent></Dialog>;
}
