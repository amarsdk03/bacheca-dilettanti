import {Skeleton} from "@/components/ui/skeleton";

function LoadingRegion({children, label, className}: {children: React.ReactNode; label: string; className?: string}) {
	return <div role="status" className={className}><span className="sr-only">{label}</span>{children}</div>;
}

function Block({className}: {className: string}) {
	return <Skeleton aria-hidden="true" className={`motion-reduce:animate-none ${className}`} />;
}

export function NavbarSkeleton({minimal = false, workInProgress = true}: {minimal?: boolean; workInProgress?: boolean}) {
	return <div aria-hidden="true" className="border-b border-white/10 bg-[#050505]">
		{workInProgress && <div className="flex h-9 items-center justify-center border-b bg-[#fff9df]"><Block className="h-3 w-72 max-w-[80vw]" /></div>}
		<div className="mx-auto flex h-16 max-w-370 items-center justify-between gap-3 px-4 sm:gap-6 lg:h-24 lg:px-8">
			<Block className="size-11 shrink-0 rounded-lg bg-white/15 sm:size-12" />
			{!minimal && <div className="hidden gap-4 md:flex"><Block className="h-8 w-24 bg-white/15" /><Block className="h-8 w-24 bg-white/15" /><Block className="h-8 w-24 bg-white/15" /></div>}
			<Block className="h-9 w-20 bg-white/15 sm:w-24" />
		</div>
	</div>;
}

function ResultCardSkeleton({kind}: {kind: "annunci" | "profili"}) {
	return <li aria-hidden="true" className="flex min-h-64 min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
		<div className="flex min-w-0 items-center gap-3"><Block className="size-11 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Block className="h-5 w-2/3" /><Block className="h-3 w-1/3" /></div><Block className="hidden size-8 shrink-0 rounded-md sm:block" /></div>
		{kind === "annunci" && <Block className="h-4 w-1/2" />}
		<div className="space-y-2"><Block className="h-4 w-full" /><Block className="h-4 w-5/6" /><Block className="h-4 w-2/3" /></div>
		<div className="mt-auto flex flex-wrap gap-2"><Block className="h-6 w-20 rounded-full" /><Block className="h-6 w-24 rounded-full" /></div>
		<div className="flex items-center justify-between border-t pt-3"><Block className="h-4 w-24" /><Block className="h-9 w-24 rounded-md" /></div>
	</li>;
}

export function DirectoryResultsSkeleton({kind, announce = true}: {kind: "annunci" | "profili"; announce?: boolean}) {
	const cards = <>
		<div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Block className="h-7 w-44" /></div>
		<ul aria-hidden="true" className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length: 6}, (_, index) => <ResultCardSkeleton key={index} kind={kind} />)}</ul>
		<div aria-hidden="true" className="mt-8 flex flex-wrap items-center justify-between gap-3"><Block className="h-10 w-28 rounded-md" /><Block className="h-4 w-24" /><Block className="h-10 w-28 rounded-md" /></div>
	</>;
	if (!announce) return <div aria-hidden="true">{cards}</div>;
	return <LoadingRegion label={`Caricamento ${kind} in corso`}>{cards}</LoadingRegion>;
}

export function DirectoryPageSkeleton({kind}: {kind: "annunci" | "profili"}) {
	return <><NavbarSkeleton /><div className="min-h-screen bg-muted/20"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
		<LoadingRegion label={`Caricamento pagina ${kind} in corso`}>
			<div className="max-w-3xl space-y-2"><Block className="h-9 w-40 sm:h-10" /><Block className="h-5 w-full max-w-xl" /></div>
			<div className="mt-5 flex min-w-0 items-end gap-2 sm:mt-6"><Block className="h-12 min-w-0 flex-1 rounded-xl" /><Block className="h-12 w-12 shrink-0 rounded-md sm:w-28" /></div>
			<div className="mt-5 flex gap-2 overflow-hidden">{Array.from({length: 7}, (_, index) => <Block key={index} className="h-10 w-28 shrink-0 rounded-full sm:h-11 sm:w-32" />)}</div>
			<div aria-hidden="true" className="mt-8 flex w-full items-center justify-between gap-3 overflow-hidden sm:my-8">{Array.from({length: 3}, (_, index) => <Block key={index} className="h-16 min-w-0 flex-1 rounded-lg" />)}</div>
			<section className="mt-7"><DirectoryResultsSkeleton kind={kind} announce={false} /></section>
		</LoadingRegion>
	</div></div></>;
}

