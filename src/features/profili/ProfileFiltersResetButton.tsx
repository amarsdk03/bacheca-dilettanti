"use client";

import {useTransition} from "react";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";
import {SheetClose} from "@/components/ui/sheet";
import {Spinner} from "@/components/ui/spinner";

export default function ProfileFiltersResetButton({href}: {href: string}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	return (
		<SheetClose
			render={(
				<Button
					type="button"
					variant="outline"
					disabled={pending}
					aria-busy={pending}
					onClick={() => startTransition(() => router.push(href))}
				/>
			)}
		>
			{pending && <Spinner data-icon="inline-start" aria-hidden="true" />}Azzera
		</SheetClose>
	);
}
