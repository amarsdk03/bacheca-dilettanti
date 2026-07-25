type RecapAnnuncioGiocatoreProps = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	tipologiaCalcioLabel: string;
	ruoloPrincipaleLabel: string;
	emailCollegamento: string;
	linkFoto: string;
	contattiPubblici: string;
	biografia: string;
};

export default function RecapAnnuncioGiocatore({
	nome,
	cognome,
	giornoNascita,
	meseNascita,
	annoNascita,
	tipologiaCalcioLabel,
	ruoloPrincipaleLabel,
	emailCollegamento,
	linkFoto,
	contattiPubblici,
	biografia,
}: RecapAnnuncioGiocatoreProps) {
	return (
		<div>
			<p className="text-muted-foreground mb-1">Dettagli giocatore</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-muted-foreground">Nome e cognome</dt>
					<dd className="font-medium">{nome || cognome ? `${nome} ${cognome}`.trim() : "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Data di nascita</dt>
					<dd className="font-medium">
						{giornoNascita && meseNascita && annoNascita
							? `${giornoNascita}/${meseNascita}/${annoNascita}`
							: "—"}
					</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Tipologia calcio</dt>
					<dd className="font-medium">{tipologiaCalcioLabel || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Ruolo principale</dt>
					<dd className="font-medium">{ruoloPrincipaleLabel || "—"}</dd>
				</div>
				{emailCollegamento.trim() !== "" && (
					<div>
						<dt className="text-xs text-muted-foreground">Email account</dt>
						<dd className="font-medium">{emailCollegamento}</dd>
					</div>
				)}
				{linkFoto.trim() !== "" && (
					<div>
						<dt className="text-xs text-muted-foreground">Link foto</dt>
						<dd className="font-medium break-all">{linkFoto}</dd>
					</div>
				)}
				<div className="sm:col-span-2">
					<dt className="text-xs text-muted-foreground">Contatti pubblici</dt>
					<dd className="font-medium">{contattiPubblici || "—"}</dd>
				</div>
				{biografia.trim() !== "" && (
					<div className="sm:col-span-2">
						<dt className="text-xs text-muted-foreground">Biografia</dt>
						<dd className="font-medium whitespace-pre-wrap">{biografia}</dd>
					</div>
				)}
			</dl>
		</div>
	);
}
