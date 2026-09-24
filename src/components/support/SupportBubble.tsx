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
import {SiWhatsapp} from "@icons-pack/react-simple-icons";

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
		return () => {
			document.documentElement.style.removeProperty("--support-bubble-space");
		};
	}, []);

	return (
		<motion.aside
			ref={containerRef}
			aria-label="Assistenza WhatsApp"
			className="fixed z-40"
			style={{
				right: "max(max(1rem, 2vw), env(safe-area-inset-right))",
				bottom: "max(max(1rem, 2vw), env(safe-area-inset-bottom))",
			}}
			initial={{opacity: 0, y: reduceMotion ? 0 : 8}}
			animate={{opacity: 1, y: 0}}
			exit={{opacity: 0, y: reduceMotion ? 0 : 8}}
			transition={{duration: reduceMotion ? 0 : 0.16}}
		>
			<motion.div
				layout
				className="relative bg-lime-300 text-black shadow-lg ring-1 ring-lime-500 transition-colors duration-300 hover:bg-lime-400 hover:shadow-xl motion-reduce:transition-none"
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
						className="p-5 pr-7 font-semibold text-sm leading-6"
						initial={{opacity: 0}}
						animate={{opacity: 1}}
						transition={{duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : 0.3}}
					>
						<span>
							Qualcosa non funziona o hai bisogno di aiuto?{" "}
							<a
								ref={linkRef}
								href={WHATSAPP_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center translate-y-0.5 gap-1 rounded-sm text-green-900 underline underline-offset-4 outline-none transition-hover duration-200 hover:underline-offset-5 hover:decoration-[1.5px] focus-visible:ring-2 focus-visible:ring-ring"
							>
								<SiWhatsapp className="size-3.5 shrink-0 ms-0.5" aria-hidden="true" /> Contattaci pure su Whatsapp!
								<span className="sr-only"> (si apre in una nuova scheda)</span>
							</a>
						</span>
						<motion.div layout="position" className="absolute -right-2 -top-2" transition={{duration: reduceMotion ? 0 : 0.3}}>
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								className="text-neutral-500 border-green-800 rounded-full shadow-sm"
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
						className="size-14 rounded-full bg-lime-500 text-white shadow-sm hover:bg-green-500 hover:text-white"
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
