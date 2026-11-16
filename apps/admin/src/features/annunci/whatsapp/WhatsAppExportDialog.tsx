"use client";
import {DistributionDialog} from "@/features/distribution/components/DistributionDialog";

export function WhatsAppExportDialog({id,onClose,onSaved,finalFocus}:{id:string;onClose():void;onSaved():void;finalFocus:()=>HTMLElement|null}) {
  return <DistributionDialog input={{announcementId:id}} onClose={onClose} onSaved={onSaved} finalFocus={finalFocus}/>;
}
