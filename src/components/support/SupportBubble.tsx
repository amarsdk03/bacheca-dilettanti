"use client";

import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {usePathname} from "next/navigation";
import {AnimatePresence, motion, useReducedMotion} from "motion/react";
import {MessageCircleQuestionMark, XIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {WHATSAPP_URL} from "@/const/contactConstants";
import {
	dismissSupportBubble,
	getSupportBubbleServerSnapshot,
	getSupportBubbleSnapshot,
	subscribeToSupportBubble,
} from "@/components/support/support-bubble-store";

function Bubble() {
	const [expanded, setExpanded] = useState(false);
	const reduceMotion = useReducedMotion();
	const containerRef = useRef<HTMLElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const linkRef = useRef<HTMLAnchorElement>(null);
	const focusLink = useRef(false);
	const restoreFocus = useRef(false);

	useEffect(() => {
		if (expanded && focusLink.current) {
			linkRef.current?.focus({preventScroll: true});
			focusLink.current = false;
		} else if (!expanded && restoreFocus.current) {
			triggerRef.current?.focus({preventScroll: true});
			restoreFocus.current = false;
		}
	}, [expanded]);

	useEffect(() => {
		if (!expanded) return;
		function onPointerDown(event: PointerEvent) {
			if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
				setExpanded(false);
			}
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.target instanceof Element && event.target.closest('[role="dialog"], [role="alertdialog"]')) return;
			if (event.key === "Escape" && !event.defaultPrevented) {
				restoreFocus.current = Boolean(containerRef.current?.contains(document.activeElement));
				setExpanded(false);
				event.preventDefault();
			}
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [expanded]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const reserveToastSpace = () => {
			// Include a gap above the close button, which protrudes from the bubble.
			document.documentElement.style.setProperty("--support-bubble-space", `${container.offsetHeight + 24}px`);
		};
		const observer = new ResizeObserver(reserveToastSpace);
		observer.observe(container);
		reserveToastSpace();
		return () => {
			observer.disconnect();
			document.documentElement.style.removeProperty("--support-bubble-space");
		};
	}, []);

	return (
		<motion.aside
			ref={containerRef}
			aria-label="Assistenza WhatsApp"
			className="fixed z-45"
			style={{
				right: "max(2rem, env(safe-area-inset-right))",
				bottom: "max(2rem, env(safe-area-inset-bottom))",
			}}
			initial={{opacity: 0, y: reduceMotion ? 0 : 8}}
			animate={{opacity: 1, y: 0}}
			exit={{opacity: 0, y: reduceMotion ? 0 : 8}}
			transition={{duration: reduceMotion ? 0 : 0.16}}
		>
			<motion.div
				layout
				className="relative bg-white/80 text-card-foreground shadow-lg ring-1 ring-border transition-shadow duration-200 hover:shadow-xl motion-reduce:transition-none"
				style={{
					width: expanded ? 320 : 56,
					maxWidth: "calc(100vw - 2rem - env(safe-area-inset-left) - env(safe-area-inset-right))",
					borderRadius: expanded ? 20 : 28,
				}}
				transition={{layout: {duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1]}}}
				whileHover={expanded || reduceMotion ? undefined : {scale: 1.04, y: -2}}
			>
				{expanded ? (
					<motion.div
						id="support-bubble-content"
						className="p-5 pr-7 text-sm leading-6"
						initial={{opacity: 0}}
						animate={{opacity: 1}}
						transition={{duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : 0.3}}
					>
						<p>
							Qualcosa non funziona o hai bisogno di aiuto?{" "}
							<a
								ref={linkRef}
								href={WHATSAPP_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="rounded-sm font-semibold text-primary underline underline-offset-4 outline-none transition-hover duration-200 hover:underline-offset-5 hover:decoration-[1.5px] focus-visible:ring-2 focus-visible:ring-ring"
							>
								Contattaci pure su Whatsapp!
								<span className="sr-only"> (si apre in una nuova scheda)</span>
							</a>
						</p>
						<motion.div layout="position" className="absolute -right-2 -top-2" transition={{duration: reduceMotion ? 0 : 0.3}}>
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								className="rounded-full shadow-sm"
								aria-label="Nascondi il pulsante di assistenza"
								onClick={dismissSupportBubble}
							>
								<XIcon aria-hidden="true" />
							</Button>
						</motion.div>
					</motion.div>
				) : (
					<Button
						ref={triggerRef}
						type="button"
						variant="ghost"
						className="size-14 rounded-full"
						aria-label="Hai bisogno di aiuto?"
						aria-expanded={false}
						aria-controls="support-bubble-content"
						onClick={(event) => {
							focusLink.current = event.detail === 0;
							setExpanded(true);
						}}
					>
						<MessageCircleQuestionMark className="size-6" aria-hidden="true" />
					</Button>
				)}
			</motion.div>
		</motion.aside>
	);
}

export default function SupportBubble() {
	const pathname = usePathname();
	const dismissedUntil = useSyncExternalStore(
		subscribeToSupportBubble,
		getSupportBubbleSnapshot,
		getSupportBubbleServerSnapshot,
	);
	if (pathname === "/accedi" || pathname === "/registrati") return null;

	// Remount on navigation so an expanded bubble always returns to its circle.
	return <AnimatePresence key={pathname}>{dismissedUntil === 0 && <Bubble key="support" />}</AnimatePresence>;
}
