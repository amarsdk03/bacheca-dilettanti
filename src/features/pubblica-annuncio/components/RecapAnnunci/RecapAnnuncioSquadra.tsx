import {
	type CercaAmichevoliSquadra,
	type CercaGiocatoreSquadra,
	type CercaSponsorSquadra,
	type CercaStaffSquadra,
	type SedePrincipaleSquadra,
} from "@/features/pubblica-annuncio/components/AnnuncioSquadra";

type RecapAnnuncioSquadraProps = {
	sottotipologia: string;
	nomeSocieta: string;
	tipologiaSportLabel: string;
	linkStemma: string;
	sedePrincipale: SedePrincipaleSquadra;
	contattiPubblici: string;
	descrizione: string;
	cercaGiocatore: CercaGiocatoreSquadra;
	cercaStaff: CercaStaffSquadra;
	cercaAmichevoli: CercaAmichevoliSquadra;
	cercaSponsor: CercaSponsorSquadra;
	figuraStaffLabel: string;
	disponibilitaTrasfertaLabel: string;
};

export default function RecapAnnuncioSquadra({
	sottotipologia,
	nomeSocieta,
	tipologiaSportLabel,
	linkStemma,
	sedePrincipale,
	contattiPubblici,
	descrizione,
	cercaGiocatore,
	cercaStaff,
	cercaAmichevoli,
	cercaSponsor,
	figuraStaffLabel,
	disponibilitaTrasfertaLabel,
}: RecapAnnuncioSquadraProps) {
	return (
		<div>
			<p className="text-muted-foreground mb-1">Dettagli squadra</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-muted-foreground">Nome societa</dt>
					<dd className="font-medium">{nomeSocieta || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Tipologia sport</dt>
					<dd className="font-medium">{tipologiaSportLabel || "—"}</dd>
				</div>
				{linkStemma.trim() !== "" && (
					<div>
						<dt className="text-xs text-muted-foreground">Link stemma</dt>
						<dd className="font-medium break-all">{linkStemma}</dd>
					</div>
				)}
				<div>
					<dt className="text-xs text-muted-foreground">Sede principale</dt>
					<dd className="font-medium">
						{[sedePrincipale.indirizzo, sedePrincipale.cap, sedePrincipale.citta].filter(Boolean).join(", ") || "—"}
					</dd>
				</div>
				<div className="sm:col-span-2">
					<dt className="text-xs text-muted-foreground">Contatti pubblici</dt>
					<dd className="font-medium">{contattiPubblici || "—"}</dd>
				</div>
				{descrizione.trim() !== "" && (
					<div className="sm:col-span-2">
						<dt className="text-xs text-muted-foreground">Descrizione</dt>
						<dd className="font-medium whitespace-pre-wrap">{descrizione}</dd>
					</div>
				)}

				{sottotipologia === "cerca-giocatore" && (
					<>
						<div>
							<dt className="text-xs text-muted-foreground">Ruolo</dt>
							<dd className="font-medium">
								{[cercaGiocatore.ruoloPrincipale, cercaGiocatore.ruoloAvanzato].filter(Boolean).join(" · ") || "—"}
							</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Annate cercate</dt>
							<dd className="font-medium">{cercaGiocatore.annateCercate.join(", ") || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Periodo</dt>
							<dd className="font-medium">
								{[cercaGiocatore.periodoDa, cercaGiocatore.periodoA].filter(Boolean).join(" / ") || "—"}
							</dd>
						</div>
						{cercaGiocatore.requisiti.trim() !== "" && (
							<div className="sm:col-span-2">
								<dt className="text-xs text-muted-foreground">Requisiti</dt>
								<dd className="font-medium whitespace-pre-wrap">{cercaGiocatore.requisiti}</dd>
							</div>
						)}
					</>
				)}

				{sottotipologia === "cerca-staff" && (
					<>
						<div>
							<dt className="text-xs text-muted-foreground">Figura cercata</dt>
							<dd className="font-medium">{figuraStaffLabel || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Settore</dt>
							<dd className="font-medium">{cercaStaff.settore || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Compenso mensile</dt>
							<dd className="font-medium">{cercaStaff.compensoMensile ? `${cercaStaff.compensoMensile} €` : "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Periodo</dt>
							<dd className="font-medium">
								{[cercaStaff.periodoDa, cercaStaff.periodoA].filter(Boolean).join(" / ") || "—"}
							</dd>
						</div>
						{cercaStaff.requisiti.trim() !== "" && (
							<div className="sm:col-span-2">
								<dt className="text-xs text-muted-foreground">Requisiti</dt>
								<dd className="font-medium whitespace-pre-wrap">{cercaStaff.requisiti}</dd>
							</div>
						)}
					</>
				)}

				{sottotipologia === "cerca-partite-amichevoli" && (
					<>
						<div className="sm:col-span-2">
							<dt className="text-xs text-muted-foreground">Categorie avversario</dt>
							<dd className="font-medium">{cercaAmichevoli.categorieAvversario.join(", ") || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Periodo</dt>
							<dd className="font-medium">
								{[cercaAmichevoli.periodoDa, cercaAmichevoli.periodoA].filter(Boolean).join(" / ") || "—"}
							</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Disponibilita trasferta</dt>
							<dd className="font-medium">{disponibilitaTrasfertaLabel}</dd>
						</div>
						{cercaAmichevoli.campoIndirizzo.trim() !== "" && (
							<div className="sm:col-span-2">
								<dt className="text-xs text-muted-foreground">Campo scelto</dt>
								<dd className="font-medium">{cercaAmichevoli.campoIndirizzo}</dd>
							</div>
						)}
					</>
				)}

				{sottotipologia === "cerca-sponsor" && (
					<>
						<div>
							<dt className="text-xs text-muted-foreground">Categoria / settore</dt>
							<dd className="font-medium">{cercaSponsor.categoriaSettore || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Supporto ricercato</dt>
							<dd className="font-medium">{cercaSponsor.supportoRicercato || "—"}</dd>
						</div>
						<div className="sm:col-span-2">
							<dt className="text-xs text-muted-foreground">Cosa offrite</dt>
							<dd className="font-medium">{cercaSponsor.cosaOffrite || "—"}</dd>
						</div>
					</>
				)}
			</dl>
		</div>
	);
}
