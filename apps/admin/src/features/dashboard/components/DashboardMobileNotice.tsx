"use client";

import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {usePathname} from "next/navigation";
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
import {useIsMobile} from "@/hooks/use-mobile";
import {createMobileNoticeStore} from "../mobile-notice";

export function DashboardMobileNotice() {
  const pathname = usePathname();
  const mobile = useIsMobile(1024);
  const acknowledge = useRef<HTMLButtonElement>(null);
  const [store] = useState(() => createMobileNoticeStore({now: () => Date.now(), storage: () => window.localStorage}));
  const open = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {store.check(mobile);}, [store, mobile, pathname]);

  return <Dialog open={mobile && open} onOpenChange={next => {if (!next && mobile) store.dismiss();}}>
    <DialogContent initialFocus={acknowledge} finalFocus={() => document.getElementById("dashboard-content")}>
      <DialogDismissButton />
      <DialogHeader>
        <DialogTitle>Meglio su uno schermo più grande</DialogTitle>
        <DialogDescription>Per usare al meglio la Dashboard, accedi da PC o laptop.</DialogDescription>
      </DialogHeader>
      <DialogFooter><Button ref={acknowledge} onClick={store.dismiss}>Ho capito</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