function DetailHeroSkeleton({kind}: {kind: "annuncio" | "profilo"}) {
	return <div aria-hidden="true" className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
		<div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
			<div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center">
				{kind === "profilo" && <Block className="size-24 shrink-0 rounded-full sm:size-28" />}
				<div className="min-w-0 flex-1 space-y-3"><Block className="h-10 w-4/5 max-w-2xl sm:h-12" /><div className="flex flex-wrap gap-2"><Block className="h-6 w-32 rounded-full" /><Block className="h-6 w-24 rounded-full" /><Block className="h-6 w-28 rounded-full" /></div><div className="flex flex-wrap gap-x-5 gap-y-3"><Block className="h-4 w-32" /><Block className="h-4 w-36" /></div></div>
			</div>
			<Block className="h-11 w-full rounded-md xl:w-36" />
		</div>
		<div className="mt-6 grid grid-cols-2 gap-3 border-t pt-5 sm:grid-cols-3 lg:grid-cols-4">{Array.from({length: 8}, (_, index) => <div key={index} className="min-w-0 space-y-2"><Block className="h-3 w-2/3" /><Block className="h-4 w-full" /></div>)}</div>
	</div>;
}

function DetailSideSkeleton({kind}: {kind: "annuncio" | "profilo"}) {
	return <aside aria-hidden="true" className={`flex min-w-0 flex-col gap-5 ${kind === "profilo" ? "order-1 lg:order-2 lg:col-start-2 lg:row-start-1" : "order-2"}`}>
		{Array.from({length: kind === "annuncio" ? 5 : 3}, (_, index) => <div key={index} className="rounded-xl border bg-card p-5"><Block className="mb-5 h-6 w-2/3" /><div className="space-y-3"><Block className="h-4 w-full" /><Block className="h-4 w-4/5" />{index === 0 && <Block className="mt-4 h-10 w-full rounded-md" />}</div></div>)}
	</aside>;
}

function DetailOverviewSkeleton({kind}: {kind: "annuncio" | "profilo"}) {
	return <>
		<div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1 lg:col-start-1 lg:row-span-2 lg:row-start-1">
			{kind === "profilo" && <div aria-hidden="true" className="rounded-xl border bg-card p-5 sm:p-6"><Block className="mb-5 h-6 w-1/3" /><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({length: 8}, (_, index) => <div key={index} className="space-y-2"><Block className="h-3 w-2/3" /><Block className="h-4 w-full" /></div>)}</div></div>}
			<div aria-hidden="true" className="rounded-xl border bg-card p-5 sm:p-6"><Block className="mb-5 h-6 w-1/3" /><div className="space-y-3"><Block className="h-4 w-full" /><Block className="h-4 w-full" /><Block className="h-4 w-11/12" /><Block className="h-4 w-4/5" /><Block className="h-4 w-2/3" /></div></div>
			{kind === "annuncio" && <div aria-hidden="true" className="rounded-xl border bg-card p-5 sm:p-6"><Block className="mb-5 h-6 w-2/5" /><div className="space-y-3"><Block className="h-4 w-full" /><Block className="h-4 w-4/5" /></div></div>}
		</div>
		<DetailSideSkeleton kind={kind} />
		{kind === "profilo" && <div aria-hidden="true" className="order-3 flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-2"><div className="rounded-xl border bg-card p-5"><Block className="h-5 w-2/3" /></div><div className="rounded-xl border bg-card p-5"><Block className="h-5 w-1/2" /></div></div>}
	</>;
}

export function DetailPageSkeleton({kind}: {kind: "annuncio" | "profilo"}) {
	return <><NavbarSkeleton /><div className="min-h-screen bg-muted/20"><main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
		<LoadingRegion label={`Caricamento dettaglio ${kind} in corso`} className="flex min-w-0 flex-col gap-6">
			<Block className="h-9 w-32" />
			<DetailHeroSkeleton kind={kind} />
			<div aria-hidden="true" className="flex gap-2 overflow-hidden border-b">{Array.from({length: kind === "profilo" ? 4 : 2}, (_, index) => <Block key={index} className="h-11 w-36 shrink-0 rounded-none" />)}</div>
			<div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"><DetailOverviewSkeleton kind={kind} /></div>
			<div className="mx-auto mt-2 w-full max-w-md space-y-3"><Block className="mx-auto h-3 w-24" /><Block className="h-24 w-full rounded-xl" /></div>
		</LoadingRegion>
	</main></div></>;
}

