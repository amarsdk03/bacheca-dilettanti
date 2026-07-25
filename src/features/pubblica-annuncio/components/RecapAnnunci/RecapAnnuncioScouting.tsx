type RecapAnnuncioScoutingProps = {
	nome: string;
	tipologiaCalcioLabel: string;
	linkLogo: string;
	contattiPubblici: string;
	presentazione: string;
};

export default function RecapAnnuncioScouting({
	nome,
	tipologiaCalcioLabel,
	linkLogo,
	contattiPubblici,
	presentazione,
}: RecapAnnuncioScoutingProps) {
	return (
		<div>
			<p className="text-muted-foreground mb-1">Dettagli scouting</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-muted-foreground">Nome</dt>
					<dd className="font-medium">{nome || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Tipologia calcio</dt>
					<dd className="font-medium">{tipologiaCalcioLabel || "—"}</dd>
				</div>
				{linkLogo.trim() !== "" && (
					<div className="sm:col-span-2">
						<dt className="text-xs text-muted-foreground">Link logo</dt>
						<dd className="font-medium break-all">{linkLogo}</dd>
					</div>
				)}
				<div className="sm:col-span-2">
					<dt className="text-xs text-muted-foreground">Contatti pubblici</dt>
					<dd className="font-medium">{contattiPubblici || "—"}</dd>
				</div>
				{presentazione.trim() !== "" && (
					<div className="sm:col-span-2">
						<dt className="text-xs text-muted-foreground">Presentazione personale</dt>
						<dd className="font-medium whitespace-pre-wrap">{presentazione}</dd>
					</div>
				)}
			</dl>
		</div>
	);
}
