/* eslint-disable @next/next/no-img-element */
import Image from "next/image";

interface ArticleImageProps {
	src: string;
	alt: string;
	priority?: boolean;
	sizes: string;
	className?: string;
}

export default function ArticleImage({src, alt, priority = false, sizes, className}: ArticleImageProps) {
	if (/^https?:\/\//.test(src)) {
		return <img src={src} alt={alt} className={className} loading={priority ? "eager" : "lazy"} />;
	}

	return <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={className} />;
}
