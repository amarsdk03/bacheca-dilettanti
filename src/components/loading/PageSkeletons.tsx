import {Skeleton} from "@/components/ui/skeleton";

function LoadingRegion({children, label, className}: {children: React.ReactNode; label: string; className?: string}) {
	return <div role="status" className={className}><span className="sr-only">{label}</span>{children}</div>;
}

function Block({className}: {className: string}) {
	return <Skeleton aria-hidden="true" className={`motion-reduce:animate-none ${className}`} />;
}

export function NavbarSkeleton({minimal = false, workInProgress = true}: {minimal?: boolean; workInProgress?: boolean}) {
	return (
		<div aria-hidden="true" className="border-b border-white/10 bg-[#050505]">
			{workInProgress && <div className="flex h-9 items-center justify-center border-b bg-[#fff9df]"><Block className="h-3 w-72 max-w-[80vw]" /></div>}
			<div className="mx-auto flex h-16 max-w-370 items-center justify-between gap-6 px-4 lg:h-24 lg:px-8">
				<Block className="size-12 rounded-lg bg-white/15" />
				{!minimal && <div className="hidden gap-4 md:flex"><Block className="h-8 w-24 bg-white/15" /><Block className="h-8 w-24 bg-white/15" /><Block className="h-8 w-24 bg-white/15" /></div>}
				<Block className="h-9 w-24 bg-white/15" />
			</div>
		</div>
	);
}

export function DirectoryResultsSkeleton({kind, announce = true}: {kind: "annunci" | "profili"; announce?: boolean}) {
	const cards = <>
		<div className="mb-5"><Block className="h-7 w-44" /></div>
		<ul aria-hidden="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{Array.from({length: 6}, (_, index) => (
				<li key={index} className="flex min-h-64 flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
					<div className="flex items-center gap-3"><Block className="size-12 rounded-full" /><div className="flex-1 space-y-2"><Block className="h-5 w-2/3" /><Block className="h-3 w-1/3" /></div></div>
					<Block className="h-4 w-3/4" /><Block className="h-4 w-full" /><Block className="h-4 w-5/6" />
					<div className="mt-auto flex gap-2"><Block className="h-6 w-20 rounded-full" /><Block className="h-6 w-24 rounded-full" /></div>
				</li>
			))}
		</ul>
	</>;
	if (!announce) return <div aria-hidden="true">{cards}</div>;
	return (
		<LoadingRegion label={`Caricamento ${kind} in corso`}>
			{cards}
		</LoadingRegion>
	);
}

export function DirectoryPageSkeleton({kind}: {kind: "annunci" | "profili"}) {
	return <><NavbarSkeleton /><div className="min-h-screen bg-muted/20"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
		<LoadingRegion label={`Caricamento pagina ${kind} in corso`}>
			<Block className="h-10 w-40" /><Block className="mt-3 h-5 w-2/3 max-w-xl" />
			<div className="mt-8 flex gap-2"><Block className="h-12 flex-1" /><Block className="h-12 w-28" /></div>
			<div className="mt-6 flex gap-3 overflow-hidden">{Array.from({length: 5}, (_, index) => <Block key={index} className="h-11 w-32 shrink-0 rounded-full" />)}</div>
			<div className="mt-12"><DirectoryResultsSkeleton kind={kind} announce={false} /></div>
		</LoadingRegion>
	</div></div></>;
}

export function DetailPageSkeleton({kind}: {kind: "annuncio" | "profilo"}) {
	return <><NavbarSkeleton /><div className="min-h-screen bg-muted/20"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
		<LoadingRegion label={`Caricamento dettaglio ${kind} in corso`}>
			<Block className="h-9 w-32" /><div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
				<div className="flex flex-col gap-5 rounded-xl border bg-card p-6"><div className="flex items-center gap-4"><Block className="size-16 rounded-full" /><div className="flex-1"><Block className="h-8 w-2/3" /><Block className="mt-3 h-4 w-1/3" /></div></div><Block className="h-4 w-4/5" /><Block className="h-4 w-full" /><Block className="h-4 w-5/6" /><Block className="mt-4 h-40 w-full" /></div>
				<div className="flex flex-col gap-4 rounded-xl border bg-card p-6"><Block className="h-6 w-2/3" /><Block className="h-4 w-full" /><Block className="h-4 w-4/5" /><Block className="h-10 w-full" /></div>
			</div>
		</LoadingRegion>
	</div></div></>;
}

export function DashboardPageSkeleton() {
	return <><NavbarSkeleton /><div className="min-h-screen bg-muted/20"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
		<LoadingRegion label="Caricamento del tuo profilo in corso"><Block className="h-9 w-56" /><Block className="mt-3 h-4 w-72" /><div className="mt-8 flex gap-3 overflow-hidden">{Array.from({length: 5}, (_, index) => <Block key={index} className="h-10 w-32 shrink-0" />)}</div><div className="mt-8 grid gap-6 lg:grid-cols-3"><div className="rounded-xl border bg-card p-6"><Block className="size-24 rounded-full" /><Block className="mt-5 h-6 w-2/3" /><Block className="mt-3 h-4 w-1/2" /></div><div className="rounded-xl border bg-card p-6 lg:col-span-2"><Block className="h-6 w-1/3" /><Block className="mt-6 h-4 w-full" /><Block className="mt-4 h-4 w-4/5" /><Block className="mt-8 h-32 w-full" /></div></div></LoadingRegion>
	</div></div></>;
}

export function FormPageSkeleton({kind}: {kind: "pubblicazione" | "accesso" | "registrazione" | "recupero"}) {
	const publishing = kind === "pubblicazione";
	return <>{publishing && <NavbarSkeleton minimal />}<div className="flex min-h-screen items-start justify-center bg-muted/20 px-4 py-10 sm:py-16"><LoadingRegion label={`Caricamento ${kind} in corso`} className={publishing ? "w-full max-w-4xl" : "w-full max-w-lg"}>
		<div className={publishing ? "w-full max-w-4xl" : "w-full max-w-lg"}><div className="mb-8 flex justify-center"><Block className="h-12 w-48" /></div><div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8"><Block className="h-8 w-3/5" /><Block className="mt-3 h-4 w-4/5" />{publishing && <div className="mt-8 flex gap-3">{Array.from({length: 4}, (_, index) => <Block key={index} className="h-10 w-24" />)}</div>}<div className="mt-8 flex flex-col gap-5"><Block className="h-5 w-1/3" /><Block className="h-11 w-full" /><Block className="h-5 w-1/3" /><Block className="h-11 w-full" /><Block className="mt-3 h-11 w-full" /></div></div></div>
	</LoadingRegion></div></>;
}

export function CompletionPageSkeleton({payment = false}: {payment?: boolean}) {
	return <><NavbarSkeleton minimal /><div className="min-h-screen bg-muted/20 px-4 py-12"><LoadingRegion label={payment ? "Caricamento pagamento in corso" : "Caricamento conferma in corso"}><div className="mx-auto max-w-3xl"><Block className="mx-auto size-14 rounded-full" /><Block className="mx-auto mt-5 h-9 w-2/3" /><Block className="mx-auto mt-3 h-5 w-1/2" /><div className="mt-8 rounded-xl border bg-card p-6"><Block className="h-6 w-1/2" /><Block className="mt-6 h-4 w-full" /><Block className="mt-4 h-4 w-4/5" /><Block className="mt-8 h-11 w-full" /></div></div></LoadingRegion></div></>;
}
