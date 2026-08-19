"use client";

import {type FormEvent, useState} from "react";
import {ExternalLink, Mail, Send} from "lucide-react";
import {SiInstagram, SiWhatsapp} from "@icons-pack/react-simple-icons";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {INSTAGRAM_URL, WHATSAPP_URL} from "@/const/contactConstants";

export default function Contatti({emailStaff}: {emailStaff: string}) {
	const [nome, setNome] = useState("");
	const [email, setEmail] = useState("");
	const [oggetto, setOggetto] = useState("");
	const [messaggio, setMessaggio] = useState("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const body = [`Nome: ${nome}`, `Email: ${email}`, "", messaggio].join("\n");
		window.location.href = `mailto:${emailStaff}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(body)}`;
	};

	return (
		<main className="min-h-screen bg-neutral-50 px-4 py-14 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-3xl">
				<header className="text-center">
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-700">Parliamone</p>
					<h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">Contatti</h1>
					<p className="mx-auto mt-4 max-w-xl leading-7 text-neutral-600">Hai una domanda, una proposta o vuoi segnalarci qualcosa? Scrivi direttamente allo staff.</p>
				</header>

				<section aria-labelledby="social-title" className="mt-10">
					<h2 id="social-title" className="sr-only">I nostri canali social</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-fuchsia-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700"><SiInstagram size={22} title="Instagram" /></span>
							<span className="min-w-0 flex-1"><span className="block font-semibold text-neutral-950">Seguici su Instagram</span><span className="mt-1 block text-sm text-neutral-600">Novità, annunci e contenuti dalla community.</span></span>
							<ExternalLink className="size-4 text-neutral-400 transition group-hover:text-fuchsia-600" />
						</a>
						<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><SiWhatsapp size={22} title="WhatsApp" /></span>
							<span className="min-w-0 flex-1"><span className="block font-semibold text-neutral-950">Unisciti al canale WhatsApp</span><span className="mt-1 block text-sm text-neutral-600">Ricevi gli aggiornamenti senza perderti nulla.</span></span>
							<ExternalLink className="size-4 text-neutral-400 transition group-hover:text-emerald-600" />
						</a>
					</div>
				</section>

				<Card className="mt-8 bg-white shadow-sm">
					<CardContent className="p-2 sm:p-4">
						<div className="mb-6 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700"><Mail /></span><div><h2 className="font-semibold text-neutral-950">Scrivi allo staff</h2><p className="text-sm text-neutral-500">Si aprirà la tua app email con il messaggio già compilato.</p></div></div>
						<form onSubmit={handleSubmit}>
							<FieldGroup>
								<div className="grid gap-4 sm:grid-cols-2">
									<Field><FieldLabel htmlFor="contatti-nome">Nome</FieldLabel><Input id="contatti-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required /></Field>
									<Field><FieldLabel htmlFor="contatti-email">Email</FieldLabel><Input id="contatti-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
								</div>
								<Field><FieldLabel htmlFor="contatti-oggetto">Oggetto</FieldLabel><Input id="contatti-oggetto" value={oggetto} onChange={(e) => setOggetto(e.target.value)} placeholder="Come possiamo aiutarti?" required /></Field>
								<Field><div className="flex items-center justify-between"><FieldLabel htmlFor="contatti-messaggio">Messaggio</FieldLabel><span className="text-xs text-neutral-400">{messaggio.length}/3000</span></div><Textarea id="contatti-messaggio" value={messaggio} onChange={(e) => setMessaggio(e.target.value.slice(0, 3000))} className="min-h-40 resize-y" required /><FieldDescription>Non inserire password o dati sensibili.</FieldDescription></Field>
								<Button type="submit" size="lg" className="mt-2 w-full sm:w-auto"><Send /> Prepara email</Button>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
