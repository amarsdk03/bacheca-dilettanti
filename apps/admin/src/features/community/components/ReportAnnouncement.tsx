"use client";
import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {useRouter} from "next/navigation";
import {createAnnunciController} from "@/features/annunci/client/controller";
import {announcementTransport} from "@/features/annunci/client/transport";
import {parseAnnunciUrl} from "@/features/annunci/url-state";
import {moderateAnnouncementAction} from "@/features/annunci/server/actions";
import {AnnouncementDetailContent} from "@/features/annunci/components/AnnouncementDetailContent";
import {ModerateActions} from "@/features/annunci/components/ModerateActions";
import {ModerationDialog} from "@/features/annunci/components/ModerationDialog";
import {PanelSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {Button} from "@/components/ui/button";

/** Reuse the existing moderation state machine, capabilities and confirmation. */
export function ReportAnnouncement({id}: {id: string}) {
  const router = useRouter(), trigger = useRef<HTMLElement | null>(null);
  const [controller] = useState(() => createAnnunciController(parseAnnunciUrl(""), {status: "ok", page: {items: [], hasMore: false, nextCursor: null}}, {
    ...announcementTransport, navigate() {}, denied: () => router.replace("/accesso"), moderate: moderateAnnouncementAction,
    // The report page needs only the announcement detail after a moderation action.
    list: async () => ({status: "ok", page: {items: [], hasMore: false, nextCursor: null}}),
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => {controller.openPreview(id); return controller.cancel;}, [controller, id]);
  return <section className="admin-detail-section"><h3>Annuncio e moderazione</h3>{state.preview.pending ? <PanelSkeleton /> : state.preview.result?.status === "ok" ? <>
    <ModerateActions detail={state.preview.result.detail} disabled={state.moderation !== null} onChoose={(operation, element) => {trigger.current = element; controller.beginModeration(id, operation);}} />
    <details className="admin-content-disclosure"><summary>Info complete</summary><AnnouncementDetailContent detail={state.preview.result.detail} /></details>
  </> : <><p className="admin-note">Dettaglio dell’annuncio non disponibile.</p><Button variant="outline" onClick={controller.retryPreview}>Ricarica annuncio</Button></>}
    <ModerationDialog state={state.moderation} controller={controller} finalFocus={() => trigger.current?.isConnected ? trigger.current : null} />
  </section>;
}
