"use client";

import type {ComponentProps} from "react";
import {ArrowLeftIcon} from "lucide-react";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";

interface ProfileHistoryBackButtonProps extends Pick<
	ComponentProps<typeof Button>,
	"className" | "size" | "variant"
> {
	label?: string;
}

export default function ProfileHistoryBackButton({
	className,
	label = "Indietro",
	size,
	variant = "ghost",
}: ProfileHistoryBackButtonProps) {
	const router = useRouter();

	function goBack() {
		if (window.history.length > 1) {
			router.back();
			return;
		}

		router.replace("/profili");
	}

	return (
		<Button
			type="button"
			className={className}
			size={size}
			variant={variant}
			onClick={goBack}
		>
			<ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
			{label}
		</Button>
	);
}
