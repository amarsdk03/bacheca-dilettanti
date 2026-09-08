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
			delay={150}
			duration={1}
			ease="power3.out"
			splitType="words"
			from={{ opacity: 0, y: 40 }}
			to={{ opacity: 1, y: 0 }}
			threshold={0.1}
			rootMargin="-100px"
		/>
	)
}