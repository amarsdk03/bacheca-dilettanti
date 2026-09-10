'use client';

import SplitText from "@/components/SplitText";

interface HomepageTitleProps {
	title: string;
	className?: string;
}

export default function HomepageTitle({title, className} : HomepageTitleProps) {
	return (
		<SplitText
			text={title}
			className={className}
			textAlign="start"
			tag="h1"
			delay={100}
			duration={1.5}
			ease="power3.out"
			splitType="words"
			from={{ opacity: 0, y: 50 }}
			to={{ opacity: 1, y: 0 }}
			threshold={0.1}
			rootMargin="-100px"
		/>
	)
}