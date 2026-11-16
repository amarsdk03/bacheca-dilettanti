"use client";
import {Tabs as TabsPrimitive} from "@base-ui/react/tabs";
import {cn} from "@/lib/utils";

function Tabs({className,...props}:TabsPrimitive.Root.Props){return <TabsPrimitive.Root data-slot="tabs" className={cn("flex min-w-0 flex-col gap-5",className)} {...props}/>;}
function TabsList({className,...props}:TabsPrimitive.List.Props){return <TabsPrimitive.List data-slot="tabs-list" className={cn("inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg bg-muted p-1",className)} {...props}/>;}
function TabsTrigger({className,...props}:TabsPrimitive.Tab.Props){return <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn("inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none data-active:bg-background data-active:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",className)} {...props}/>;}
function TabsContent({className,...props}:TabsPrimitive.Panel.Props){return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex min-w-0 flex-col gap-6 outline-none",className)} {...props}/>;}
export{Tabs,TabsList,TabsTrigger,TabsContent};
