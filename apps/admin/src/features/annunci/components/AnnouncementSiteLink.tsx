"use client";

import {ExternalLink} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useExternalNavigation} from "@/features/navigation/ExternalNavigation";
import {canonicalUuid} from "../validation";

function previewUrl(id: string): string | null {
  if (!canonicalUuid(id)) return null;
  try {
    const origin = new URL(process.env.NEXT_PUBLIC_WEB_URL || "https://www.bachecadilettanti.it");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
    if ((origin.protocol !== "https:" && !(local && origin.protocol === "http:")) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return null;
    const url = new URL("/dettagli-annuncio", origin.origin);
    url.searchParams.set("id", id);
    return url.href;
  } catch { return null; }
}

export function AnnouncementSiteLink({ id, trashed }: { id: string; trashed?: boolean }) {
  const request = useExternalNavigation();
  const href = previewUrl(id);
  return <div className="admin-site-preview">
    <Button type="button" variant="outline" size="sm" disabled={trashed || !href}
      aria-label="Apri l’annuncio sul sito in una nuova scheda"
      onClick={(event) => { if (href) request(href, event.currentTarget); }}>
      <ExternalLink data-icon="inline-start" aria-hidden="true" />Apri sul sito
    </Button>
    {(trashed || !href) && <p className="admin-note">{trashed ? "Ripristina l’annuncio dal cestino per aprirlo sul sito" : "Indirizzo del sito non disponibile"}</p>}
  </div>;
}
