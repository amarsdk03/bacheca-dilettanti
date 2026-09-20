"use client";

import {useTransition} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowUpRightIcon, HeartIcon, UsersIcon} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import AnnouncementCard from "@/features/annunci/components/cards/AnnouncementCard";
import InteractionButton from "@/features/interazioni/InteractionButton";
import {
	type DashboardInteractions,
	formatSavedDate,
	type InteractionList,
	type RelationshipProfile
} from "@/features/interazioni/interaction-model";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";

function LoadError() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	return (
		<Alert variant="destructive" aria-live="polite">
			<AlertTitle>Elenco momentaneamente non disponibile</AlertTitle>
			<AlertDescription>
				<p>Non è stato possibile caricare i dati. Riprova tra poco.</p>
				<Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
					{pending ? "Caricamento…" : "Riprova"}
				</Button>
			</AlertDescription>
		</Alert>
	);
}

function RelationshipList({list, following}: {list: InteractionList<RelationshipProfile>; following: boolean}) {
	if (list.status === "error") return <LoadError />;
	if (list.items.length === 0) return (
		<Empty className="profile-dashboard-empty">
			<EmptyHeader>
				<EmptyMedia variant="icon"><UsersIcon aria-hidden="true" /></EmptyMedia>
				<EmptyTitle>{following ? "Non segui ancora nessun profilo" : "Non hai ancora follower"}</EmptyTitle>
				<EmptyDescription>{following ? "Segui i profili che ti interessano per ritrovarli qui." : "Qui troverai i profili delle persone che iniziano a seguirti."}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent><Button render={<Link href="/profili" />} nativeButton={false} variant="outline">Esplora i profili</Button></EmptyContent>
		</Empty>
	);
	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{list.items.map((profile) => (
				<Card key={profile.id} className="profile-dashboard-card profile-dashboard-interactive-card">
					<CardHeader className="flex flex-1 items-start gap-3">
						<Avatar className="size-12">
							{profile.imageUrl && <AvatarImage src={profile.imageUrl} alt="" />}
							<AvatarFallback>{profile.title.slice(0, 2).toLocaleUpperCase("it-IT")}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<CardTitle>
								<Link href={`/dettagli-profilo?${new URLSearchParams({id: profile.id, type: profile.type})}`} className="profile-dashboard-action inline-flex items-start gap-2 rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
									<span className="wrap-anywhere">{profile.title}</span><ArrowUpRightIcon className="profile-dashboard-action-arrow mt-0.5 size-4 shrink-0" aria-hidden="true" />
								</Link>
							</CardTitle>
							<CardDescription>{PROFILE_OPTIONS.find(({value}) => value === profile.type)?.label}</CardDescription>
						</div>
					</CardHeader>
					{following && <CardFooter className="justify-end">
						<InteractionButton target={{kind: "profilo", id: profile.id}} state={{status: "ready", active: true}}
							href="/il-tuo-profilo?sezione=relazioni" showLabel />
					</CardFooter>}
				</Card>
			))}
		</div>
	);
}

export function RelationshipsSection({followers, following}: Pick<DashboardInteractions, "followers" | "following">) {
	return (
		<section aria-labelledby="relationships-heading" className="flex flex-col gap-6">
			<div className="flex flex-col gap-1.5">
				<h2 id="relationships-heading" className="text-xl font-semibold tracking-tight">Follower e seguiti</h2>
				<p className="text-sm leading-6 text-muted-foreground">Le persone che ti seguono e i profili che vuoi ritrovare.</p>
			</div>
			<Tabs defaultValue="followers" className="min-w-0 gap-6">
				<div className="min-w-0 overflow-x-auto p-1">
					<TabsList aria-label="Relazioni del profilo" className="profile-dashboard-secondary-tabs">
						<TabsTrigger value="followers" className="min-h-9 px-3">Follower {followers.status === "success" && <Badge variant="secondary">{followers.items.length}</Badge>}</TabsTrigger>
						<TabsTrigger value="following" className="min-h-9 px-3">Profili seguiti {following.status === "success" && <Badge variant="secondary">{following.items.length}</Badge>}</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="followers"><RelationshipList list={followers} following={false} /></TabsContent>
				<TabsContent value="following"><RelationshipList list={following} following /></TabsContent>
			</Tabs>
		</section>
	);
}

export function SavedAnnouncementsSection({list}: {list: DashboardInteractions["savedAnnouncements"]}) {
	return (
		<section aria-labelledby="saved-announcements-heading" className="flex flex-col gap-6">
			<div className="flex flex-col gap-1.5">
				<h2 id="saved-announcements-heading" className="text-xl font-semibold tracking-tight">Annunci salvati</h2>
				<p className="text-sm leading-6 text-muted-foreground">I tuoi annunci salvati, dal più recente. Compaiono solo quelli ancora pubblici.</p>
			</div>
			{list.status === "error" ? <LoadError /> : list.items.length === 0 ? (
				<Empty className="profile-dashboard-empty">
					<EmptyHeader>
						<EmptyMedia variant="icon"><HeartIcon aria-hidden="true" /></EmptyMedia>
						<EmptyTitle>Nessun annuncio salvato disponibile</EmptyTitle>
						<EmptyDescription>Premi il cuore su un annuncio per ritrovarlo qui.</EmptyDescription>
					</EmptyHeader>
					<EmptyContent><Button render={<Link href="/annunci" />} nativeButton={false} variant="outline">Esplora gli annunci</Button></EmptyContent>
				</Empty>
			) : (
				<div className="grid gap-6 lg:grid-cols-2">
					{list.items.map(({announcement, savedAt}) => (
						<div key={announcement.id} className="profile-dashboard-saved-card flex min-w-0 flex-col gap-3">
							<div className="flex-1"><AnnouncementCard announcement={announcement} /></div>
							<div className="flex flex-wrap items-center justify-between gap-2 px-1">
								<time dateTime={savedAt} className="text-xs text-muted-foreground">Salvato il {formatSavedDate(savedAt)}</time>
								<InteractionButton target={{kind: "annuncio", id: announcement.id}} state={{status: "ready", active: true}}
									href="/il-tuo-profilo?sezione=salvati" showLabel />
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}