export function DashboardPageSkeleton() {
	return <><NavbarSkeleton /><div className="min-h-screen bg-muted/20"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
		<LoadingRegion label="Caricamento del tuo profilo in corso" className="flex flex-col gap-6 sm:gap-8">
			<div aria-hidden="true" className="rounded-xl border border-t-2 bg-card p-4 shadow-sm sm:p-6"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-center gap-4 sm:gap-5"><Block className="size-16 shrink-0 rounded-full sm:size-20" /><div className="min-w-0 flex-1 space-y-2"><Block className="h-3 w-24" /><Block className="h-8 w-56 max-w-full" /><Block className="h-4 w-48 max-w-full" /></div></div><div className="grid gap-2 sm:grid-cols-2 md:w-52 md:grid-cols-1"><Block className="h-11 w-full rounded-md" /><Block className="h-11 w-full rounded-md" /></div></div><div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4"><Block className="h-6 w-36 rounded-full" /><Block className="h-6 w-40 rounded-full" /><Block className="h-4 w-32" /><Block className="ml-auto h-8 w-20" /></div></div>
			<div aria-hidden="true" className="overflow-hidden rounded-xl border bg-card"><div className="flex min-w-max gap-2 px-3 sm:gap-4 sm:px-5">{["w-32", "w-32", "w-36", "w-40", "w-32", "w-20"].map((width, index) => <Block key={index} className={`h-12 ${width} shrink-0`} />)}</div></div>
			<div aria-hidden="true" className="flex flex-col gap-6"><section className="flex flex-col gap-5"><div className="flex flex-col gap-2"><div className="flex items-center gap-2"><Block className="h-6 w-48" /><Block className="h-6 w-12 rounded-full" /></div><Block className="h-4 w-2/3 max-w-xl" /></div><div className="grid gap-4 md:grid-cols-2">{Array.from({length: 2}, (_, index) => <div key={index} className="flex min-h-56 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-center gap-3"><Block className="size-12 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Block className="h-5 w-2/3" /><Block className="h-3 w-1/3" /></div></div><Block className="h-4 w-3/4" /><Block className="h-2 w-full rounded-full" /><div className="mt-auto flex flex-wrap gap-2"><Block className="h-9 w-24" /><Block className="h-9 w-24" /></div></div>)}</div></section><div className="border-t pt-6"><div className="mb-5 flex flex-col gap-2"><Block className="h-6 w-44" /><Block className="h-4 w-2/3 max-w-xl" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({length: 3}, (_, index) => <div key={index} className="flex min-h-40 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5"><div className="flex items-center gap-3"><Block className="size-10 shrink-0 rounded-full" /><Block className="h-5 flex-1" /></div><Block className="h-4 w-4/5" /><Block className="mt-auto h-9 w-28" /></div>)}</div></div></div>
		</LoadingRegion>
	</div></div></>;
}

export function FormPageSkeleton({kind}: {kind: "pubblicazione" | "accesso" | "registrazione" | "recupero" | "richiesta-recupero"}) {
	if (kind === "accesso") return <><div aria-hidden="true" className="flex h-9 items-center justify-center border-b bg-[#fff9df]"><Block className="h-3 w-72 max-w-[80vw]" /></div><div className="grid min-h-[calc(100svh-2.25rem)] overflow-hidden bg-muted lg:grid-cols-2"><LoadingRegion label="Caricamento accesso in corso" className="flex min-h-0 min-w-0 flex-col gap-2 bg-background px-6 py-3 md:px-10 md:py-4"><Block className="h-12 w-40 self-center rounded-lg md:self-start" /><div className="flex min-h-0 flex-1 items-center justify-center py-4 sm:py-8"><div className="w-full max-w-xs space-y-6"><div className="space-y-2 text-center"><Block className="mx-auto h-7 w-40" /><Block className="mx-auto h-4 w-full" /></div><div className="space-y-5"><div className="space-y-2"><Block className="h-4 w-16" /><Block className="h-11 w-full" /></div><div className="space-y-2"><Block className="h-4 w-24" /><Block className="h-11 w-full" /></div><Block className="h-11 w-full rounded-md" /><Block className="mx-auto h-4 w-40" /><Block className="mx-auto h-4 w-48" /></div></div></div></LoadingRegion><div aria-hidden="true" className="relative hidden min-h-0 overflow-hidden bg-muted lg:block"><div className="absolute inset-0 bg-linear-to-br from-brand-indigo/15 via-transparent to-brand-ink/20" /></div></div></>;
	const publishing = kind === "pubblicazione";
	const recoveryRequest = kind === "richiesta-recupero";
	return <>{(publishing || recoveryRequest) && <NavbarSkeleton minimal />}{kind === "registrazione" && <div aria-hidden="true" className="flex h-9 items-center justify-center border-b bg-[#fff9df]"><Block className="h-3 w-72 max-w-[80vw]" /></div>}<div className={`flex min-h-screen items-start justify-center bg-muted/20 px-3 py-8 sm:px-4 sm:py-12 lg:py-16 ${kind === "recupero" || recoveryRequest ? "min-h-[calc(100svh-4rem)]" : ""}`}><LoadingRegion label={`Caricamento ${kind} in corso`} className={publishing ? "w-full max-w-4xl" : kind === "registrazione" ? "w-full max-w-3xl" : "w-full max-w-sm"}>
		{publishing ? <><div className="mx-auto mb-6 max-w-3xl space-y-3 text-center sm:mb-8"><Block className="mx-auto h-8 w-3/4 sm:h-10" /><Block className="mx-auto h-4 w-full max-w-xl" /></div><div aria-hidden="true" className="grid grid-cols-4 gap-1 sm:gap-2">{Array.from({length: 4}, (_, index) => <Block key={index} className="h-11 w-full rounded-md sm:h-12" />)}</div><div aria-hidden="true" className="mt-4 rounded-xl border bg-card p-4 sm:p-6"><div className="mb-6 space-y-2"><Block className="h-5 w-1/2" /><Block className="h-4 w-4/5" /></div><div className="mb-6 grid gap-3 sm:grid-cols-2">{Array.from({length: 6}, (_, index) => <div key={index} className="flex min-h-20 items-center gap-3 rounded-xl border p-3 sm:p-4"><Block className="size-10 shrink-0 rounded-lg" /><div className="min-w-0 flex-1 space-y-2"><Block className="h-4 w-2/3" /><Block className="h-3 w-4/5" /></div></div>)}</div><div className="flex justify-between gap-3"><Block className="h-10 w-24 rounded-md" /><Block className="h-10 w-24 rounded-md" /></div></div></> : <>{kind === "registrazione" && <div className="mb-5 flex justify-center"><Block className="h-16 w-40" /></div>}{!recoveryRequest && kind !== "registrazione" && <div className="mb-6 flex justify-center"><Block className="h-12 w-40" /></div>}<div aria-hidden="true" className="rounded-xl border bg-card p-5 shadow-sm sm:p-8"><Block className="h-8 w-3/5" /><Block className="mt-3 h-4 w-4/5" /><div className="mt-8 flex flex-col gap-5"><Block className="h-5 w-1/3" /><Block className="h-11 w-full" />{!recoveryRequest && <><Block className="h-5 w-1/3" /><Block className="h-11 w-full" /></>}<Block className="mt-3 h-11 w-full rounded-md" /></div></div></>}
	</LoadingRegion></div></>;
}

export function CompletionPageSkeleton({payment = false}: {payment?: boolean}) {
	return <><NavbarSkeleton minimal /><div className="min-h-screen bg-muted/20 px-4 py-10 sm:py-12"><LoadingRegion label={payment ? "Caricamento pagamento in corso" : "Caricamento conferma in corso"}><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><Block className="mx-auto size-14 rounded-full" /><Block className="mx-auto mt-5 h-9 w-4/5" /><Block className="mx-auto mt-3 h-5 w-full max-w-xl" /></div><div className="mx-auto mt-10 max-w-3xl rounded-xl border bg-card p-5 sm:p-6"><Block className="h-6 w-1/2" /><Block className="mt-6 h-4 w-full" /><Block className="mt-4 h-4 w-4/5" /><Block className="mt-8 h-11 w-full rounded-md" /></div><div className="mx-auto mt-10 max-w-4xl"><Block className="h-3 w-24" /><Block className="mt-3 h-24 w-full rounded-xl" /></div><div className="mt-12"><Block className="h-7 w-64" /><div className="mt-6 grid gap-5 md:grid-cols-3">{Array.from({length: 3}, (_, index) => <div key={index} className="rounded-xl border bg-card p-5"><Block className="h-6 w-3/4" /><Block className="mt-4 h-4 w-full" /><Block className="mt-2 h-4 w-4/5" /><Block className="mt-6 h-9 w-28" /></div>)}</div></div></div></LoadingRegion></div></>;
}
