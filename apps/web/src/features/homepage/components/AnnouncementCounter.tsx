"use client";

import {useEffect, useRef} from "react";
import {animate, motion, useInView, useMotionValue, useReducedMotion, useTransform} from "motion/react";

const formatter = new Intl.NumberFormat("it-IT", {useGrouping: "always"});

export default function AnnouncementCounter({value}: {value: number}) {
	const ref = useRef<HTMLSpanElement>(null);
	const inView = useInView(ref, {once: true, amount: 0.5});
	const reducedMotion = useReducedMotion();
	const count = useMotionValue(value);
	const formatted = useTransform(() => formatter.format(Math.round(count.get())));

	useEffect(() => {
		if (!inView || reducedMotion !== false) return;
		const controls = animate(count, [0, value], {duration: 1.1, ease: "easeOut"});
		return () => controls.stop();
	}, [count, inView, reducedMotion, value]);

	return <span ref={ref}>
		<span className="sr-only">{formatter.format(value)}</span>
		<motion.span aria-hidden="true">{formatted}</motion.span>
	</span>;
}
