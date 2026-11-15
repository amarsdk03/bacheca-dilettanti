"use client";
import {CircleHelp} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDismissButton,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog";

export function AnnouncementLegend({kind}: { kind: "visibility" | "distribution" }) {
	const visibility = kind === "visibility";
	return <Dialog><DialogTrigger render={<Button variant="ghost" size="icon-sm"
	                                              aria-label={visibility ? "Legenda visibilità" : "Legenda distribuzione"}/>}><CircleHelp
		aria-hidden="true"/></DialogTrigger>
		<DialogContent
			className="max-h-[90dvh] overflow-y-auto"><DialogDismissButton/><DialogHeader><DialogTitle>{visibility ? "Legenda visibilità" : "Legenda distribuzione"}</DialogTitle>
		</DialogHeader>
			{visibility ? <>
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
						<dd>Distribuzione sconosciuta</dd>
					</div>
				</dl>}
		</DialogContent></Dialog>;
}
