"use client";

import {createContext, useContext, useTransition, type ComponentProps} from "react";
import {useRouter} from "next/navigation";
import {SearchIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {InputGroupButton} from "@/components/ui/input-group";
import {Spinner} from "@/components/ui/spinner";

const PendingContext = createContext(false);

export function DirectoryGetForm({action, children, ...props}: Omit<ComponentProps<"form">, "method"> & {action: string}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		if (event.defaultPrevented) return;
		event.preventDefault();
		const params = new URLSearchParams();
		for (const [name, value] of new FormData(event.currentTarget)) {
			if (typeof value === "string" && value) params.append(name, value);
		}
		const query = params.toString();
		startTransition(() => router.push(query ? `${action}?${query}` : action));
	}

	return <PendingContext.Provider value={pending}><form {...props} action={action} method="get" onSubmit={handleSubmit} aria-busy={pending}>{children}</form></PendingContext.Provider>;
}

export function DirectorySearchButton() {
	const pending = useContext(PendingContext);
	return <InputGroupButton type="submit" size="icon-sm" aria-label={pending ? "Ricerca in corso" : "Cerca"} disabled={pending}>{pending ? <Spinner aria-hidden="true" /> : <SearchIcon aria-hidden="true" />}</InputGroupButton>;
}

export function DirectoryFilterSubmitButton() {
	const pending = useContext(PendingContext);
	return <Button type="submit" className="flex-1" disabled={pending} aria-busy={pending}>{pending && <Spinner data-icon="inline-start" aria-hidden="true" />}{pending ? "Applicazione in corso…" : "Applica filtri"}</Button>;
}
