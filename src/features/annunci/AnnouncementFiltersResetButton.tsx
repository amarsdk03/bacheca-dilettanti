"use client";

import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";
import {SheetClose} from "@/components/ui/sheet";

export default function AnnouncementFiltersResetButton({href}: {href: string}) {
	const router = useRouter();

	return (
		<SheetClose
			render={(
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push(href)}
				/>
			)}
		>
			Azzera
		</SheetClose>
	);
}
