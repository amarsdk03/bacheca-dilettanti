"use client";

import {useState} from "react";
import {Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogDismissButton,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {normalizeDomains} from "../contracts";

export function ExcludedDomainsDialog({open, onOpenChange, domains, onApply}: {open: boolean; onOpenChange: (open: boolean) => void; domains: string[]; onApply: (domains: string[]) => void}) {
  const [draft, setDraft] = useState(domains);
  const [error, setError] = useState("");
  const changeOpen = (next: boolean) => {
    if (!next) {setDraft(domains); setError("");}
    onOpenChange(next);
  };
  const apply = () => {
    try {onApply(normalizeDomains(draft)); setError(""); onOpenChange(false);}
    catch {setError("Inserisci domini validi, ad esempio gmail.com.");}
  };
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogContent>
      <DialogHeader><DialogTitle>Domini esclusi</DialogTitle><DialogDescription>Utile per filtrare domini conosciuti e scovare eventuali utenti temporanei, spam o bot.</DialogDescription></DialogHeader>
      <DialogDismissButton />
      <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1" aria-label="Domini da escludere">
        {draft.map((domain, index) => <div className="flex items-center gap-2" key={index}>
          <Input aria-label={`Dominio ${index + 1}`} value={domain} maxLength={253} placeholder="esempio.it" onChange={event => {const next = [...draft]; next[index] = event.target.value; setDraft(next); setError("");}} />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Rimuovi dominio ${index + 1}`} onClick={() => setDraft(draft.filter((_, i) => i !== index))}><Trash2 aria-hidden="true" /></Button>
        </div>)}
      </div>
      <div><Button type="button" variant="outline" size="sm" disabled={draft.length >= 50} onClick={() => setDraft([...draft, ""])}><Plus data-icon="inline-start" />Aggiungi dominio</Button> <span className="text-sm text-muted-foreground">{draft.length}/50</span></div>
      {error && <p role="alert" className="admin-filter-error">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={() => changeOpen(false)}>Annulla</Button><Button type="button" onClick={apply}>Filtra domini</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
