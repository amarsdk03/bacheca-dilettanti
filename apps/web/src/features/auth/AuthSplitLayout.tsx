import type {ReactNode} from "react";
import Image from "next/image";
import Link from "next/link";

import GradientBackground from "@/components/styling/GradientBackground";
import {DEFAULT_BANNER_PATH} from "@/const/defaultConstants";
import {cn} from "@/lib/utils";

interface AuthSplitLayoutProps {
	children: ReactNode;
	variant?: "compact" | "wide";
}

export default function AuthSplitLayout({
	children,
	variant = "compact",
}: AuthSplitLayoutProps) {
	const wide = variant === "wide";

	return (
		<div
			className={cn(
				"grid min-h-0 flex-1 overflow-hidden",
				wide ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : "lg:grid-cols-2",
			)}
		>
			<GradientBackground
				className={cn(
					"flex min-h-0 min-w-0 flex-col gap-2 py-2",
					wide ? "px-4 sm:px-6 md:px-8 md:py-3" : "px-6 md:px-10 md:py-4",
				)}
			>
				<div className="relative flex shrink-0 justify-center md:justify-start">
					<Link
						href="/"
						aria-label="Bacheca Dilettanti, torna alla homepage"
						className="flex items-center gap-2 rounded-lg font-medium outline-none focus-visible:ring-3 focus-visible:ring-brand-indigo/40"
					>
						<Image
							src={DEFAULT_BANNER_PATH}
							alt="Logo Bacheca Dilettanti"
							width={200}
							height={100}
							draggable={false}
						/>
					</Link>
				</div>

				<div
					className={cn(
						"relative flex min-h-0 flex-1 overflow-y-auto overscroll-contain",
						wide ? "py-4" : "py-4 sm:py-8",
					)}
				>
					<div
						className={cn(
							"sm:mx-auto w-full",
							wide ? "max-w-2xl" : "my-10 2xl:my-auto max-w-xs",
						)}
					>
						{children}
					</div>
				</div>
			</GradientBackground>

			<div className="relative hidden min-h-0 overflow-hidden bg-muted lg:block">
				<Image
					src="/sfondi/homepage-hero.jpg"
					alt=""
					fill
					sizes={wide ? "40vw" : "50vw"}
					className="object-cover"
				/>
				<div
					aria-hidden="true"
					className="absolute inset-0 bg-linear-to-br from-brand-indigo/15 via-transparent to-brand-ink/20"
				/>
			</div>
		</div>
	);
}
