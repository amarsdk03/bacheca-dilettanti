import {type Dispatch, type SetStateAction} from "react";

import {Field, FieldLabel} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const ANNO_PLACEHOLDER = "Anno";
const MESE_PLACEHOLDER = "Mese";
const GIORNO_PLACEHOLDER = "Giorno";

const MESI = [
	"Gennaio",
	"Febbraio",
	"Marzo",
	"Aprile",
	"Maggio",
	"Giugno",
	"Luglio",
	"Agosto",
	"Settembre",
	"Ottobre",
	"Novembre",
	"Dicembre",
];

type DataNascitaFieldsProps = {
	idPrefix: string;
	giornoNascita: string;
	setGiornoNascita: Dispatch<SetStateAction<string>>;
	meseNascita: string;
	setMeseNascita: Dispatch<SetStateAction<string>>;
	annoNascita: string;
	setAnnoNascita: Dispatch<SetStateAction<string>>;
};

export default function DataNascitaFields({
	idPrefix,
	giornoNascita,
	setGiornoNascita,
	meseNascita,
	setMeseNascita,
	annoNascita,
	setAnnoNascita,
}: DataNascitaFieldsProps) {
	const annoSelezionato = annoNascita !== "";
	const meseSelezionato = meseNascita !== "";

	return (
		<Field>
			<FieldLabel>
				Data di nascita <span className={"font-normal text-neutral-400 -translate-x-1"}>(facoltativo)</span>
			</FieldLabel>
			<div className="grid grid-cols-3 gap-3">
				<Select
					value={annoNascita || ANNO_PLACEHOLDER}
					onValueChange={(value) => {
						if (value === ANNO_PLACEHOLDER) {
							setAnnoNascita("");
							setMeseNascita("");
							setGiornoNascita("");
							return;
						}

						setAnnoNascita(value ?? "");
					}}
				>
					<SelectTrigger id={`${idPrefix}-anno-nascita`} className="w-full">
						<SelectValue placeholder="Anno" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ANNO_PLACEHOLDER}>Non specificare</SelectItem>
						{Array.from({length: 100 - 17 + 1}, (_, index) => {
							const anno = String(new Date().getFullYear() - 17 - index);
							return (
								<SelectItem key={anno} value={anno}>
									{anno}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>

				<Select
					value={meseNascita || MESE_PLACEHOLDER}
					onValueChange={(value) => {
						if (value === MESE_PLACEHOLDER) {
							setMeseNascita("");
							setGiornoNascita("");
							return;
						}

						setMeseNascita(value ?? "");
					}}
				>
					<SelectTrigger
						id={`${idPrefix}-mese-nascita`}
						className="w-full"
						disabled={!annoSelezionato}
					>
						<SelectValue placeholder="Mese" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={MESE_PLACEHOLDER}>Non specificare</SelectItem>
						{MESI.map((mese) => (
							<SelectItem key={mese} value={mese}>
								{mese}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={giornoNascita || GIORNO_PLACEHOLDER}
					onValueChange={(value) =>
						setGiornoNascita(value === GIORNO_PLACEHOLDER ? "" : value ?? "")
					}
				>
					<SelectTrigger
						id={`${idPrefix}-giorno-nascita`}
						className="w-full"
						disabled={!annoSelezionato || !meseSelezionato}
					>
						<SelectValue placeholder="Giorno" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={GIORNO_PLACEHOLDER}>Non specificare</SelectItem>
						{Array.from({length: 31}, (_, index) => {
							const giorno = String(index + 1).padStart(2, "0");
							return (
								<SelectItem key={giorno} value={giorno}>
									{giorno}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
			</div>
		</Field>
	);
}
