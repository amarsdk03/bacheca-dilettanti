"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogoutForm } from "@/features/auth/components/LogoutForm";
import { DASHBOARD_GROUPS, DASHBOARD_SECTIONS, isSectionActive } from "../sections";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const compact = state === "collapsed" && !isMobile;
  return <Sidebar collapsible="icon">
    <SidebarHeader>
      <div className="admin-brand-row">
        <Link href="/" className="admin-brand" aria-label="Bacheca Dilettanti — Home" prefetch={false} onClick={() => setOpenMobile(false)}>
          {compact ? <Image src="/logo.png" alt="Bacheca Dilettanti" width={32} height={32} className="admin-brand-logo" /> :
            <Image src="/banner.png" alt="Bacheca Dilettanti" width={216} height={108} className="admin-brand-banner" priority />}
        </Link>
        {isMobile && <Button variant="ghost" size="icon" aria-label="Chiudi menu" onClick={() => setOpenMobile(false)}><X aria-hidden="true" /></Button>}
      </div>
    </SidebarHeader>
    <SidebarContent><nav aria-label="Sezioni della dashboard">
      {DASHBOARD_GROUPS.map((group) => <SidebarGroup key={group ?? "home"}>
        {group && <SidebarGroupLabel>{group}</SidebarGroupLabel>}
        <SidebarGroupContent><SidebarMenu>
          {DASHBOARD_SECTIONS.filter((section) => section.group === group).map((section) => {
            const Icon = section.icon, active = isSectionActive(pathname, section.href);
            return <SidebarMenuItem key={section.href}>
              <SidebarMenuButton isActive={active} tooltip={section.title} aria-label={section.title}
                aria-current={active ? "page" : undefined}
                render={<Link href={section.href} prefetch={false} />} onClick={() => setOpenMobile(false)}>
                <Icon aria-hidden="true" /><span>{section.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>;
          })}
        </SidebarMenu></SidebarGroupContent>
      </SidebarGroup>)}
    </nav></SidebarContent>
    <SidebarFooter><LogoutForm compact={compact} /></SidebarFooter>
  </Sidebar>;
}
