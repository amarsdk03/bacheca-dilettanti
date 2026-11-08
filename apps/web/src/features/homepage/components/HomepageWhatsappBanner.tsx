"use client";

import {useState, useSyncExternalStore} from "react";
import {createPortal} from "react-dom";
import {AnimatePresence, motion, MotionConfig} from "motion/react";
import {ExternalLink, XIcon} from "lucide-react";
import {SiWhatsapp} from "@icons-pack/react-simple-icons";
import {Button} from "@/components/ui/button";

const subscribe = () => () => {};
const mountedSnapshot = () => true;
const serverSnapshot = () => false;

export default function HomepageWhatsappBanner() {
	const mounted = useSyncExternalStore(subscribe, mountedSnapshot, serverSnapshot);
	const [visible, setVisible] = useState(true);
	if (!mounted) return null;

	return createPortal(<MotionConfig reducedMotion="user">
		<div className="font-home-body pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+2.5rem)] z-100 px-6 sm:px-8">
			<AnimatePresence>
				{visible && <motion.section key="whatsapp-banner" aria-labelledby="banner-whatsapp-title"
					className="pointer-events-auto relative mx-auto w-full max-w-5xl"
					initial={{y: "-150%", opacity: 0}}
					animate={{y: "0%", opacity: 1}}
					exit={{opacity: 0, transition: {duration: 0.22, ease: "easeOut"}}}
					transition={{y: {duration: 0.95, ease: [0.16, 1, 0.3, 1]}, opacity: {duration: 0.3}}}>
					<a href="https://www.whatsapp.com/channel/0029Vb8lng43AzNSP0YlRL3V" target="_blank" rel="noopener noreferrer"
						className="group flex flex-col items-start justify-between gap-4 rounded-2xl border border-green-300 bg-green-50 p-5 shadow-lg outline-none transition-colors hover:border-green-400 focus-visible:ring-3 focus-visible:ring-green-700 focus-visible:ring-offset-2 md:flex-row md:items-center">
						<div className="flex items-start gap-4">
							<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700"><SiWhatsapp size={22} title="WhatsApp" /></span>
							<div className="min-w-0">
								<h2 id="banner-whatsapp-title" className="text-lg font-semibold text-neutral-950 md:text-xl">Non perderti nessun annuncio.</h2>
								<p className="text-base text-neutral-600 md:text-lg"><span className="font-medium">Segui il canale WhatsApp:</span> ricevere i nuovi annunci è semplice e immediato.</p>
							</div>
						</div>
						<span className="inline-flex shrink-0 items-center gap-2 text-base font-medium text-green-700 group-hover:text-green-800">Vai al canale<ExternalLink className="size-5" aria-hidden="true" /></span>
					</a>
					<Button type="button" variant="outline" size="icon" aria-label="Chiudi banner WhatsApp"
						className="absolute -right-3 -top-4 size-10 rounded-full border-green-300 bg-white text-neutral-700 shadow-sm hover:bg-green-100 hover:text-neutral-950"
						onClick={() => setVisible(false)}><XIcon className="size-5" aria-hidden="true" /></Button>
				</motion.section>}
			</AnimatePresence>
		</div>
	</MotionConfig>, document.body);
}
