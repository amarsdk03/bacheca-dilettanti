"use client";

import {useEffect, useState} from "react";
import {createAnnouncementPreviewCard} from "@bacheca/announcements/ui/preview-card";
import type {TeamProfileReference} from "@bacheca/announcements/features/profilo/team-profile";
import {ExternalLink} from "@/features/navigation/ExternalNavigation";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Separator} from "@/components/ui/separator";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import type {AuthorProfile, CreationInput} from "./contracts";
import {buildCreationPreviews} from "./preview";

function TeamProfileLinks({teams}: {teams: readonly TeamProfileReference[]}) {
  return <div className="flex flex-wrap gap-2">{teams.map(team => <span key={team.profileId}>{team.name}</span>)}</div>;
}
const AnnouncementPreviewCard = createAnnouncementPreviewCard({ExternalLink, Alert, AlertDescription, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator, TeamProfileLinks, cn});

export function CreationPreview({input, profile, image, imageName}: {input: CreationInput; profile?: AuthorProfile; image: File | null; imageName?: string}) {
  const [imageState, setImageState] = useState<{file: File; url: string} | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    let active = true;
    // Browser resource allocation, kept outside rendering and revoked on replacement.
    queueMicrotask(() => {if (active) setImageState({file: image, url});});
    return () => {active = false; URL.revokeObjectURL(url);};
  }, [image]);
  const previews = buildCreationPreviews(input, profile, imageState?.file === image ? imageState?.url ?? null : null, imageName ?? null);
  const selected = previews.find(item => item.region === selectedRegion) ?? previews[0];
  return <div className="flex w-full min-w-0 flex-col gap-4">
    {previews.length > 1 && <div className="flex flex-wrap gap-2" role="group" aria-label="Anteprime per regione">{previews.map(item => <Button key={item.region} type="button" variant={selected === item ? "default" : "outline"} aria-pressed={selected === item} onClick={() => setSelectedRegion(item.region)}>{item.region}</Button>)}</div>}
    <AnnouncementPreviewCard preview={selected.preview} />
  </div>;
}
